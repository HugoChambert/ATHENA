import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

interface ProcessRequest {
  callId: string
  recordingUrl: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const { callId, recordingUrl }: ProcessRequest = await req.json()

    if (!callId || !recordingUrl) {
      return new Response(
        JSON.stringify({ error: "Missing callId or recordingUrl" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const transcribeUrl = `${supabaseUrl}/functions/v1/transcribe-call`
    const analyzeUrl = `${supabaseUrl}/functions/v1/analyze-call`

    const transcribeResponse = await fetch(transcribeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ callId, recordingUrl }),
    })

    if (!transcribeResponse.ok) {
      throw new Error("Transcription failed")
    }

    const { transcript } = await transcribeResponse.json()

    const analyzeResponse = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ callId, transcript }),
    })

    if (!analyzeResponse.ok) {
      throw new Error("Analysis failed")
    }

    const { leadData } = await analyzeResponse.json()

    const { error: updateError } = await supabase
      .from("calls")
      .update({
        transcript,
        summary: leadData.summary,
        sentiment: leadData.sentiment,
        ai_name: leadData.name,
        ai_email: leadData.email,
        ai_address: leadData.address,
        ai_project_type: leadData.project_type,
        ai_materials: leadData.materials,
        ai_timeline: leadData.timeline,
        ai_budget: leadData.budget,
        ai_processed: true,
        ai_processed_at: new Date().toISOString(),
      })
      .eq("id", callId)

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    const { data: callData } = await supabase
      .from("calls")
      .select("company_id, user_id, caller_phone")
      .eq("id", callId)
      .single()

    if (callData && leadData.name) {
      await supabase.from("leads").insert({
        company_id: callData.company_id,
        user_id: callData.user_id,
        call_id: callId,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone || callData.caller_phone,
        company: leadData.address,
        source: "Phone Call",
        status: "new",
        notes: `${leadData.summary}\n\nProject: ${leadData.project_type || "N/A"}\nMaterials: ${leadData.materials || "N/A"}\nTimeline: ${leadData.timeline || "N/A"}\nBudget: ${leadData.budget || "N/A"}`,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        callId,
        transcript,
        leadData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Processing error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
