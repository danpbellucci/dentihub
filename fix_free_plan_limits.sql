
-- ============================================================================
-- SCRIPT DE CORREÇÃO: LIMITES DO PLANO FREE
-- ============================================================================
-- Este script atualiza todas as clínicas que estão no plano 'free'
-- mas possuem colunas de limite como NULL (causando exibição de infinito).
-- Ele pega os valores corretos da tabela de planos.

UPDATE public.clinics c
SET
    custom_dentist_limit = p.max_dentists,
    custom_clients_limit = p.max_patients,
    custom_ai_daily_limit = p.max_ai_usage
FROM public.subscription_plans p
WHERE 
    c.subscription_tier = 'free' 
    AND p.slug = 'free'
    AND (
        c.custom_dentist_limit IS NULL OR 
        c.custom_clients_limit IS NULL OR 
        c.custom_ai_daily_limit IS NULL
    );

-- Opcional: Se quiser garantir que planos 'starter' e 'pro' também estejam sincronizados:
/*
UPDATE public.clinics c
SET
    custom_dentist_limit = p.max_dentists,
    custom_clients_limit = p.max_patients,
    custom_ai_daily_limit = p.max_ai_usage
FROM public.subscription_plans p
WHERE 
    c.subscription_tier = p.slug
    AND c.subscription_tier IN ('starter', 'pro')
    AND c.is_manual_override = FALSE;
*/
