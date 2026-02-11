
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@11.18.0?target=deno&no-check";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = [
    'http://localhost:5173', 
    'https://dentihub.com.br', 
    'https://www.dentihub.com.br',
    'https://app.dentihub.com.br',
    'https://aistudio.google.com'
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        throw new Error("Configuração do servidor incompleta.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Usuário inválido");

    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { data: clinic } = await supabaseClient
        .from('clinics')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

    if (!clinic?.stripe_customer_id) {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length === 0) {
            return new Response(JSON.stringify({ hasSubscription: false }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
            });
        }
        clinic.stripe_customer_id = customers.data[0].id;
    }

    const subscriptions = await stripe.subscriptions.list({
        customer: clinic.stripe_customer_id,
        status: 'all',
        limit: 1,
        expand: ['data.items.data.price']
    });

    if (subscriptions.data.length === 0) {
        return new Response(JSON.stringify({ hasSubscription: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
        });
    }

    // Pega a primeira assinatura ativa (ou a mais recente)
    const sub = subscriptions.data.find(s => ['active', 'trialing'].includes(s.status)) || subscriptions.data[0];
    
    // Soma total de todos os itens (importante para Enterprise que tem múltiplos itens)
    let totalAmount = 0;
    const priceIds: string[] = [];
    const productIds: string[] = [];
    
    sub.items.data.forEach((item: any) => {
        totalAmount += (item.price.unit_amount || 0) * (item.quantity || 1);
        priceIds.push(item.price.id);
        if (item.price.product) productIds.push(item.price.product as string);
    });

    // Pega dados do primeiro item para metadados básicos
    const firstPrice = sub.items.data[0].price;

    // Busca nome do plano no banco usando todos os IDs encontrados
    const { data: planData } = await supabaseAdmin
        .from('subscription_plans')
        .select('name')
        .or(`stripe_price_id.in.(${priceIds.join(',')}),stripe_product_id.in.(${productIds.join(',')}),stripe_dentist_price_id.in.(${priceIds.join(',')}),stripe_ai_price_id.in.(${priceIds.join(',')})`)
        .limit(1)
        .maybeSingle();

    const planName = planData?.name || `Plano Personalizado`;

    const details = {
        hasSubscription: true,
        id: sub.id,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        amount: totalAmount / 100,
        currency: firstPrice.currency,
        interval: firstPrice.recurring?.interval,
        product_name: planName
    };

    return new Response(JSON.stringify(details), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
