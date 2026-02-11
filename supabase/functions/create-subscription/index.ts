
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Importação direta da versão v11.18.0 que é 100% compatível com Deno Edge Functions
import Stripe from 'https://esm.sh/stripe@11.18.0?target=deno&no-check'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  console.log("Create-Subscription: Function started (v11 Fix)");

  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = [
    'http://localhost:5173', 
    'https://dentihub.com.br', 
    'https://www.dentihub.com.br', 
    'https://app.dentihub.com.br',
    'https://aistudio.google.com',
    'https://8080-idx-dentihub-17267216438.cluster-3g4sc32jwwc5w5j437332346c.cloudworkstations.dev' // Adicione outros ambientes de dev se necessário
  ];
  
  // CORS Permissivo para desenvolvimento se a origem não estiver na lista exata,
  // mas idealmente restrito em produção.
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || '*', // Fallback para * em testes de API
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
        throw new Error("Configuração ausente: Verifique as variáveis de ambiente (STRIPE_SECRET_KEY, etc).");
    }

    // Inicialização do Stripe com configuração HTTP explícita para Deno
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2022-11-15', // Versão da API compatível com a lib v11
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, { 
        global: { headers: { Authorization: req.headers.get('Authorization')! } } 
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error("Auth Error:", userError);
      return new Response(JSON.stringify({ error: "Usuário não autenticado." }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Lê o corpo da requisição
    const { priceId, items, limits, planId } = await req.json();
    console.log(`Processing for User: ${user.id}, PlanId: ${planId}`);
    
    let subscriptionItems = [];
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- LÓGICA DE NEGÓCIO: Resolução de Itens ---
    if (items && Array.isArray(items) && items.length > 0) {
        // Cenário 1: Enterprise Customizado (Itens explícitos)
        subscriptionItems = items;
    } else if (planId) {
        // Cenário 2: Busca o Preço pelo ID do Plano no Banco
        const { data: plan } = await supabaseAdmin
            .from('subscription_plans')
            .select('stripe_price_id')
            .eq('id', planId)
            .single();
        
        if (!plan || !plan.stripe_price_id) {
            console.error("Plano sem Stripe Price ID no banco:", planId);
            throw new Error("Erro de configuração do plano: Price ID não encontrado.");
        }
        subscriptionItems = [{ price: plan.stripe_price_id, quantity: 1 }];
    } else if (priceId) {
        // Cenário 3: Legado/Fallback
        subscriptionItems = [{ price: priceId, quantity: 1 }];
    } else {
        throw new Error("Dados inválidos: priceId ou planId são obrigatórios.");
    }

    console.log("Searching for Stripe customer...");
    
    // 1. Buscar ou Criar Customer
    const { data: customers } = await stripe.customers.search({
      query: `email:'${user.email}'`,
    });

    let customerId;
    if (customers.length > 0) {
      customerId = customers[0].id;
    } else {
      console.log("Creating new Stripe customer...");
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabaseUUID: user.id },
      });
      customerId = customer.id;
    }

    // 2. Cancelar Assinaturas Antigas (Para evitar duplicidade)
    // CORREÇÃO: Busca todas as assinaturas ativas/trialing e cancela IMEDIATAMENTE
    const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all', // Busca todas para filtrar corretamente
        limit: 10
    });

    for (const sub of existingSubs.data) {
        if (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'incomplete') {
            console.log(`[Create-Subscription] Cancelando assinatura anterior (${sub.status}): ${sub.id}`);
            try {
                // del() cancela a assinatura imediatamente. 
                // Isso garante que o usuário não fique com 2 planos ativos.
                await stripe.subscriptions.del(sub.id);
            } catch (err) {
                console.error(`Erro ao cancelar assinatura antiga ${sub.id}:`, err);
            }
        }
    }

    const metadata = { 
        supabaseUUID: user.id,
        isEnterprise: items && items.length > 1 ? 'true' : 'false',
        customDentistLimit: limits?.dentists || null,
        customAiDailyLimit: limits?.aiDaily || null
    };

    console.log("Creating Subscription...");
    
    // 3. Criar Nova Assinatura
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

    // 4. Log de Sucesso
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'create-subscription',
        metadata: { user_id: user.id, items: subscriptionItems, subscription_id: subscription.id },
        status: 'success'
    });

    console.log("Subscription created successfully.");

    return new Response(
      JSON.stringify({ 
        subscriptionId: subscription.id, 
        clientSecret: paymentIntent.client_secret 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error("Erro interno:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno no servidor." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
})
