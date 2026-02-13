
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
    
    // 1. BUSCA DADOS DIRETAMENTE DA TABELA CLINICS
    const { data: clinicData, error: dbError } = await supabaseAdmin
        .from('clinics')
        .select('subscription_tier, stripe_customer_id, stripe_subscription_id, is_manual_override')
        .eq('id', user.id)
        .single();

    // Objeto Debug Estruturado
    let debugInfo: any = {
        userId: user.id,
        userEmail: user.email,
        database_record: {
            found: !!clinicData,
            stripe_customer_id: clinicData?.stripe_customer_id || 'NULL',
            stripe_subscription_id: clinicData?.stripe_subscription_id || 'NULL',
            current_tier: clinicData?.subscription_tier || 'N/A',
            error: dbError?.message || null
        },
        stripe_check: null,
        action_taken: 'none'
    };

    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let activeSubscription = null;
    let foundStripeSubscriptions: any[] = [];

    // 2. SE TIVER CUSTOMER ID NO BANCO, CONSULTA O STRIPE USANDO ELE
    if (clinicData?.stripe_customer_id) {
        try {
            const subs = await stripe.subscriptions.list({
                customer: clinicData.stripe_customer_id,
                status: 'all', // Pega tudo para diagnosticar (active, trialing, canceled, past_due)
                expand: ['data.items.data.price.product'],
                limit: 3
            });

            foundStripeSubscriptions = subs.data.map((s: any) => ({
                id: s.id,
                status: s.status,
                product_name: s.items?.data?.[0]?.price?.product?.name || 'Unknown'
            }));

            // Tenta encontrar uma ativa ou em trial
            activeSubscription = subs.data.find((s: any) => s.status === 'active' || s.status === 'trialing');

            debugInfo.stripe_check = {
                queried_by: 'database_customer_id',
                customer_id_used: clinicData.stripe_customer_id,
                subscriptions_found: foundStripeSubscriptions,
                active_subscription_id: activeSubscription?.id || 'NONE'
            };

        } catch (stripeErr: any) {
            debugInfo.stripe_check = { error: stripeErr.message };
        }
    } else {
        // Fallback: Se não tem ID no banco, procura por email apenas para informar no debug
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        debugInfo.stripe_check = {
            queried_by: 'email_fallback',
            message: "ID não encontrado no banco. Buscando por email...",
            customers_found_by_email: customers.data.map((c: any) => c.id)
        };
    }

    // 3. DETERMINAÇÃO DO PLANO E ATUALIZAÇÃO
    let detectedTier = 'free';
    
    // Se achamos uma assinatura ativa no Stripe para o Customer ID do banco
    if (activeSubscription) {
        // Busca planos para fazer o match
        const { data: allPlans } = await supabaseAdmin.from('subscription_plans').select('*');
        
        const subPriceIds = activeSubscription.items.data.map((item: any) => item.price.id);
        const subProductIds = activeSubscription.items.data.map((item: any) => item.price.product?.id || item.price.product).filter(Boolean);

        if (allPlans) {
            const matchedPlan = allPlans.find((plan: any) => {
                if (plan.stripe_price_id && subPriceIds.includes(plan.stripe_price_id)) return true;
                if (plan.stripe_product_id && subProductIds.includes(plan.stripe_product_id)) return true;
                if (plan.stripe_dentist_price_id && subPriceIds.includes(plan.stripe_dentist_price_id)) return true;
                if (plan.stripe_ai_price_id && subPriceIds.includes(plan.stripe_ai_price_id)) return true;
                return false;
            });
            if (matchedPlan) detectedTier = matchedPlan.slug;
        }

        // Fallback Enterprise
        if (detectedTier === 'free') {
            if (activeSubscription.metadata?.isEnterprise === 'true' || 
                activeSubscription.items.data.some((i: any) => i.price.product?.name?.toLowerCase().includes('enterprise'))) {
                detectedTier = 'enterprise';
            }
        }

        debugInfo.tier_detection = {
            resolved_tier: detectedTier,
            matched_prices: subPriceIds
        };

        // 4. ATUALIZAÇÃO DE SINCRONIA SE NECESSÁRIO
        // Se o ID da assinatura no banco for diferente do ativo no Stripe, atualiza.
        if (clinicData.stripe_subscription_id !== activeSubscription.id || clinicData.subscription_tier !== detectedTier) {
            if (!clinicData.is_manual_override) {
                await supabaseAdmin.from('clinics').update({ 
                    subscription_tier: detectedTier,
                    stripe_subscription_id: activeSubscription.id
                }).eq('id', user.id);
                debugInfo.action_taken = 'updated_database_to_match_stripe';
            } else {
                debugInfo.action_taken = 'skipped_override_active';
            }
        }
    } else {
        // Se não achou assinatura ativa para o customer ID do banco
        if (clinicData?.subscription_tier !== 'free' && !clinicData?.is_manual_override) {
             // Downgrade se não tiver override
             // Comentado por segurança para não derrubar acesso em caso de erro de API, 
             // mas em produção real deveria considerar downgrade.
             // await supabaseAdmin.from('clinics').update({ subscription_tier: 'free' }).eq('id', user.id);
             debugInfo.action_taken = 'subscription_not_found_but_kept_current_tier_safe';
        }
    }

    return new Response(JSON.stringify({ 
        subscribed: !!activeSubscription, 
        tier: detectedTier, 
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
      status: 200,
    });
  }
});
