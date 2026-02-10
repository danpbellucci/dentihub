
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // BLOQUEIO DE SEGURANÇA RIGOROSO
  if (!origin || !allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ error: "Acesso negado: Origem não autorizada." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        throw new Error("Configuração do servidor incompleta (Chaves ausentes).");
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        throw new Error("Corpo da requisição inválido.");
    }

    const { subscriptionId } = body;
    if (!subscriptionId) {
        throw new Error("ID da assinatura é obrigatório.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        throw new Error("Token de autorização ausente.");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
        throw new Error("Usuário não autenticado.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });

    try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub.status === 'canceled') {
             return new Response(JSON.stringify({ 
                success: true, 
                message: "Assinatura já estava cancelada.",
                status: sub.status
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
        }
    } catch (err) {
        throw new Error("Assinatura não encontrada no sistema de pagamentos.");
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
    });

    // Enviar E-mail de Feedback
    try {
        await fetch(`${supabaseUrl}/functions/v1/send-emails`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
                type: 'feedback_request',
                recipients: [{ email: user.email }]
            })
        });
    } catch (emailErr) {
        console.error("Falha ao enviar email de feedback:", emailErr);
    }

    // LOG DE USO
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'cancel-subscription',
        metadata: { user_id: user.id, subscription_id: subscriptionId },
        status: 'success'
    });

    return new Response(JSON.stringify({ 
        success: true, 
        cancel_at: new Date(subscription.cancel_at! * 1000).toISOString(),
        status: subscription.status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro fatal:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
