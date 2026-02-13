
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.18.0?target=deno&no-check'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');

  if (!signingSecret) {
    console.error("❌ ERRO CRÍTICO: STRIPE_WEBHOOK_SIGNING_SECRET não configurada.");
    return new Response('Webhook Secret not configured', { status: 500 });
  }

  if (!signature) {
    console.error("❌ ERRO: Cabeçalho Stripe-Signature ausente.");
    return new Response('Signature missing', { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let event;

  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      signingSecret
    );
  } catch (err: any) {
    console.error(`❌ Erro de Assinatura do Webhook: ${err.message}`);
    return new Response(`Webhook Signature Error: ${err.message}`, { status: 400 });
  }

  console.log(`🔔 Evento Recebido: ${event.type} | ID: ${event.id}`);

  try {
    // FUNÇÃO AUXILIAR PARA DETERMINAR O PLANO (TIER) A PARTIR DO PRICE ID
    const getTierFromPriceId = async (priceId: string, subscription?: any): Promise<string> => {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('slug')
            .or(`stripe_price_id.eq.${priceId},stripe_dentist_price_id.eq.${priceId},stripe_ai_price_id.eq.${priceId}`)
            .maybeSingle();
        
        if (data) return data.slug;

        // --- FALLBACK PARA PLANOS CUSTOMIZADOS (NÃO MAPEADOS NO DB) ---
        // Se o banco não achou, mas temos a assinatura, tentamos inferir
        if (subscription) {
            // 1. Metadados explícitos
            if (subscription.metadata?.isEnterprise === 'true' || subscription.metadata?.customDentistLimit) {
                return 'enterprise';
            }
            // 2. Valor > 0 (Qualquer plano pago não mapeado vira Enterprise por segurança)
            // (Para evitar travar o cliente em Free se ele pagou)
            const amount = subscription.items?.data?.[0]?.price?.unit_amount || 0;
            if (amount > 0) {
                return 'enterprise'; 
            }
        }
        
        return 'free';
    };

    const updateUserTier = async (userId: string | undefined, customerId: string, subscriptionId: string, priceId: string, stripeCustomerEmail?: string, customLimits?: any, subscriptionObj?: any) => {
        // Passa o objeto subscription completo para o fallback logic
        const tier = await getTierFromPriceId(priceId, subscriptionObj);
        
        console.log(`Processando atualização: Customer ${customerId} -> Plano ${tier} (Price: ${priceId})`);

        // 1. Tenta encontrar usuário pelo ID nos metadados
        if (!userId) {
            const { data } = await supabase.from('clinics').select('id').eq('stripe_customer_id', customerId).maybeSingle();
            if (data) userId = data.id;
        }

        // 2. Se não achou por ID/StripeID, tenta pelo e-mail do Stripe
        if (!userId && stripeCustomerEmail) {
            const { data } = await supabase.from('clinics').select('id').eq('email', stripeCustomerEmail).maybeSingle();
            if (data) userId = data.id;
        }

        if (userId) {
            // Verifica se tem TRAVA MANUAL (Override) antes de alterar via Webhook
            const { data: currentClinic } = await supabase.from('clinics').select('subscription_tier, email, is_manual_override').eq('id', userId).single();
            
            if (currentClinic?.is_manual_override) {
                console.log(`🔒 Usuário ${userId} possui TRAVA MANUAL. Ignorando atualização automática do Webhook.`);
                return;
            }

            const targetEmail = currentClinic?.email || stripeCustomerEmail;

            const updatePayload: any = {
                subscription_tier: tier,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId
            };

            if (tier === 'enterprise' || customLimits?.customDentistLimit || customLimits?.customAiDailyLimit) {
                if (customLimits?.customDentistLimit) updatePayload.custom_dentist_limit = Number(customLimits.customDentistLimit);
                if (customLimits?.customAiDailyLimit) updatePayload.custom_ai_daily_limit = Number(customLimits.customAiDailyLimit);
            } else {
                updatePayload.custom_dentist_limit = null;
                updatePayload.custom_ai_daily_limit = null;
            }

            const { error } = await supabase.from('clinics').update(updatePayload).eq('id', userId);

            if (error) {
                console.error(`❌ Erro ao atualizar banco: ${error.message}`);
                throw error;
            }
            console.log(`✅ Sucesso! Usuário ${userId} atualizado para ${tier}.`);

            // ENVIO DE E-MAIL CONFIRMAÇÃO (Apenas se mudou de Free para Pago)
            if (tier !== 'free' && currentClinic?.subscription_tier === 'free') {
                if (targetEmail) {
                    const { data: planData } = await supabase.from('subscription_plans').select('name').eq('slug', tier).maybeSingle();
                    const planDisplay = planData?.name || tier.charAt(0).toUpperCase() + tier.slice(1);
                    
                    try {
                        await fetch(`${supabaseUrl}/functions/v1/send-emails`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${serviceRoleKey}`
                            },
                            body: JSON.stringify({
                                type: 'subscription_success',
                                recipients: [{ email: targetEmail }],
                                planName: planDisplay
                            })
                        });
                    } catch (emailErr) {
                        console.error("❌ Exceção ao enviar e-mail de plano:", emailErr);
                    }
                }
            }

        } else {
            console.warn(`⚠️ ALERTA: Usuário não identificado para o Customer ${customerId}`);
        }
    };

    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        if (invoice.subscription) {
            const subscriptionId = invoice.subscription as string;
            const customerId = invoice.customer as string;
            const customerEmail = invoice.customer_email || undefined;
            
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const userId = subscription.metadata?.supabaseUUID;
            const customLimits = {
                customDentistLimit: subscription.metadata?.customDentistLimit,
                customAiDailyLimit: subscription.metadata?.customAiDailyLimit
            };
            const priceId = subscription.items.data[0].price.id;

            await updateUserTier(userId, customerId, subscriptionId, priceId, customerEmail, customLimits, subscription);
        }
    }
    else if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.supabaseUUID;
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;
      const customerEmail = session.customer_details?.email || undefined;
      
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const customLimits = {
          customDentistLimit: subscription.metadata?.customDentistLimit,
          customAiDailyLimit: subscription.metadata?.customAiDailyLimit
      };
      const priceId = subscription.items.data[0].price.id;

      await updateUserTier(userId, customerId, subscriptionId, priceId, customerEmail, customLimits, subscription);
    }
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      
      const { data: user } = await supabase.from('clinics').select('id, is_manual_override').eq('stripe_customer_id', customerId).maybeSingle();
      
      if (user && !user.is_manual_override) {
          await supabase.from('clinics')
            .update({ 
                subscription_tier: 'free',
                custom_dentist_limit: null,
                custom_ai_daily_limit: null
            })
            .eq('id', user.id);
          console.log(`✅ Usuário ${user.id} revertido para FREE.`);
      } else if (user?.is_manual_override) {
          console.log(`🔒 Usuário ${user.id} tem override manual. Ignorando cancelamento do Stripe.`);
      }
    }
    else if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        if (subscription.status === 'active' || subscription.status === 'trialing') {
            const priceId = subscription.items.data[0].price.id;
            const customerId = subscription.customer as string;
            const userId = subscription.metadata?.supabaseUUID;
            const customLimits = {
                customDentistLimit: subscription.metadata?.customDentistLimit,
                customAiDailyLimit: subscription.metadata?.customAiDailyLimit
            };
            
            let customerEmail;
            try {
                const customer = await stripe.customers.retrieve(customerId);
                if (!customer.deleted) customerEmail = customer.email || undefined;
            } catch (e) {}

            await updateUserTier(userId, customerId, subscription.id, priceId, customerEmail, customLimits, subscription);
        }
    }

    return new Response(JSON.stringify({ received: true }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error(`❌ Erro de Lógica no Webhook: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
    });
  }
});
