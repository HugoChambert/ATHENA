import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

interface TranscribeRequest {
  callId: string
  recordingUrl: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const { callId, recordingUrl }: TranscribeRequest = await req.json()

    if (!callId || !recordingUrl) {
      return new Response(
        JSON.stringify({ error: "Missing callId or recordingUrl" }),
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

    const audioResponse = await fetch(recordingUrl)
    if (!audioResponse.ok) {
      throw new Error("Failed to fetch recording")
    }

    const audioBlob = await audioResponse.blob()

    const formData = new FormData()
    formData.append("file", audioBlob, "recording.mp3")
    formData.append("model", "whisper-1")
    formData.append("language", "en")

    const transcriptionResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: formData,
      }
    )

    if (!transcriptionResponse.ok) {
      const error = await transcriptionResponse.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const transcriptionData = await transcriptionResponse.json()
    const transcript = transcriptionData.text

    return new Response(
      JSON.stringify({
        success: true,
        callId,
        transcript,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Transcription error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
