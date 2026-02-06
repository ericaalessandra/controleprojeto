import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { message, context, model = 'gemini-2.5-flash' } = await req.json()
        const apiKey = Deno.env.get('GEMINI_API_KEY')

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'GEMINI_API_KEY not configured in Edge Function' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Construct the request to Google Gemini API
        // Using v1beta as standard for Edge Functions (or v1 if preferred)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: context ? `${context}\n\n${message}` : message }
                        ]
                    }
                ]
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            return new Response(
                JSON.stringify({ error: `Gemini API Error: ${response.status}`, details: errorText }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const data = await response.json()
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated."

        return new Response(
            JSON.stringify({ text: generatedText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
