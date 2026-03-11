import { createClient } from '@/lib/supabase/server'
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'

async function getAppointments(userId: string) {
  const supabase = await createClient()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, leads(name)')
    .eq('user_id', userId)
    .order('start_time', { ascending: true })

  return appointments || []
}

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const appointments = await getAppointments(user.id)
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const upcomingAppointments = appointments.filter(
    apt => new Date(apt.start_time) >= now && apt.status === 'scheduled'
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Calendar</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage your appointments and schedule
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {format(now, 'MMMM yyyy')}
            </h2>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-slate-600 dark:text-slate-400 py-2">
                {day}
              </div>
            ))}

            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {days.map((day) => {
              const dayAppointments = appointments.filter(apt =>
                isSameDay(new Date(apt.start_time), day)
              )

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    aspect-square p-2 rounded-lg border transition-colors cursor-pointer
                    ${isToday(day)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }
                    ${!isSameMonth(day, now) && 'opacity-40'}
                  `}
                >
                  <div className={`text-sm font-medium ${
                    isToday(day)
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-900 dark:text-white'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {dayAppointments.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {dayAppointments.slice(0, 2).map((apt) => (
                        <div
                          key={apt.id}
                          className="w-full h-1 rounded-full bg-blue-500 dark:bg-blue-400"
                        />
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          +{dayAppointments.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Upcoming Appointments
          </h3>

          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.slice(0, 5).map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
                >
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                    {apt.title}
                  </h4>
                  {apt.leads && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {apt.leads.name}
                    </p>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <CalendarIcon className="h-4 w-4" />
                      {format(new Date(apt.start_time), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Clock className="h-4 w-4" />
                      {format(new Date(apt.start_time), 'h:mm a')} - {format(new Date(apt.end_time), 'h:mm a')}
                    </div>
                    {apt.location && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="h-4 w-4" />
                        {apt.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No upcoming appointments
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">All Appointments</h2>
        </div>

        {appointments.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {appointments.map((apt) => (
              <div key={apt.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                      {apt.title}
                    </h3>
                    {apt.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        {apt.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {format(new Date(apt.start_time), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(apt.start_time), 'h:mm a')} - {format(new Date(apt.end_time), 'h:mm a')}
                      </div>
                      {apt.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {apt.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                    apt.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <CalendarIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No appointments</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Your scheduled appointments will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
