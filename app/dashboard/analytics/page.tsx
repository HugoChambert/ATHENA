import { createClient } from '@/lib/supabase/server'
import { ChartBar as BarChart3, TrendingUp, Phone, Users, DollarSign, Target } from 'lucide-react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns'

async function getAnalytics(userId: string) {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [callsResult, leadsResult] = await Promise.all([
    supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .gte('call_date', monthStart.toISOString())
      .lte('call_date', monthEnd.toISOString()),
    supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
  ])

  const calls = callsResult.data || []
  const leads = leadsResult.data || []

  const callsByStatus = {
    answered: calls.filter(c => c.status === 'answered').length,
    missed: calls.filter(c => c.status === 'missed').length,
    voicemail: calls.filter(c => c.status === 'voicemail').length,
  }

  const leadsByStatus = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    proposal: leads.filter(l => l.status === 'proposal').length,
    won: leads.filter(l => l.status === 'won').length,
    lost: leads.filter(l => l.status === 'lost').length,
  }

  const totalRevenue = leads
    .filter(l => l.status === 'won')
    .reduce((sum, l) => sum + Number(l.value || 0), 0)

  const pipelineValue = leads
    .filter(l => ['qualified', 'proposal'].includes(l.status))
    .reduce((sum, l) => sum + Number(l.value || 0), 0)

  const conversionRate = calls.length > 0 ? ((leads.length / calls.length) * 100).toFixed(1) : '0'
  const winRate = leads.length > 0 ? ((leadsByStatus.won / leads.length) * 100).toFixed(1) : '0'

  const callsBySentiment = {
    positive: calls.filter(c => c.sentiment === 'positive').length,
    neutral: calls.filter(c => c.sentiment === 'neutral').length,
    negative: calls.filter(c => c.sentiment === 'negative').length,
  }

  return {
    callsByStatus,
    leadsByStatus,
    totalRevenue,
    pipelineValue,
    conversionRate,
    winRate,
    callsBySentiment,
    totalCalls: calls.length,
    totalLeads: leads.length,
  }
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const analytics = await getAnalytics(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Insights and performance metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            ${analytics.totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Pipeline Value</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            ${analytics.pipelineValue.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Conversion Rate</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {analytics.conversionRate}%
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Win Rate</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {analytics.winRate}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Calls by Status</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Answered</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {analytics.callsByStatus.answered}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${analytics.totalCalls > 0 ? (analytics.callsByStatus.answered / analytics.totalCalls) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Missed</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {analytics.callsByStatus.missed}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${analytics.totalCalls > 0 ? (analytics.callsByStatus.missed / analytics.totalCalls) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Voicemail</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {analytics.callsByStatus.voicemail}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${analytics.totalCalls > 0 ? (analytics.callsByStatus.voicemail / analytics.totalCalls) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Call Sentiment</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Positive</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {analytics.callsBySentiment.positive}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${analytics.totalCalls > 0 ? (analytics.callsBySentiment.positive / analytics.totalCalls) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Neutral</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {analytics.callsBySentiment.neutral}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-500"
                  style={{
                    width: `${analytics.totalCalls > 0 ? (analytics.callsBySentiment.neutral / analytics.totalCalls) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Negative</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {analytics.callsBySentiment.negative}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${analytics.totalCalls > 0 ? (analytics.callsBySentiment.negative / analytics.totalCalls) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Lead Funnel</h3>
        <div className="space-y-3">
          {[
            { label: 'New', count: analytics.leadsByStatus.new, color: 'bg-blue-500' },
            { label: 'Contacted', count: analytics.leadsByStatus.contacted, color: 'bg-amber-500' },
            { label: 'Qualified', count: analytics.leadsByStatus.qualified, color: 'bg-purple-500' },
            { label: 'Proposal', count: analytics.leadsByStatus.proposal, color: 'bg-cyan-500' },
            { label: 'Won', count: analytics.leadsByStatus.won, color: 'bg-green-500' },
            { label: 'Lost', count: analytics.leadsByStatus.lost, color: 'bg-red-500' },
          ].map((stage) => (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">{stage.label}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {stage.count}
                </span>
              </div>
              <div className="h-8 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                <div
                  className={`h-full ${stage.color} flex items-center justify-end px-4`}
                  style={{
                    width: `${analytics.totalLeads > 0 ? (stage.count / analytics.totalLeads) * 100 : 0}%`,
                    minWidth: stage.count > 0 ? '40px' : '0'
                  }}
                >
                  <span className="text-xs font-medium text-white">
                    {analytics.totalLeads > 0 ? ((stage.count / analytics.totalLeads) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
