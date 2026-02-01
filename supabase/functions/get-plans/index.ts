
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = ['http://localhost:5173', 'https://dentihub.com.br', 'https://app.dentihub.com.br'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
        throw new Error("STRIPE_SECRET_KEY is not set");
    }

    let priceIds;
    try {
        const body = await req.json();
        priceIds = body.priceIds;
    } catch (e) {
        throw new Error("Invalid JSON body");
    }
    
    if (!priceIds || !Array.isArray(priceIds)) {
        throw new Error("priceIds array is required");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const pricePromises = priceIds.map(id => stripe.prices.retrieve(id));
    const prices = await Promise.all(pricePromises);

    const result = {};

    prices.forEach(price => {
        const amount = (price.unit_amount || 0) / 100;
        let locale = 'pt-BR';
        if (price.currency.toLowerCase() === 'usd') locale = 'en-US';
        if (price.currency.toLowerCase() === 'eur') locale = 'de-DE';

        const formatted = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: price.currency,
        }).format(amount);

        result[price.id] = {
            amount: amount,
            currency: price.currency,
            formatted: formatted,
            interval: price.recurring?.interval || 'mês'
        };
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
