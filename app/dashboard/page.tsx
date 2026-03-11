import { createClient } from '@/lib/supabase/server'
import { Phone, Users, TrendingUp, Calendar, PhoneIncoming, PhoneMissed, Clock, DollarSign } from 'lucide-react'

async function getDashboardStats(companyId: string) {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [callsTodayResult, callsResult, leadsResult, appointmentsResult] = await Promise.all([
    supabase
      .from('calls')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .gte('call_date', today.toISOString()),
    supabase
      .from('calls')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .gte('call_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId),
    supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('status', 'scheduled')
      .gte('start_time', new Date().toISOString()),
  ])

  const callsToday = callsTodayResult.count || 0
  const totalCalls = callsResult.count || 0
  const totalLeads = leadsResult.count || 0
  const upcomingAppointments = appointmentsResult.count || 0

  const missedCallsToday = callsTodayResult.data?.filter(c => c.status === 'missed').length || 0
  const answeredCalls = callsResult.data?.filter(c => c.status === 'answered').length || 0
  const missedCalls = callsResult.data?.filter(c => c.status === 'missed').length || 0
  const avgDuration = callsResult.data && callsResult.data.length > 0
    ? Math.round(callsResult.data.reduce((acc, c) => acc + (c.duration || 0), 0) / callsResult.data.length)
    : 0

  const newLeads = leadsResult.data?.filter(l => l.status === 'new').length || 0
  const qualifiedLeads = leadsResult.data?.filter(l => l.status === 'qualified' || l.status === 'proposal').length || 0
  const conversionRate = totalCalls > 0 ? Math.round((totalLeads / totalCalls) * 100) : 0

  const pipelineValue = leadsResult.data
    ?.filter(l => ['qualified', 'proposal'].includes(l.status))
    .reduce((sum, l) => sum + Number(l.value || 0), 0) || 0

  return {
    callsToday,
    missedCallsToday,
    newLeads,
    pipelineValue,
    totalCalls,
    totalLeads,
    upcomingAppointments,
    answeredCalls,
    missedCalls,
    avgDuration,
    qualifiedLeads,
    conversionRate,
    recentCalls: callsResult.data?.slice(0, 5) || [],
    recentLeads: leadsResult.data?.slice(0, 5) || [],
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return null
  }

  const stats = await getDashboardStats(profile.company_id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Overview of your call tracking and lead intelligence
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Calls Today"
          value={stats.callsToday}
          icon={Phone}
          subtitle="Incoming calls"
        />
        <StatCard
          title="New Leads"
          value={stats.newLeads}
          icon={Users}
          subtitle="This month"
        />
        <StatCard
          title="Missed Calls"
          value={stats.missedCallsToday}
          icon={PhoneMissed}
          subtitle="Today"
        />
        <StatCard
          title="Revenue Pipeline"
          value={`$${stats.pipelineValue.toLocaleString()}`}
          icon={DollarSign}
          subtitle="Qualified leads"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <PhoneIncoming className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.answeredCalls}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Answered Calls</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <PhoneMissed className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.missedCalls}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Missed Calls</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{Math.floor(stats.avgDuration / 60)}:{(stats.avgDuration % 60).toString().padStart(2, '0')}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Avg Call Duration</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Calls</h3>
          {stats.recentCalls.length > 0 ? (
            <div className="space-y-3">
              {stats.recentCalls.map((call: any) => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{call.caller_name || call.caller_phone}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(call.call_date).toLocaleDateString()} • {Math.floor(call.duration / 60)}m {call.duration % 60}s
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    call.status === 'answered' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    call.status === 'missed' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {call.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              No recent calls
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Leads</h3>
          {stats.recentLeads.length > 0 ? (
            <div className="space-y-3">
              {stats.recentLeads.map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{lead.name}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{lead.phone || lead.email}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    lead.status === 'qualified' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    lead.status === 'new' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              No leads yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string
  value: string | number
  icon: any
  subtitle?: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-900 dark:text-white">{title}</div>
      {subtitle && (
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{subtitle}</div>
      )}
    </div>
  )
}
