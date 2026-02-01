
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // test-deps geralmente é para debug interno, mas pode restringir se quiser. Mantido * para flexibilidade de teste ou restringir:
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Configuração de CORS Dinâmica (Segurança)
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = ['http://localhost:5173', 'https://dentihub.com.br', 'https://app.dentihub.com.br'];
  // Se origem válida, usa ela. Se não, fallback seguro.
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const secureCorsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: secureCorsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { count, error } = await supabaseClient
      .from('clinics')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        message: "Função executada com sucesso com importação direta.",
        details: "A biblioteca @supabase/supabase-js foi carregada via URL direta (https://esm.sh).",
        clinics_count: count
      }),
      {
        headers: { ...secureCorsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...secureCorsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
