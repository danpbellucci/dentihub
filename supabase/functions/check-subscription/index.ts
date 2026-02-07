
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const TIER_MAPPING = {
  'price_1SlMYr2Obfcu36b5HzK9JQPO': 'starter',
  'price_1SlEBs2Obfcu36b5HrWAo2Fh': 'pro',
  'prod_TifWKWr1WU3XbW': 'starter',
  'prod_TifWS13bkpeoaA': 'pro',
  'price_1SrN3I2Obfcu36b5MmVEv6qq': 'starter'
};

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
    
    // Obter dados da clínica, incluindo a nova flag 'is_manual_override'
    const { data: clinicData } = await supabaseAdmin
        .from('clinics')
        .select('subscription_tier, bonus_expires_at, is_manual_override')
        .eq('id', user.id)
        .single();

    // 0. VERIFICAÇÃO DE OVERRIDE MANUAL (PRIORIDADE MÁXIMA)
    // Se um Super Admin definiu o plano manualmente, ignoramos o Stripe.
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

    // 1. Verificar Bônus de Indicação (Prioridade Alta)
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    // Se não tem customer no Stripe, é Free
    if (customers.data.length === 0) {
      if (clinicData?.subscription_tier !== 'free') {
          // Reverter para free se não tiver bônus ativo nem override
          await supabaseAdmin.from('clinics').update({ subscription_tier: 'free' }).eq('id', user.id);
      }
      return new Response(JSON.stringify({ subscribed: false, tier: 'free' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
      expand: ['data.items.data.price']
    });

    if (subscriptions.data.length === 0) {
      if (clinicData?.subscription_tier !== 'free') {
          await supabaseAdmin.from('clinics').update({ subscription_tier: 'free' }).eq('id', user.id);
      }
      return new Response(JSON.stringify({ subscribed: false, tier: 'free' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    const productId = subscription.items.data[0].price.product as string;
    
    const detectedTier = TIER_MAPPING[priceId] || TIER_MAPPING[productId] || 'free';

    // Atualiza apenas se mudou ou para garantir sincronia
    if (clinicData?.subscription_tier !== detectedTier) {
        await supabaseAdmin.from('clinics').update({ 
            subscription_tier: detectedTier,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id
        }).eq('id', user.id);
    }

    return new Response(JSON.stringify({ subscribed: true, tier: detectedTier, updated: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
