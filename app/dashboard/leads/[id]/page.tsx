'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Phone, Mail, MapPin, Calendar, DollarSign, FileText, Clock, User, Activity } from 'lucide-react';

type PipelineStage = 'new_lead' | 'contacted' | 'quote_sent' | 'measurement_scheduled' | 'installation_scheduled' | 'completed' | 'lost';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  address: string;
  pipeline_stage: PipelineStage;
  lead_value: number;
  expected_close_date: string;
  lost_reason: string;
  project_details: Record<string, any>;
  created_at: string;
}

interface Call {
  id: string;
  call_sid: string;
  from_number: string;
  to_number: string;
  direction: string;
  duration: number;
  recording_url: string;
  transcription: string;
  ai_summary: string;
  sentiment: string;
  key_points: string[];
  created_at: string;
}

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  metadata: Record<string, any>;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  quote_sent: 'Quote Sent',
  measurement_scheduled: 'Measurement Scheduled',
  installation_scheduled: 'Installation Scheduled',
  completed: 'Completed',
  lost: 'Lost'
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  new_lead: 'bg-blue-100 text-blue-800',
  contacted: 'bg-purple-100 text-purple-800',
  quote_sent: 'bg-yellow-100 text-yellow-800',
  measurement_scheduled: 'bg-orange-100 text-orange-800',
  installation_scheduled: 'bg-teal-100 text-teal-800',
  completed: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800'
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    appointment_type: 'estimate' as 'estimate' | 'measurement' | 'installation',
    scheduled_date: '',
    duration_minutes: 60,
    notes: ''
  });

  const supabase = createClient();

  useEffect(() => {
    loadLeadData();
  }, [params.id]);

  async function loadLeadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData) return;

      const [leadRes, callsRes, activitiesRes, appointmentsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .eq('id', params.id)
          .eq('company_id', memberData.company_id)
          .single(),
        supabase
          .from('calls')
          .select('*')
          .eq('lead_id', params.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('lead_activities')
          .select('*')
          .eq('lead_id', params.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('appointments')
          .select('*')
          .eq('lead_id', params.id)
          .order('start_time', { ascending: true })
      ]);

      if (leadRes.data) setLead(leadRes.data);
      if (callsRes.data) setCalls(callsRes.data);
      if (activitiesRes.data) setActivities(activitiesRes.data);
      if (appointmentsRes.data) setAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('Error loading lead:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStage(newStage: PipelineStage) {
    if (!lead) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData) return;

      await supabase
        .from('leads')
        .update({ pipeline_stage: newStage })
        .eq('id', lead.id);

      await supabase
        .from('lead_activities')
        .insert({
          lead_id: lead.id,
          company_id: memberData.company_id,
          activity_type: 'status_change',
          title: `Stage changed to ${STAGE_LABELS[newStage]}`,
          description: `Pipeline stage updated from ${STAGE_LABELS[lead.pipeline_stage]} to ${STAGE_LABELS[newStage]}`,
          created_by: user.id,
          metadata: {
            old_stage: lead.pipeline_stage,
            new_stage: newStage
          }
        });

      await loadLeadData();
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  }

  async function addNote() {
    if (!newNote.trim() || !lead) return;

    setAddingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData) return;

      await supabase
        .from('lead_activities')
        .insert({
          lead_id: lead.id,
          company_id: memberData.company_id,
          activity_type: 'note',
          title: 'Note added',
          description: newNote,
          created_by: user.id
        });

      setNewNote('');
      await loadLeadData();
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setAddingNote(false);
    }
  }

  async function scheduleAppointment() {
    if (!appointmentForm.title || !appointmentForm.scheduled_date || !lead) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData) return;

      const scheduledDate = new Date(appointmentForm.scheduled_date);
      const endTime = new Date(scheduledDate.getTime() + appointmentForm.duration_minutes * 60000);

      await supabase
        .from('appointments')
        .insert({
          company_id: memberData.company_id,
          lead_id: lead.id,
          title: appointmentForm.title,
          appointment_type: appointmentForm.appointment_type,
          start_time: scheduledDate.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: appointmentForm.duration_minutes,
          notes: appointmentForm.notes,
          location: lead.address,
          created_by: user.id,
          status: 'scheduled'
        });

      await supabase
        .from('lead_activities')
        .insert({
          lead_id: lead.id,
          company_id: memberData.company_id,
          activity_type: 'appointment',
          title: `${appointmentForm.appointment_type} scheduled`,
          description: `${appointmentForm.title} scheduled for ${new Date(appointmentForm.scheduled_date).toLocaleString()}`,
          created_by: user.id
        });

      setAppointmentForm({
        title: '',
        appointment_type: 'estimate',
        scheduled_date: '',
        duration_minutes: 60,
        notes: ''
      });
      setShowAppointmentForm(false);
      await loadLeadData();
    } catch (error) {
      console.error('Error scheduling appointment:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Lead not found</h2>
          <button
            onClick={() => router.push('/dashboard/leads')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/leads')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Leads
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
            <p className="text-gray-500">{lead.company_name}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${STAGE_COLORS[lead.pipeline_stage]}`}>
            {STAGE_LABELS[lead.pipeline_stage]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{lead.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{lead.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{lead.address}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pipeline Stage</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STAGE_LABELS).map(([stage, label]) => (
                <button
                  key={stage}
                  onClick={() => updateStage(stage as PipelineStage)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    lead.pipeline_stage === stage
                      ? STAGE_COLORS[stage as PipelineStage]
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Call Recordings</h2>
            {calls.length === 0 ? (
              <p className="text-gray-500">No call recordings yet</p>
            ) : (
              <div className="space-y-4">
                {calls.map((call) => (
                  <div key={call.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(call.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {call.ai_summary && (
                      <div className="mb-3 p-3 bg-blue-50 rounded">
                        <p className="text-sm font-medium text-blue-900 mb-1">AI Summary</p>
                        <p className="text-sm text-blue-800">{call.ai_summary}</p>
                      </div>
                    )}

                    {call.sentiment && (
                      <div className="mb-2">
                        <span className="text-sm text-gray-600">Sentiment: </span>
                        <span className={`text-sm font-medium ${
                          call.sentiment === 'positive' ? 'text-green-600' :
                          call.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {call.sentiment}
                        </span>
                      </div>
                    )}

                    {call.key_points && call.key_points.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-900 mb-1">Key Points:</p>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          {call.key_points.map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {call.recording_url && (
                      <audio controls className="w-full mt-2">
                        <source src={call.recording_url} type="audio/mpeg" />
                      </audio>
                    )}

                    {call.transcription && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700">
                          View Transcription
                        </summary>
                        <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{call.transcription}</p>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Details</h2>
            {lead.project_details && Object.keys(lead.project_details).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(lead.project_details).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className="text-gray-600">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No project details yet</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              {lead.lead_value && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Lead Value</p>
                    <p className="font-semibold text-gray-900">${lead.lead_value.toLocaleString()}</p>
                  </div>
                </div>
              )}
              {lead.expected_close_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">Expected Close</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(lead.expected_close_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Appointments</h2>
              <button
                onClick={() => setShowAppointmentForm(!showAppointmentForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                {showAppointmentForm ? 'Cancel' : 'Schedule'}
              </button>
            </div>

            {showAppointmentForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <input
                  type="text"
                  placeholder="Appointment title"
                  value={appointmentForm.title}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={appointmentForm.appointment_type}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_type: e.target.value as any })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="estimate">Estimate</option>
                  <option value="measurement">Measurement</option>
                  <option value="installation">Installation</option>
                </select>
                <input
                  type="datetime-local"
                  value={appointmentForm.scheduled_date}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_date: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Duration (minutes)"
                  value={appointmentForm.duration_minutes}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, duration_minutes: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
                <button
                  onClick={scheduleAppointment}
                  disabled={!appointmentForm.title || !appointmentForm.scheduled_date}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Schedule Appointment
                </button>
              </div>
            )}

            {appointments.length === 0 ? (
              <p className="text-gray-500">No appointments scheduled</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{appointment.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {appointment.appointment_type?.charAt(0).toUpperCase() + appointment.appointment_type?.slice(1)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(appointment.start_time).toLocaleString()}
                    </p>
                    {appointment.duration_minutes && (
                      <p className="text-xs text-gray-500 mt-1">
                        Duration: {appointment.duration_minutes} minutes
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Note</h2>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this lead..."
              className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
            <button
              onClick={addNote}
              disabled={!newNote.trim() || addingNote}
              className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {addingNote ? 'Adding...' : 'Add Note'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Timeline</h2>
            {activities.length === 0 ? (
              <p className="text-gray-500">No activity yet</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="border-l-2 border-gray-200 pl-4 pb-4">
                    <div className="flex items-start gap-2">
                      <Activity className="w-4 h-4 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
