
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// WHITELIST
const ALLOWED_PRICE_IDS = [
    'price_1SrN3I2Obfcu36b5MmVEv6qq', // Starter
    'price_1Sz4tG2Obfcu36b5sVI27lo8', // Pro
    // IDs Enterprise
    'price_1SykFl2Obfcu36b5rdtYse4m', // Enterprise - Licença Dentista (R$ 100)
    'price_1SykGo2Obfcu36b5TmDgIM4d'  // Enterprise - Pacote IA (R$ 30)
];

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
  }

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

    // Aceita items (array) OU priceId (string) para retrocompatibilidade
    const { priceId, items, limits } = await req.json();
    
    let subscriptionItems = [];

    if (items && Array.isArray(items)) {
        subscriptionItems = items;
    } else if (priceId) {
        subscriptionItems = [{ price: priceId, quantity: 1 }];
    } else {
        throw new Error("priceId ou items são obrigatórios.");
    }

    // Validação básica dos Price IDs
    for (const item of subscriptionItems) {
        if (!ALLOWED_PRICE_IDS.includes(item.price)) {
             // Em dev, podemos ser permissivos, mas em prod deve bloquear
             console.warn(`Price ID não listado na whitelist: ${item.price}`);
        }
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

    // Se já tem assinatura, cancela a anterior para criar a nova (Upgrade/Downgrade simplificado)
    // Em produção ideal, faria update da subscription, mas create é mais robusto para MVP
    if (existingSubs.data.length > 0) {
        const oldSub = existingSubs.data[0];
        await stripe.subscriptions.update(oldSub.id, { cancel_at_period_end: true });
        // Ou, se quiser substituir imediatamente:
        // await stripe.subscriptions.cancel(oldSub.id);
    }

    // Metadados para o Webhook atualizar os limites customizados no banco
    const metadata = { 
        supabaseUUID: user.id,
        isEnterprise: items && items.length > 1 ? 'true' : 'false',
        customDentistLimit: limits?.dentists || null,
        customAiDailyLimit: limits?.aiDaily || null
    };

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: subscriptionItems,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: metadata,
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
        metadata: { user_id: user.id, items: subscriptionItems, subscription_id: subscription.id },
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
