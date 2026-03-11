import { createClient } from '@/lib/supabase/server'
import { Users, Mail, Phone, Building, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

type PipelineStage = 'new_lead' | 'contacted' | 'quote_sent' | 'measurement_scheduled' | 'installation_scheduled' | 'completed' | 'lost'

const STAGE_LABELS: Record<PipelineStage, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  quote_sent: 'Quote Sent',
  measurement_scheduled: 'Measurement Scheduled',
  installation_scheduled: 'Installation Scheduled',
  completed: 'Completed',
  lost: 'Lost'
}

const STAGE_COLORS: Record<PipelineStage, string> = {
  new_lead: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  contacted: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  quote_sent: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  measurement_scheduled: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
  installation_scheduled: 'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400',
  completed: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  lost: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
}

async function getLeads(companyId: string) {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  return leads || []
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: memberData } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (!memberData) {
    return null
  }

  const leads = await getLeads(memberData.company_id)

  const totalValue = leads.reduce((sum, lead) => sum + Number(lead.lead_value || 0), 0)
  const activeLeads = leads.filter(l => l.pipeline_stage !== 'completed' && l.pipeline_stage !== 'lost')

  interface LeadData {
    id: string
    name: string
    company_name: string
    email: string
    phone: string
    address: string
    pipeline_stage: PipelineStage
    lead_value: number
    created_at: string
  }

  const leadsByStage = leads.reduce((acc, lead) => {
    const stage = lead.pipeline_stage as PipelineStage
    if (!acc[stage]) acc[stage] = []
    acc[stage].push(lead)
    return acc
  }, {} as Record<PipelineStage, LeadData[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Leads</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage and track your sales leads
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{leads.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Leads</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                ${totalValue.toLocaleString()}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Value</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{activeLeads.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Active Leads</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pipeline Overview</h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {Object.entries(STAGE_LABELS).map(([stage, label]) => {
              const stageLeads = leadsByStage[stage as PipelineStage] || []
              return (
                <div key={stage} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {stageLeads.slice(0, 3).map((lead: LeadData) => (
                      <Link
                        key={lead.id}
                        href={`/dashboard/leads/${lead.id}`}
                        className={`block p-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors`}
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {lead.name}
                        </p>
                        {lead.lead_value && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            ${Number(lead.lead_value).toLocaleString()}
                          </p>
                        )}
                      </Link>
                    ))}
                    {stageLeads.length > 3 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        +{stageLeads.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">All Leads</h2>
        </div>

        {leads.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/dashboard/leads/${lead.id}`}
                className="block p-6 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {lead.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Added {format(new Date(lead.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="ml-11 space-y-2">
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        {lead.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {lead.email}
                          </div>
                        )}
                        {lead.company_name && (
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {lead.company_name}
                          </div>
                        )}
                      </div>

                      {lead.lead_value && Number(lead.lead_value) > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Value:</span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${Number(lead.lead_value).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    STAGE_COLORS[lead.pipeline_stage as PipelineStage]
                  }`}>
                    {STAGE_LABELS[lead.pipeline_stage as PipelineStage]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No leads yet</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Start tracking leads to see them here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
