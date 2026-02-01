
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-PRICES] ${step}${detailsStr}`);
};

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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { price_ids } = await req.json();
    if (!price_ids || !Array.isArray(price_ids)) {
      throw new Error("price_ids array is required");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const prices: Record<string, { amount: number; currency: string }> = {};
    
    for (const priceId of price_ids) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        prices[priceId] = {
          amount: price.unit_amount ? price.unit_amount / 100 : 0,
          currency: price.currency,
        };
      } catch (err) {
        logStep("Error fetching price", { priceId, error: err.message });
        prices[priceId] = { amount: 0, currency: 'brl' };
      }
    }

    return new Response(JSON.stringify({ prices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
