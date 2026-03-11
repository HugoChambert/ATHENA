'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Building, Phone, Mail, Key, Users as UsersIcon } from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [role, setRole] = useState<string>('')
  const [twilioPhone, setTwilioPhone] = useState('')
  const [twilioSid, setTwilioSid] = useState('')
  const [twilioToken, setTwilioToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    if (profileData?.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profileData.company_id)
        .single()

      setCompany(companyData)
      setTwilioPhone(companyData?.twilio_phone_number || '')
      setTwilioSid(companyData?.twilio_account_sid || '')

      const { data: memberData } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', profileData.company_id)
        .single()

      setRole(memberData?.role || '')
    }
  }

  const handleSaveTwilio = async () => {
    if (!company || !['owner', 'admin'].includes(role)) {
      setMessage('Only owners and admins can update Twilio settings')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          twilio_phone_number: twilioPhone,
          twilio_account_sid: twilioSid,
          twilio_auth_token: twilioToken || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id)

      if (error) {
        setMessage('Failed to save Twilio settings')
      } else {
        setMessage('Twilio settings saved successfully')
        await loadData()
      }
    } catch (err) {
      setMessage('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage your account, company, and integrations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profile Information</h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Full Name
                  </label>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <User className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-900 dark:text-white">
                      {profile?.full_name || 'Not set'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email
                  </label>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-900 dark:text-white">
                      {profile?.email}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Company
                  </label>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <Building className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-900 dark:text-white">
                      {company?.name || 'Not set'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Role
                  </label>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <UsersIcon className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-900 dark:text-white capitalize">
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Twilio Integration</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Connect Twilio to track incoming calls
                  </p>
                </div>
                {company?.twilio_phone_number && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                    Connected
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {message && (
                <div className={`px-4 py-3 rounded-lg text-sm ${
                  message.includes('success')
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                }`}>
                  {message}
                </div>
              )}

              {['owner', 'admin'].includes(role) ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Twilio Phone Number
                    </label>
                    <input
                      type="tel"
                      value={twilioPhone}
                      onChange={(e) => setTwilioPhone(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Twilio Account SID
                    </label>
                    <input
                      type="text"
                      value={twilioSid}
                      onChange={(e) => setTwilioSid(e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Twilio Auth Token
                    </label>
                    <input
                      type="password"
                      value={twilioToken}
                      onChange={(e) => setTwilioToken(e.target.value)}
                      placeholder="Enter to update"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900 dark:text-white"
                    />
                  </div>

                  <button
                    onClick={handleSaveTwilio}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition duration-200"
                  >
                    {saving ? 'Saving...' : 'Save Twilio Settings'}
                  </button>

                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Webhook URL</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                      Configure this webhook URL in your Twilio console for incoming calls:
                    </p>
                    <code className="block p-2 bg-white dark:bg-slate-900 rounded text-xs text-slate-900 dark:text-white border border-blue-200 dark:border-blue-700">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/twilio/webhook` : '/api/twilio/webhook'}
                    </code>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                  Only owners and admins can configure Twilio integration
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Email Notifications</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Receive email alerts for new calls and leads
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">SMS Notifications</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Get SMS alerts for missed calls
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account</h3>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-slate-600 dark:text-slate-400">Plan:</span>
                <span className="ml-2 font-medium text-slate-900 dark:text-white capitalize">
                  {company?.plan || 'Free'}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-slate-600 dark:text-slate-400">Company ID:</span>
                <span className="ml-2 font-mono text-xs text-slate-900 dark:text-white">
                  {company?.id?.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Upgrade to Pro
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
              Get unlimited calls, advanced analytics, and priority support
            </p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition duration-200">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
