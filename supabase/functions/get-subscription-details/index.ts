
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseAnonKey) {
        throw new Error("Configuração do servidor incompleta.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Usuário inválido");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

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

    const sub = subscriptions.data[0];
    const price = sub.items.data[0].price;
    const unitAmount = price.unit_amount || 0;

    // Lógica ajustada: Starter (100 cents = R$ 1), Pro (200 cents = R$ 2)
    // Se > 150 cents, é Pro. Se <= 150, é Starter (assumindo que só existem esses dois pagos principais além do Enterprise)
    const planName = 'DentiHub ' + (unitAmount > 150 ? 'Pro' : 'Starter');

    const details = {
        hasSubscription: true,
        id: sub.id,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        amount: unitAmount / 100,
        currency: price.currency,
        interval: price.recurring?.interval,
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
