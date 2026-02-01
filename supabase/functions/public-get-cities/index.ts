
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
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
    const { state } = await req.json().catch(() => ({ state: null }))

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let query = supabaseAdmin
      .from('clinics')
      .select('city')
      .neq('city', null)
      .neq('city', '')

    if (state) {
        query = query.eq('state', state)
    }

    const { data, error } = await query

    if (error) throw error

    if (!data) {
        return new Response(JSON.stringify({ cities: [] }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 
        })
    }

    const distinctCities = [...new Set(data.map((item: any) => item.city?.trim()))]
        .filter((city: any) => typeof city === 'string' && city.length > 0)
        .sort((a: any, b: any) => a.localeCompare(b));

    return new Response(
      JSON.stringify({ cities: distinctCities }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
