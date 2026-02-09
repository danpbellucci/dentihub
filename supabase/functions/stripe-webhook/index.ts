
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// Mapeamento de Price ID para Nome do Plano
const PRICE_ID_TO_TIER: Record<string, string> = {
  // IDs Reais (Produção)
  'price_1SlMYr2Obfcu36b5HzK9JQPO': 'starter', 
  'price_1SlEBs2Obfcu36b5HrWAo2Fh': 'pro',
  // Enterprise
  'price_1SykFl2Obfcu36b5rdtYse4m': 'enterprise', 
  'price_1SykGo2Obfcu36b5TmDgIM4d': 'enterprise',
  // Legacy / Teste
  'price_1SrN3I2Obfcu36b5MmVEv6qq': 'starter' 
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
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

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
    // Retorna 400 para o Stripe saber que a assinatura falhou (não tente reenviar se a chave estiver errada)
    return new Response(`Webhook Signature Error: ${err.message}`, { status: 400 });
  }

  console.log(`🔔 Evento Recebido: ${event.type} | ID: ${event.id}`);

  try {
    // FUNÇÃO AUXILIAR PARA ATUALIZAR USUÁRIO
    const updateUserTier = async (userId: string | undefined, customerId: string, subscriptionId: string, priceId: string, customerEmail?: string, customLimits?: any) => {
        const tier = PRICE_ID_TO_TIER[priceId] || 'free';
        console.log(`Processando atualização: Customer ${customerId} -> Plano ${tier}`);

        // 1. Tenta achar pelo User ID (Metadados)
        if (userId) {
             console.log(`Localizado via Metadata: User ID ${userId}`);
        }

        // 2. Se não achou, tenta pelo Customer ID na tabela clinics
        if (!userId) {
            const { data } = await supabase.from('clinics').select('id').eq('stripe_customer_id', customerId).maybeSingle();
            if (data) {
                userId = data.id;
                console.log(`Localizado via Stripe Customer ID: User ID ${userId}`);
            }
        }

        // 3. Fallback: Tenta pelo E-mail
        if (!userId && customerEmail) {
            const { data } = await supabase.from('clinics').select('id').eq('email', customerEmail).maybeSingle();
            if (data) {
                userId = data.id;
                console.log(`Localizado via E-mail (${customerEmail}): User ID ${userId}`);
            }
        }

        if (userId) {
            const updatePayload: any = {
                subscription_tier: tier,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId
            };

            // Atualiza limites customizados se for Enterprise e vier nos metadados
            if (tier === 'enterprise' && customLimits) {
                if (customLimits.customDentistLimit) updatePayload.custom_dentist_limit = Number(customLimits.customDentistLimit);
                if (customLimits.customAiDailyLimit) updatePayload.custom_ai_daily_limit = Number(customLimits.customAiDailyLimit);
            } else if (tier !== 'enterprise') {
                // Limpa custom limits se mudar de plano
                updatePayload.custom_dentist_limit = null;
                updatePayload.custom_ai_daily_limit = null;
            }

            const { error } = await supabase.from('clinics').update(updatePayload).eq('id', userId);

            if (error) {
                console.error(`❌ Erro ao atualizar banco: ${error.message}`);
                throw error;
            }
            console.log(`✅ Sucesso! Usuário ${userId} atualizado para ${tier}.`);
        } else {
            console.warn(`⚠️ ALERTA: Usuário não identificado para o Customer ${customerId} / Email ${customerEmail}`);
        }
    };

    // CENÁRIO A: Pagamento de Assinatura (Elements / Renovação)
    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
            const subscriptionId = invoice.subscription as string;
            const customerId = invoice.customer as string;
            const customerEmail = invoice.customer_email || undefined;
            
            // Busca detalhes extras da assinatura para garantir o priceId correto e metadados
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const userId = subscription.metadata?.supabaseUUID;
            const customLimits = {
                customDentistLimit: subscription.metadata?.customDentistLimit,
                customAiDailyLimit: subscription.metadata?.customAiDailyLimit
            };
            const priceId = subscription.items.data[0].price.id;

            await updateUserTier(userId, customerId, subscriptionId, priceId, customerEmail, customLimits);
        }
    }

    // CENÁRIO B: Checkout Session
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

      await updateUserTier(userId, customerId, subscriptionId, priceId, customerEmail, customLimits);
    }

    // CENÁRIO C: Assinatura Cancelada
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      
      console.log(`Assinatura cancelada para Customer ${customerId}`);
      // Busca o usuário antes para logar
      const { data: user } = await supabase.from('clinics').select('id').eq('stripe_customer_id', customerId).maybeSingle();
      
      if (user) {
          await supabase.from('clinics')
            .update({ 
                subscription_tier: 'free',
                custom_dentist_limit: null,
                custom_ai_daily_limit: null
            })
            .eq('id', user.id);
          console.log(`✅ Usuário ${user.id} revertido para FREE.`);
      } else {
          console.warn(`⚠️ Usuário não encontrado para cancelamento (Customer ${customerId})`);
      }
    }

    // CENÁRIO D: Atualização de Assinatura
    else if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        
        // Só processa se não for cancelamento (status active ou trialing)
        if (subscription.status === 'active' || subscription.status === 'trialing') {
            const priceId = subscription.items.data[0].price.id;
            const customerId = subscription.customer as string;
            const userId = subscription.metadata?.supabaseUUID;
            const customLimits = {
                customDentistLimit: subscription.metadata?.customDentistLimit,
                customAiDailyLimit: subscription.metadata?.customAiDailyLimit
            };
            
            // Tenta buscar email do customer se não vier no objeto subscription
            let customerEmail;
            try {
                const customer = await stripe.customers.retrieve(customerId);
                if (!customer.deleted) {
                    customerEmail = customer.email || undefined;
                }
            } catch (e) {}

            await updateUserTier(userId, customerId, subscription.id, priceId, customerEmail, customLimits);
        }
    }

    return new Response(JSON.stringify({ received: true }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error(`❌ Erro de Lógica no Webhook: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, // Stripe tentará novamente
        headers: { 'Content-Type': 'application/json' } 
    });
  }
});
