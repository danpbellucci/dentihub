
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Schema, Type } from "https://esm.sh/@google/genai@1.36.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })

    const { data: { user }, error } = await supabaseClient.auth.getUser()
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const { text } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('API_KEY')
    
    if (!apiKey) {
      throw new Error('Chave da API não configurada (GEMINI_API_KEY)')
    }

    if (!text) {
        throw new Error('Texto para processamento é obrigatório.')
    }

    const ai = new GoogleGenAI({ apiKey })
    const MODEL_NAME = "gemini-2.0-flash"

    const summarySchema: Schema = {
      type: Type.OBJECT,
      properties: {
        subjective: { type: Type.STRING, description: "Queixa principal, histórico relatado pelo paciente (S)" },
        objective: { type: Type.STRING, description: "Exame clínico, visual e achados físicos (O)" },
        assessment: { type: Type.STRING, description: "Diagnóstico e análise clínica (A)" },
        plan: { type: Type.STRING, description: "Plano de tratamento, procedimentos realizados e futuros (P)" },
      },
      required: ["subjective", "objective", "assessment", "plan"],
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            text: `Você é um assistente odontológico especialista em documentação.
            
            TAREFA:
            Analise o seguinte texto transcrito de uma consulta odontológica e organize-o estritamente no formato SOAP (Subjetivo, Objetivo, Avaliação, Plano).
            
            TEXTO ORIGINAL:
            "${text}"
            
            DIRETRIZES:
            - Use linguagem técnica odontológica adequada.
            - Corrija erros gramaticais óbvios da transcrição.
            - Se alguma seção (S, O, A ou P) não tiver informações no texto, preencha com "Não relatado" ou infira logicamente se possível.
            - Responda APENAS com o JSON.`
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: summarySchema,
        temperature: 0.3,
      },
    });

    const resultText = response.text;
    let data;
    try {
        data = JSON.parse(resultText || "{}");
    } catch (e) {
        return new Response(JSON.stringify({ error: "Falha ao processar resposta da IA" }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // LOG DE USO
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'generate-soap',
        metadata: { user_id: user.id },
        status: 'success'
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error("Erro generate-soap:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
