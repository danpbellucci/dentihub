import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  // Configuração de CORS Dinâmica
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = ['http://localhost:5173', 'https://dentihub.com.br', 'https://app.dentihub.com.br'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verificar Autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado (Header ausente)' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error } = await supabaseClient.auth.getUser()
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Recuperar a Chave
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('API_KEY');
    
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Chave GEMINI_API_KEY não configurada no servidor.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Retornar a Chave
    return new Response(
      JSON.stringify({ apiKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Erro não tratado:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno na Edge Function" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})