import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey || !webhookSecret) {
      throw new Error("Stripe configuration missing");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature provided");
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;
        const userId = session.metadata?.supabase_user_id;

        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await supabase
          .from("subscriptions")
          .update({
            stripe_subscription_id: subscriptionId,
            stripe_price_id: subscription.items.data[0].price.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("user_id", userId)
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subscription.id);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
          })
          .eq("stripe_subscription_id", subscription.id);

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (subscription) {
          await supabase.from("payment_history").insert({
            subscription_id: subscription.id,
            stripe_payment_intent_id: invoice.payment_intent as string,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: "succeeded",
          });
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (subscription) {
          await supabase.from("payment_history").insert({
            subscription_id: subscription.id,
            stripe_payment_intent_id: invoice.payment_intent as string,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: "failed",
          });

          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("id", subscription.id);
        }

        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
