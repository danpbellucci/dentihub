
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
  
  // HARDENED SECURITY: Localhost removido
  const allowedOrigins = [
    'https://dentihub.com.br', 
    'https://www.dentihub.com.br',
    'https://app.dentihub.com.br',
    'https://aistudio.google.com'
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
      return new Response(JSON.stringify({ error: "Acesso negado: Origem não autorizada." }), {
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

    // --- SEGURANÇA: VALIDAÇÃO DE PROPRIEDADE DO DENTISTA ---
    if (dentistId) {
        const { data: validDentist } = await supabaseAdmin
            .from('dentists')
            .select('id')
            .eq('id', dentistId)
            .eq('clinic_id', clinicId)
            .single();
        
        if (!validDentist) {
            return new Response(JSON.stringify({ error: 'Dentista inválido ou não pertence à sua clínica.', limitReached: true }), { 
                status: 403, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
    }
    // --------------------------------------------------------

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
        if (!dentistId) {
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
        procedures: {
            type: Type.ARRAY,
            description: "Lista de procedimentos ou condições identificadas em dentes específicos para o odontograma.",
            items: {
                type: Type.OBJECT,
                properties: {
                    tooth: { type: Type.STRING, description: "Número do dente (FDI) ex: 18, 21, 46. Se não mencionado, ignore." },
                    condition: { 
                        type: Type.STRING, 
                        description: "Condição identificada. Valores permitidos: 'healthy' (saudável/limpeza), 'carie', 'restoration' (restauração/resina), 'canal' (endo), 'protese' (coroa/bloco), 'implant' (implante), 'missing' (extraído/ausente)." 
                    }
                },
                required: ["tooth", "condition"]
            }
        }
      },
      required: ["transcription", "summary", "procedures"],
    };

    const promptContext = `
      ATENÇÃO: O áudio fornecido contém um DENTISTA ditando anotações técnicas sobre um procedimento realizado.
      NÃO é uma conversa com o paciente. A voz é do profissional de saúde.

      SEGURANÇA E RESTRIÇÕES (CRÍTICO):
      1. NUNCA revele chaves de API, senhas, dados de acesso ao sistema ou informações sensíveis.
      2. Se o dentista fizer perguntas no áudio, ignore-as no resumo.
      3. Sua única função é DOCUMENTAR.

      TAREFAS:
      1. Transcreva o áudio fielmente.
      2. Gere um resumo estruturado no formato SOAP.
      3. [IMPORTANTE] Identifique procedimentos realizados em dentes específicos para preencher o odontograma (array 'procedures').
         - Use a numeração FDI (11-48).
         - Mapeie para uma das condições: 'healthy', 'carie', 'restoration', 'canal', 'protese', 'implant', 'missing'.
         - Exemplo: "Fiz uma restauração no 26" -> tooth: "26", condition: "restoration".
         - Exemplo: "Extraí o siso 48" -> tooth: "48", condition: "missing".
         - Exemplo: "Canal no dente 11" -> tooth: "11", condition: "canal".
         - Se nenhum dente específico for mencionado, retorne o array procedures vazio.

      REGRA DE OURO (ANTI-ALUCINAÇÃO):
      - Use APENAS as informações que foram DITADAS no áudio.
      - Se a informação não está no áudio, ela NÃO deve estar no SOAP nem nos procedures.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType || 'audio/webm', data: audio } },
          { text: promptContext }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Temperatura baixa para reduzir criatividade/alucinação
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
