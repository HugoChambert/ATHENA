import { createClient } from '@/lib/supabase/server'
import { Phone, Clock, Calendar, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

async function getCalls(userId: string) {
  const supabase = await createClient()

  const { data: calls } = await supabase
    .from('calls')
    .select('*')
    .eq('user_id', userId)
    .order('call_date', { ascending: false })

  return calls || []
}

export default async function CallsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const calls = await getCalls(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Calls</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Track and manage all your incoming calls
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{calls.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Calls</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {calls.filter(c => c.status === 'answered').length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Answered</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {calls.length > 0 ? Math.floor(calls.reduce((acc, c) => acc + (c.duration || 0), 0) / calls.length / 60) : 0}m
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Avg Duration</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Call History</h2>
        </div>

        {calls.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {calls.map((call) => (
              <div key={call.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {call.caller_name || 'Unknown Caller'}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{call.caller_phone}</p>
                      </div>
                    </div>

                    <div className="ml-11 space-y-2">
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(call.call_date), 'MMM d, yyyy h:mm a')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {Math.floor(call.duration / 60)}m {call.duration % 60}s
                        </div>
                      </div>

                      {call.summary && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                          {call.summary}
                        </p>
                      )}

                      {call.sentiment && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Sentiment:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            call.sentiment === 'positive' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                            call.sentiment === 'negative' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {call.sentiment}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    call.status === 'answered' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    call.status === 'missed' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                    'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  }`}>
                    {call.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Phone className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No calls yet</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Your call history will appear here once you start receiving calls
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
