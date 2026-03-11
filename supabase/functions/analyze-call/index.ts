import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

interface AnalyzeRequest {
  callId: string
  transcript: string
}

interface LeadData {
  name: string | null
  phone: string | null
  email: string | null
  address: string | null
  project_type: string | null
  materials: string | null
  timeline: string | null
  budget: string | null
  summary: string
  sentiment: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const { callId, transcript }: AnalyzeRequest = await req.json()

    if (!callId || !transcript) {
      return new Response(
        JSON.stringify({ error: "Missing callId or transcript" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const systemPrompt = `You are an AI assistant analyzing phone calls for a home services business. Extract key information from the call transcript and return it as a JSON object.

Extract the following information if mentioned:
- name: Customer's full name
- phone: Customer's phone number
- email: Customer's email address
- address: Property address or location
- project_type: Type of project (e.g., "Kitchen remodel", "Countertop installation", "Bathroom renovation")
- materials: Specific materials mentioned (e.g., "Quartz", "Granite", "Marble")
- timeline: When they want the work done
- budget: Budget range if mentioned
- summary: A brief 2-3 sentence summary of the call
- sentiment: Overall sentiment (positive, neutral, or negative)

Return ONLY valid JSON with these exact field names. If information is not mentioned, use null for that field.`

    const analysisResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Analyze this call transcript:\n\n${transcript}`,
            },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      }
    )

    if (!analysisResponse.ok) {
      const error = await analysisResponse.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const analysisData = await analysisResponse.json()
    const content = analysisData.choices[0].message.content

    let leadData: LeadData
    try {
      leadData = JSON.parse(content)
    } catch (e) {
      throw new Error("Failed to parse AI response")
    }

    return new Response(
      JSON.stringify({
        success: true,
        callId,
        leadData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Analysis error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
