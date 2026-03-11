import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const messageSid = formData.get('MessageSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string

    const supabase = await createClient()

    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('twilio_phone_number', to)
      .single()

    if (!company) {
      console.error('No company found for phone number:', to)
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const { data: leadData } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', from)
      .eq('company_id', company.id)
      .maybeSingle()

    await supabase
      .from('sms_messages')
      .insert({
        company_id: company.id,
        lead_id: leadData?.id || null,
        message_sid: messageSid,
        from_number: from,
        to_number: to,
        body: body,
        direction: 'inbound',
        status: 'received',
      })

    if (leadData) {
      await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadData.id,
          company_id: company.id,
          activity_type: 'sms',
          title: 'SMS received',
          description: body,
          metadata: {
            message_sid: messageSid,
            from: from,
          },
        })
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you for your message. We'll get back to you shortly!</Message>
</Response>`

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'application/xml' },
    })
  } catch (error) {
    console.error('SMS webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Twilio SMS webhook endpoint' })
}
