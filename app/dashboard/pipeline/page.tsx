import { createClient } from '@/lib/supabase/server'
import { Workflow } from 'lucide-react'

async function getPipelineData(userId: string) {
  const supabase = await createClient()

  const [stagesResult, leadsResult] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('*')
      .eq('user_id', userId)
      .order('order_num', { ascending: true }),
    supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
  ])

  const stages = stagesResult.data || []
  const leads = leadsResult.data || []

  if (stages.length === 0) {
    const defaultStages = [
      { name: 'New', status: 'new', order: 0, color: '#3b82f6' },
      { name: 'Contacted', status: 'contacted', order: 1, color: '#f59e0b' },
      { name: 'Qualified', status: 'qualified', order: 2, color: '#8b5cf6' },
      { name: 'Proposal', status: 'proposal', order: 3, color: '#06b6d4' },
      { name: 'Won', status: 'won', order: 4, color: '#10b981' },
      { name: 'Lost', status: 'lost', order: 5, color: '#ef4444' },
    ]

    return {
      stages: defaultStages,
      leadsByStage: defaultStages.map(stage => ({
        ...stage,
        leads: leads.filter(lead => lead.status === stage.status)
      }))
    }
  }

  return {
    stages,
    leadsByStage: stages.map(stage => ({
      ...stage,
      leads: leads.filter(lead => lead.status === stage.name.toLowerCase())
    }))
  }
}

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { leadsByStage } = await getPipelineData(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pipeline</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Visualize your sales pipeline and track deal progress
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {leadsByStage.map((stage) => (
          <div
            key={stage.name}
            className="flex-shrink-0 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {stage.name}
                  </h3>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {stage.leads?.length || 0}
                </span>
              </div>
            </div>

            <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
              {stage.leads && stage.leads.length > 0 ? (
                stage.leads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                      {lead.name}
                    </h4>
                    {lead.company && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {lead.company}
                      </p>
                    )}
                    {lead.value && Number(lead.value) > 0 && (
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        ${Number(lead.value).toLocaleString()}
                      </div>
                    )}
                    {lead.phone && (
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                        {lead.phone}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 dark:text-slate-600">
                  <p className="text-sm">No leads</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {leadsByStage.every(stage => !stage.leads || stage.leads.length === 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12">
          <div className="text-center">
            <Workflow className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No leads in pipeline</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Add leads to see them organized in your sales pipeline
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
