import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const callSid = formData.get('CallSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const callStatus = formData.get('CallStatus') as string
    const direction = formData.get('Direction') as string
    const recordingUrl = formData.get('RecordingUrl') as string
    const callDuration = formData.get('CallDuration') as string

    const supabase = await createClient()

    const { data: company } = await supabase
      .from('companies')
      .select('id, user_id')
      .eq('twilio_phone_number', to)
      .single()

    if (!company) {
      console.error('No company found for phone number:', to)
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (callStatus === 'ringing' && direction === 'inbound') {
      const { error } = await supabase
        .from('calls')
        .insert({
          company_id: company.id,
          user_id: company.user_id,
          caller_phone: from,
          call_sid: callSid,
          status: 'ringing',
          call_date: new Date().toISOString(),
          duration: 0,
        })

      if (error) {
        console.error('Error creating call record:', error)
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Your call is being recorded. Please hold while we connect you.</Say>
  <Record maxLength="3600" recordingStatusCallback="${request.nextUrl.origin}/api/twilio/recording" />
  <Say>Thank you for your call. Goodbye.</Say>
</Response>`

      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'application/xml' },
      })
    }

    if (callStatus === 'completed') {
      const duration = parseInt(callDuration) || 0
      const status = duration > 0 ? 'answered' : 'missed'

      const { error } = await supabase
        .from('calls')
        .update({
          status,
          duration,
          recording_url: recordingUrl,
        })
        .eq('call_sid', callSid)

      if (error) {
        console.error('Error updating call record:', error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Twilio webhook endpoint' })
}
