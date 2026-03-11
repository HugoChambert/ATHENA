import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const callSid = formData.get('CallSid') as string
    const recordingUrl = formData.get('RecordingUrl') as string
    const recordingSid = formData.get('RecordingSid') as string
    const recordingDuration = formData.get('RecordingDuration') as string

    if (!callSid || !recordingUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: callData, error } = await supabase
      .from('calls')
      .update({
        recording_url: recordingUrl,
        recording_sid: recordingSid,
      })
      .eq('call_sid', callSid)
      .select('id')
      .single()

    if (error) {
      console.error('Error updating call with recording:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (callData?.id) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const processUrl = `${supabaseUrl}/functions/v1/process-call-recording`

      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          callId: callData.id,
          recordingUrl: recordingUrl,
        }),
      }).catch(err => {
        console.error('Failed to trigger AI processing:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Recording webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Twilio recording webhook endpoint' })
}
