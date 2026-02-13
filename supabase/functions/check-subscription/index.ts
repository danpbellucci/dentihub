
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
        throw new Error("Configuração de servidor incompleta (Chaves ausentes).");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey ?? "", {
        global: { headers: { Authorization: req.headers.get("Authorization")! } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user || !user.email) {
        throw new Error("Usuário não autenticado.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: clinicData } = await supabaseAdmin
        .from('clinics')
        .select('subscription_tier, bonus_expires_at, is_manual_override')
        .eq('id', user.id)
        .single();

    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // Objeto Debug Global
    let debugInfo: any = {
        userId: user.id,
        userEmail: user.email,
        steps: []
    };

    debugInfo.steps.push("Iniciando busca no Stripe");

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ 
          subscribed: false, 
          tier: 'free', 
          debug: { ...debugInfo, message: "Cliente não encontrado no Stripe" } 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    debugInfo.customerId = customerId;
    debugInfo.steps.push("Cliente encontrado: " + customerId);
    
    // Busca Assinaturas
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
      expand: ['data.items.data.price.product']
    });

    let subscription = null;
    if (subscriptions.data.length > 0) {
        subscription = subscriptions.data[0];
        debugInfo.steps.push("Assinatura ATIVA encontrada");
    } else {
        const trials = await stripe.subscriptions.list({
            customer: customerId,
            status: "trialing",
            limit: 1,
            expand: ['data.items.data.price.product']
        });
        if (trials.data.length > 0) {
            subscription = trials.data[0];
            debugInfo.steps.push("Assinatura TRIAL encontrada");
        }
    }

    // Busca Planos do Banco
    const { data: allPlans } = await supabaseAdmin.from('subscription_plans').select('*');
    debugInfo.database_plans = allPlans?.map((p: any) => ({
        name: p.name,
        slug: p.slug,
        stripe_price_id: p.stripe_price_id,
        stripe_product_id: p.stripe_product_id,
        stripe_dentist_price_id: p.stripe_dentist_price_id,
        stripe_ai_price_id: p.stripe_ai_price_id
    }));

    if (!subscription) {
        return new Response(JSON.stringify({ 
            subscribed: false, 
            tier: 'free',
            debug: { ...debugInfo, message: "Nenhuma assinatura ativa encontrada" }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
    
    // Dados da Assinatura do Usuário
    debugInfo.user_stripe_items = subscription.items.data.map((item: any) => ({
        price_id: item.price.id,
        product_id: typeof item.price.product === 'object' ? item.price.product.id : item.price.product,
        product_name: typeof item.price.product === 'object' ? item.price.product.name : 'N/A',
        amount: item.price.unit_amount
    }));

    // Lógica de Detecção
    const subPriceIds = subscription.items.data.map((item: any) => item.price.id);
    const subProductIds = subscription.items.data
        .map((item: any) => (typeof item.price.product === 'object' ? item.price.product.id : item.price.product))
        .filter(Boolean);

    let detectedTier = 'free';
    let matchReason = 'none';

    if (allPlans) {
        const matchedPlan = allPlans.find((plan: any) => {
            if (plan.stripe_price_id && subPriceIds.includes(plan.stripe_price_id)) { matchReason = 'price_id'; return true; }
            if (plan.stripe_product_id && subProductIds.includes(plan.stripe_product_id)) { matchReason = 'product_id'; return true; }
            if (plan.stripe_dentist_price_id && subPriceIds.includes(plan.stripe_dentist_price_id)) { matchReason = 'dentist_price_id'; return true; }
            if (plan.stripe_ai_price_id && subPriceIds.includes(plan.stripe_ai_price_id)) { matchReason = 'ai_price_id'; return true; }
            return false;
        });

        if (matchedPlan) {
            detectedTier = matchedPlan.slug;
            debugInfo.steps.push("Match encontrado no banco: " + detectedTier);
        } else {
            debugInfo.steps.push("Nenhum match exato no banco");
        }
    }

    if (detectedTier === 'free') {
        // Fallback
        if (subscription.metadata?.isEnterprise === 'true') { detectedTier = 'enterprise'; matchReason = 'metadata'; }
        else if (subscription.items.data.some((i: any) => i.price.product.name?.toLowerCase().includes('enterprise'))) { detectedTier = 'enterprise'; matchReason = 'name_contains'; }
        else if (subscription.items.data.some((i: any) => (i.price.unit_amount || 0) > 0)) { detectedTier = 'enterprise'; matchReason = 'paid_fallback'; }
        
        if (matchReason !== 'none') debugInfo.steps.push("Fallback aplicado: " + matchReason);
    }

    debugInfo.match_result = {
        detected_tier: detectedTier,
        match_method: matchReason
    };

    // Atualiza banco se necessário
    if (clinicData?.subscription_tier !== detectedTier) {
        await supabaseAdmin.from('clinics').update({ 
            subscription_tier: detectedTier,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id
        }).eq('id', user.id);
        debugInfo.steps.push("Banco de dados atualizado");
    }

    return new Response(JSON.stringify({ 
        subscribed: true, 
        tier: detectedTier, 
        updated: true,
        debug: debugInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
        error: error.message,
        debug: { message: "Erro fatal na função", errorStack: error.stack }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Retorna 200 mesmo com erro para o frontend ler o debug
    });
  }
});
