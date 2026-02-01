
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { slug } = await req.json()
    
    if (!slug) {
        throw new Error("Slug obrigatório")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id, name, slug, address, city, state, observation, logo_url, phone, whatsapp, email')
      .eq('slug', slug)
      .single()

    if (clinicError || !clinic) {
      return new Response(JSON.stringify({ error: 'Clínica não encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const { data: dentists, error: dentError } = await supabaseAdmin
      .from('dentists')
      .select('id, name, specialties, services, accepted_plans, schedule_config, color, cro')
      .eq('clinic_id', clinic.id)

    if (dentError) {
        throw dentError;
    }

    return new Response(
      JSON.stringify({ clinic, dentists }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
