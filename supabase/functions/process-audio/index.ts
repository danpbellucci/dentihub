
import { GoogleGenAI, Type } from "@google/genai"
import { createClient } from "@supabase/supabase-js"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = [
    'http://localhost:5173', 
    'https://dentihub.com.br', 
    'https://www.dentihub.com.br',
    'https://app.dentihub.com.br'
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!origin || !allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ error: "Acesso negado." }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const { audio, mimeType, dentistId } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error } = await supabaseClient.auth.getUser()
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Client Admin para Logs e leitura de Tier (Bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single();
    
    const clinicId = profile?.clinic_id || user.id;

    const { data: clinic } = await supabaseClient
        .from('clinics')
        .select('subscription_tier')
        .eq('id', clinicId)
        .single();
    
    const tier = clinic?.subscription_tier || 'free';

    // VERIFICAÇÃO DE LIMITES
    let isLimitReached = false;
    let errorMsg = '';

    if (tier === 'free') {
        const { count } = await supabaseClient
            .from('clinical_records')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId);
        if ((count || 0) >= 3) { isLimitReached = true; errorMsg = 'Limite de 3 usos do plano Gratuito atingido.'; }
    } else {
        // Planos Pagos: Limite Diário POR DENTISTA
        if (!dentistId) {
             // Se não mandou dentistId, bloqueia por segurança
             isLimitReached = true; 
             errorMsg = 'Dentista responsável não identificado.'; 
        } else {
            const today = new Date().toISOString().split('T')[0];
            const { count } = await supabaseClient
                .from('clinical_records')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .eq('dentist_id', dentistId)
                .gte('created_at', today);
            
            const usage = count || 0;
            const limit = tier === 'starter' ? 5 : 10; // Starter: 5, Pro: 10

            if (usage >= limit) { 
                isLimitReached = true; 
                errorMsg = `Limite diário de ${limit} usos para este dentista atingido.`; 
            }
        }
    }

    if (isLimitReached) {
        return new Response(JSON.stringify({ error: errorMsg, limitReached: true }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('API_KEY') || Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) throw new Error('Chave da API não configurada.')

    const ai = new GoogleGenAI({ apiKey })
    const MODEL_NAME = "gemini-3-flash-preview"

    const responseSchema = {
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
          { inlineData: { mimeType: mimeType || 'audio/webm', data: audio } },
          { text: `Você é um assistente odontológico. Transcreva e gere SOAP. JSON apenas.` }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    const data = JSON.parse(response.text || "{}");

    // LOG DE USO
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'process-audio',
        metadata: { clinic_id: clinicId, user_id: user.id, tier: tier, dentist_id: dentistId },
        status: 'success'
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error("Erro process-audio:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
