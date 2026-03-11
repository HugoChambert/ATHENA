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

    const { error } = await supabase
      .from('calls')
      .update({
        recording_url: recordingUrl,
        recording_sid: recordingSid,
      })
      .eq('call_sid', callSid)

    if (error) {
      console.error('Error updating call with recording:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
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
