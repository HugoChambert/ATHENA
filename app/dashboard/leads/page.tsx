import { createClient } from '@/lib/supabase/server'
import { Users, Mail, Phone, Building, DollarSign } from 'lucide-react'
import { format } from 'date-fns'

async function getLeads(userId: string) {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return leads || []
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const leads = await getLeads(user.id)

  const totalValue = leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0)
  const qualifiedLeads = leads.filter(l => l.status === 'qualified' || l.status === 'proposal')

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
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{qualifiedLeads.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Qualified</div>
            </div>
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
              <div key={lead.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
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
                        {lead.company && (
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {lead.company}
                          </div>
                        )}
                      </div>

                      {lead.notes && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                          {lead.notes}
                        </p>
                      )}

                      {lead.value && Number(lead.value) > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Value:</span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${Number(lead.value).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {lead.source && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Source:</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {lead.source}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    lead.status === 'won' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    lead.status === 'lost' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                    lead.status === 'qualified' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                    lead.status === 'proposal' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' :
                    lead.status === 'contacted' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              </div>
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
