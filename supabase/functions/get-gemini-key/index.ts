
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

declare const Deno: {
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // SECURITY PATCH: Endpoint desativado para prevenir vazamento de credenciais.
  // O frontend nunca deve ter acesso direto à API Key mestre.
  return new Response(
    JSON.stringify({ 
        error: "Este endpoint foi desativado por segurança. A chave de API não deve ser exposta ao cliente. Use as Edge Functions 'process-audio' ou 'generate-campaign-content' que atuam como proxy seguro." 
    }),
    { 
        status: 410, // Gone
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
})
