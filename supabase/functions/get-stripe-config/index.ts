
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = [
    'http://localhost:5173', 
    'https://dentihub.com.br', 
    'https://app.dentihub.com.br',
    'https://aistudio.google.com'
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY') || 
                           Deno.env.get('STRIPE_PUBLIC_KEY') || 
                           'pk_live_51SlBFr2Obfcu36b5A1xwCAouBbAsnZWRFEOEWYcfOmASaVvaBZM8uMhCCc11M3CNuaprfNXsVS0YnV3mlHQrXXKy00uj8Jzf7g';
    
    if (!publishableKey) {
        return new Response(JSON.stringify({ error: 'STRIPE_PUBLISHABLE_KEY não configurada no servidor.' }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 
        });
    }

    return new Response(JSON.stringify({ publishableKey }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
