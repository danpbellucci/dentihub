
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@11.18.0?target=deno&no-check";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// Helper para hierarquia de planos
const getTierWeight = (tier: string) => {
    switch (tier) {
        case 'enterprise': return 3;
        case 'pro': return 2;
        case 'starter': return 1;
        default: return 0;
    }
};

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
        throw new Error("Configuração de servidor incompleta.");
    }

    // Cliente Admin para ignorar RLS e buscar dados globais da clínica
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Identificar o usuário logado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Token ausente");
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user || !user.email) {
        throw new Error("Usuário não autenticado.");
    }

    // 2. Descobrir a Clínica e o Admin mais antigo (Billing Email)
    // Busca o perfil do usuário para saber a clínica
    const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single();

    if (!userProfile?.clinic_id) {
        throw new Error("Usuário não vinculado a uma clínica.");
    }

    const clinicId = userProfile.clinic_id;

    // Busca o e-mail do administrador mais antigo dessa clínica (Billing Contact)
    const { data: billingAdmin } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('clinic_id', clinicId)
        .eq('role', 'administrator')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

    const targetEmail = billingAdmin?.email || user.email; // Fallback para o usuário atual se falhar

    // Busca dados atuais da clínica para comparação
    const { data: clinicData } = await supabaseAdmin
        .from('clinics')
        .select('subscription_tier, stripe_customer_id, stripe_subscription_id, is_manual_override')
        .eq('id', clinicId)
        .single();

    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // FIX: Estrutura inicial do debug
    let debugInfo: any = {
        targetEmail,
        clinicId,
        database_record: {
            found: !!clinicData,
            stripe_customer_id: clinicData?.stripe_customer_id || 'NULL',
            stripe_subscription_id: clinicData?.stripe_subscription_id || 'NULL',
            current_tier: clinicData?.subscription_tier || 'N/A'
        },
        stripe_customers_found: 0,
        subscriptions_found: [],
        winner_tier: 'free',
        product_lookups: 0
    };

    // 3. Buscar Customers no Stripe pelo E-mail
    const customers = await stripe.customers.list({ 
        email: targetEmail, 
        limit: 10 
    });

    debugInfo.stripe_customers_found = customers.data.length;

    let allSubscriptions: any[] = [];

    // Varre todos os customers encontrados para esse email
    for (const customer of customers.data) {
        // Reduzida a profundidade de expansão para evitar erro (max 4 levels)
        const subs = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active', // Apenas ativas ou trialing
            expand: ['data.items.data.price'],
            limit: 100
        });
        
        const allSubs = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            expand: ['data.items.data.price'],
            limit: 10
        });

        const activeOrTrialing = allSubs.data.filter((s: any) => s.status === 'active' || s.status === 'trialing');
        
        // Merge evitando duplicatas
        const existingIds = new Set(subs.data.map((s: any) => s.id));
        const extras = activeOrTrialing.filter((s: any) => !existingIds.has(s.id));
        
        allSubscriptions = [...allSubscriptions, ...subs.data, ...extras];
    }

    // 4. Determinar o "Winning Tier" (Hierarquia)
    let winnerSub: any = null;
    let winnerTier = 'free';
    let maxWeight = 0;

    // Busca planos do banco para fazer o match de IDs
    const { data: dbPlans } = await supabaseAdmin.from('subscription_plans').select('*');
    
    // Cache para evitar requisições repetidas ao Stripe para o mesmo produto
    const productCache: Record<string, any> = {};

    for (const sub of allSubscriptions) {
        let detectedTier = 'free';
        const priceId = sub.items.data[0]?.price?.id;
        
        let productId = sub.items.data[0]?.price?.product;
        if (typeof productId === 'object' && productId !== null) {
             productId = productId.id;
        }

        // Match com Banco de Dados
        if (dbPlans) {
            const matched = dbPlans.find((p: any) => 
                p.stripe_price_id === priceId || 
                (productId && p.stripe_product_id === productId) ||
                p.stripe_dentist_price_id === priceId
            );
            if (matched) detectedTier = matched.slug;
        }

        // Fallback por Metadata ou Nome (Enterprise)
        if (detectedTier === 'free') {
            // 1. Verifica Metadata na Assinatura
            if (sub.metadata?.isEnterprise === 'true') {
                detectedTier = 'enterprise';
            } 
            // 2. Se não achou e tem productId, busca o produto no Stripe
            else if (productId && (sub.status === 'active' || sub.status === 'trialing')) {
                let productName = '';
                
                if (productCache[productId]) {
                    productName = productCache[productId].name;
                } else {
                    try {
                        const product = await stripe.products.retrieve(productId);
                        productCache[productId] = product;
                        productName = product.name;
                        debugInfo.product_lookups++;
                    } catch (e) {
                        console.error("Erro ao buscar produto:", productId);
                    }
                }

                if (productName && productName.toLowerCase().includes('enterprise')) {
                    detectedTier = 'enterprise';
                }
            }
        }

        const weight = getTierWeight(detectedTier);
        
        debugInfo.subscriptions_found.push({
            id: sub.id,
            status: sub.status,
            detected_tier: detectedTier,
            weight,
            price_id: priceId
        });

        // Lógica de Vencedor
        if (weight > maxWeight) {
            maxWeight = weight;
            winnerTier = detectedTier;
            winnerSub = sub;
        } else if (weight === maxWeight && weight > 0) {
            // Desempate: Assinatura mais recente
            if (!winnerSub || sub.created > winnerSub.created) {
                winnerSub = sub;
                winnerTier = detectedTier;
            }
        }
    }

    debugInfo.winner_tier = winnerTier;
    debugInfo.winner_sub_id = winnerSub?.id || null;

    // 5. Atualizar Banco de Dados
    let updated = false;

    const needsUpdate = 
        clinicData.subscription_tier !== winnerTier || 
        (winnerSub && clinicData.stripe_subscription_id !== winnerSub.id);

    if (needsUpdate) {
        if (!clinicData.is_manual_override) {
            const updatePayload: any = {
                subscription_tier: winnerTier,
                stripe_subscription_id: winnerSub ? winnerSub.id : null,
                stripe_customer_id: winnerSub ? winnerSub.customer : (customers.data[0]?.id || clinicData.stripe_customer_id)
            };

            if (winnerTier === 'enterprise' && winnerSub) {
                if (winnerSub.metadata?.customDentistLimit) updatePayload.custom_dentist_limit = Number(winnerSub.metadata.customDentistLimit);
                if (winnerSub.metadata?.customAiDailyLimit) updatePayload.custom_ai_daily_limit = Number(winnerSub.metadata.customAiDailyLimit);
            } else if (winnerTier !== 'enterprise') {
                updatePayload.custom_dentist_limit = null;
                updatePayload.custom_ai_daily_limit = null;
            }

            // CRITICAL FIX: Capturar erro e verificar se o update realmente ocorreu
            const { error: updateError } = await supabaseAdmin.from('clinics').update(updatePayload).eq('id', clinicId);
            
            if (updateError) {
                console.error("Erro no update:", updateError);
                debugInfo.action = `Error Updating DB: ${updateError.message}`;
            } else {
                // VERIFICAÇÃO PÓS-UPDATE (Leitura Real)
                const { data: verifiedData } = await supabaseAdmin
                    .from('clinics')
                    .select('subscription_tier, stripe_subscription_id')
                    .eq('id', clinicId)
                    .single();
                
                if (verifiedData?.subscription_tier === winnerTier) {
                    updated = true;
                    debugInfo.action = "Database Updated & Verified";
                    
                    // Atualiza o display object APENAS se o banco realmente mudou
                    debugInfo.database_record.current_tier = verifiedData.subscription_tier;
                    debugInfo.database_record.stripe_subscription_id = verifiedData.stripe_subscription_id;
                    debugInfo.database_record.note = '(Atualizado e Verificado)';
                } else {
                    debugInfo.action = "Update Executed but Value Mismatch (Check Triggers/RLS)";
                    debugInfo.db_actual_value = verifiedData?.subscription_tier;
                }
            }

        } else {
            debugInfo.action = "Skipped (Manual Override Active)";
        }
    } else {
        debugInfo.action = "No Update Needed";
    }

    return new Response(JSON.stringify({ 
        updated,
        tier: winnerTier,
        debug: debugInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
