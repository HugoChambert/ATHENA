import { createClient } from '@/lib/supabase/client'

export interface Subscription {
  id: string
  user_id: string
  company_id: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
  created_at: string
  updated_at: string
}

export async function getUserSubscription(): Promise<Subscription | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null

  return data as Subscription
}

export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false
  return subscription.status === 'active' || subscription.status === 'trialing'
}

export function hasValidSubscription(subscription: Subscription | null): boolean {
  if (!subscription) return false
  const validStatuses = ['active', 'trialing', 'past_due']
  return validStatuses.includes(subscription.status)
}
