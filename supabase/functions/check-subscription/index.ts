
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
    
    // Obter dados da clínica
    const { data: clinicData } = await supabaseAdmin
        .from('clinics')
        .select('subscription_tier, bonus_expires_at, is_manual_override')
        .eq('id', user.id)
        .single();

    // 0. VERIFICAÇÃO DE OVERRIDE MANUAL (PRIORIDADE MÁXIMA)
    if (clinicData?.is_manual_override) {
        return new Response(JSON.stringify({ 
            subscribed: true, 
            tier: clinicData.subscription_tier, 
            source: 'admin_override'
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }

    // 1. Verificar Bônus de Indicação
    if (clinicData?.bonus_expires_at) {
        const bonusDate = new Date(clinicData.bonus_expires_at);
        if (bonusDate > new Date()) {
            return new Response(JSON.stringify({ 
                subscribed: true, 
                tier: clinicData.subscription_tier, 
                source: 'referral_bonus',
                expires_at: clinicData.bonus_expires_at
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }
    }

    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // 2. Busca Clientes no Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      if (clinicData?.subscription_tier !== 'free') {
          await supabaseAdmin.from('clinics').update({ subscription_tier: 'free' }).eq('id', user.id);
      }
      return new Response(JSON.stringify({ subscribed: false, tier: 'free' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    
    // 3. Busca Assinaturas Ativas
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
      expand: ['data.items.data.price']
    });

    if (subscriptions.data.length === 0) {
        // Verifica se tem trialing (período de teste)
        const trials = await stripe.subscriptions.list({
            customer: customerId,
            status: "trialing",
            limit: 1,
            expand: ['data.items.data.price']
        });

        if (trials.data.length === 0) {
            if (clinicData?.subscription_tier !== 'free') {
                await supabaseAdmin.from('clinics').update({ subscription_tier: 'free' }).eq('id', user.id);
            }
            return new Response(JSON.stringify({ subscribed: false, tier: 'free' }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }
        // Se encontrou trial, usa ele
        subscriptions.data = trials.data;
    }

    const subscription = subscriptions.data[0];
    
    // 4. Detecção de Plano Robusta (Multi-item Enterprise support)
    // Coleta todos os Price IDs e Product IDs da assinatura
    const priceIds = subscription.items.data.map((item: any) => item.price.id);
    const productIds = subscription.items.data.map((item: any) => item.price.product as string);
    
    // Busca no banco qual plano corresponde a ALGUM desses IDs
    // Enterprise terá múltiplos itens, mas se um deles bater com os IDs cadastrados, encontramos o plano.
    const { data: matchedPlan } = await supabaseAdmin
        .from('subscription_plans')
        .select('slug')
        .or(`stripe_price_id.in.(${priceIds.join(',')}),stripe_product_id.in.(${productIds.join(',')}),stripe_dentist_price_id.in.(${priceIds.join(',')}),stripe_ai_price_id.in.(${priceIds.join(',')})`)
        .limit(1)
        .maybeSingle();

    const detectedTier = matchedPlan ? matchedPlan.slug : 'free';

    // 5. Atualiza o banco se houver discrepância
    if (clinicData?.subscription_tier !== detectedTier) {
        console.log(`[Check-Sub] Updating tier for user ${user.id}: ${clinicData?.subscription_tier} -> ${detectedTier}`);
        await supabaseAdmin.from('clinics').update({ 
            subscription_tier: detectedTier,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            // Atualiza limites customizados se disponíveis nos metadados
            custom_dentist_limit: subscription.metadata?.customDentistLimit ? Number(subscription.metadata.customDentistLimit) : null,
            custom_ai_daily_limit: subscription.metadata?.customAiDailyLimit ? Number(subscription.metadata.customAiDailyLimit) : null
        }).eq('id', user.id);
    }

    return new Response(JSON.stringify({ subscribed: true, tier: detectedTier, updated: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Check-sub Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Retorna 200 com erro para não quebrar o frontend
    });
  }
});
