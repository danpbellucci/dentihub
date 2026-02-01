
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Schema, Type } from "https://esm.sh/@google/genai@1.36.0"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = ['http://localhost:5173', 'https://dentihub.com.br', 'https://app.dentihub.com.br'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, mimeType } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      throw new Error('Chave da API não configurada no servidor')
    }

    const ai = new GoogleGenAI({ apiKey })
    const MODEL_NAME = "gemini-2.0-flash-exp"

    const summarySchema: Schema = {
      type: Type.OBJECT,
      properties: {
        transcription: { type: Type.STRING },
        summary: {
          type: Type.OBJECT,
          properties: {
            subjective: { type: Type.STRING },
            objective: { type: Type.STRING },
            assessment: { type: Type.STRING },
            plan: { type: Type.STRING },
          },
          required: ["subjective", "objective", "assessment", "plan"],
        },
      },
      required: ["transcription", "summary"],
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: audio } },
          {
            text: `Você é um assistente odontológico experiente e preciso. 
            Ouça o áudio, transcreva e crie um resumo SOAP. 
            Retorne JSON estrito.`
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: summarySchema,
        temperature: 0.2,
      },
    });

    const data = JSON.parse(response.text || "{}")

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
