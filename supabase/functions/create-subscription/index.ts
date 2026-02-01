
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// WHITELIST: Apenas estes IDs são aceitos para novas assinaturas.
const ALLOWED_PRICE_IDS = [
    'price_1SlMYr2Obfcu36b5HzK9JQPO', // Starter
    'price_1SlEBs2Obfcu36b5HrWAo2Fh', // Pro
    'price_1SrN3I2Obfcu36b5MmVEv6qq'  // Starter (Legacy/Test)
];

Deno.serve(async (req) => {
  // Configuração de CORS Dinâmica
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
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // BLOQUEIO DE SEGURANÇA RIGOROSO
  if (!origin || !allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ error: "Acesso negado: Origem não autorizada." }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
        throw new Error("Configuração ausente.");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, { 
        global: { headers: { Authorization: req.headers.get('Authorization')! } } 
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado." }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { priceId } = await req.json();
    
    if (!priceId) {
        throw new Error("priceId é obrigatório.");
    }

    if (!ALLOWED_PRICE_IDS.includes(priceId)) {
        return new Response(JSON.stringify({ error: "Plano inválido ou descontinuado." }), { 
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const { data: customers } = await stripe.customers.search({
      query: `email:'${user.email}'`,
    })

    let customerId
    if (customers.length > 0) {
      customerId = customers[0].id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabaseUUID: user.id },
      })
      customerId = customer.id
    }

    const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
    });

    if (existingSubs.data.length > 0) {
        return new Response(
            JSON.stringify({ error: "Você já possui uma assinatura ativa. Use 'Gerenciar Assinatura' para alterar." }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { supabaseUUID: user.id },
    });

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice.payment_intent;

    if (!paymentIntent || !paymentIntent.client_secret) {
        throw new Error("Falha ao gerar o segredo de pagamento.");
    }

    // LOG DE USO
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'create-subscription',
        metadata: { user_id: user.id, price_id: priceId, subscription_id: subscription.id },
        status: 'success'
    });

    return new Response(
      JSON.stringify({ 
        subscriptionId: subscription.id, 
        clientSecret: paymentIntent.client_secret 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Erro interno:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno no servidor." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
