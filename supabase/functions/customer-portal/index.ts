
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.18.0?target=deno&no-check'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("[Customer Portal] Iniciando requisição...");

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!stripeKey || !supabaseUrl || !supabaseAnonKey) {
        throw new Error("Configuração do servidor incompleta (Chaves ausentes).");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        throw new Error("Token de autorização ausente.");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user || !user.email) {
        console.error("[Customer Portal] Erro de Auth:", userError);
        throw new Error("Usuário não autenticado.");
    }

    console.log(`[Customer Portal] Usuário identificado: ${user.email}`);

    // Inicialização do Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 1. Tenta pegar o ID do cliente na tabela clinics
    const { data: clinic, error: clinicError } = await supabaseClient
        .from('clinics')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle();
    
    if (clinicError) {
        console.error("[Customer Portal] Erro ao buscar clínica:", clinicError);
    }

    let customerId = clinic?.stripe_customer_id;

    // 2. Se não tiver no banco, tenta buscar no Stripe pelo e-mail
    if (!customerId) {
        console.log(`[Customer Portal] Customer ID não encontrado no banco. Buscando no Stripe para ${user.email}...`);
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        
        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            // Atualiza o banco para facilitar na próxima
            await supabaseClient.from('clinics').update({ stripe_customer_id: customerId }).eq('id', user.id);
        } else {
            // Se não existe no Stripe, cria um novo
            console.log("[Customer Portal] Criando novo customer no Stripe...");
            const newCustomer = await stripe.customers.create({
                email: user.email,
                metadata: { supabaseUUID: user.id }
            });
            customerId = newCustomer.id;
            await supabaseClient.from('clinics').update({ stripe_customer_id: customerId }).eq('id', user.id);
        }
    }

    if (!customerId) {
        throw new Error("Não foi possível identificar o cliente para faturamento.");
    }

    console.log(`[Customer Portal] Gerando sessão para Customer: ${customerId}`);

    // Define a URL de retorno. Usa a origin do request se disponível, senão fallback.
    const reqOrigin = req.headers.get('origin');
    const returnUrl = reqOrigin ? `${reqOrigin}/#/dashboard/settings` : 'https://dentihub.com.br/#/dashboard/settings';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log("[Customer Portal] Sucesso. URL gerada.");

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Customer Portal] Erro Fatal:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno ao gerar portal." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
