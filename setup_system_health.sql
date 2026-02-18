
-- ============================================================================
-- GOD MODE: SYSTEM HEALTH & FINANCIAL INTELLIGENCE
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_system_health();

CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS TABLE (
    -- Métricas de Atividade Recente (Para detectar falhas)
    last_appointment_at TIMESTAMPTZ,
    last_patient_at TIMESTAMPTZ,
    last_record_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    
    -- Métricas de Erro (Hoje)
    errors_today BIGINT,
    
    -- Métricas Financeiras (MRR Estimado)
    active_clinics BIGINT,
    mrr_estimate NUMERIC,
    
    -- Crescimento (Mês atual)
    new_clinics_month BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_starter_price NUMERIC := 100.00;
    v_pro_price NUMERIC := 300.00;
    v_enterprise_base NUMERIC := 500.00; -- Estimativa média
BEGIN
    RETURN QUERY
    SELECT
        -- 1. Últimos registros (Heartbeat)
        (SELECT created_at FROM appointments ORDER BY created_at DESC LIMIT 1) as last_appointment_at,
        (SELECT created_at FROM clients ORDER BY created_at DESC LIMIT 1) as last_patient_at,
        (SELECT created_at FROM clinical_records ORDER BY created_at DESC LIMIT 1) as last_record_at,
        (
            SELECT s.created_at 
            FROM auth.sessions s
            JOIN auth.users u ON s.user_id = u.id
            WHERE u.email NOT IN (SELECT email FROM public.super_admins)
            ORDER BY s.created_at DESC 
            LIMIT 1
        ) as last_login_at,
        
        -- 2. Erros nas Edge Functions (Hoje)
        (SELECT count(*) FROM edge_function_logs WHERE status != 'success' AND created_at > CURRENT_DATE)::BIGINT as errors_today,
        
        -- 3. Financeiro
        (SELECT count(*) FROM clinics) as active_clinics,
        (
            SELECT SUM(
                CASE 
                    WHEN subscription_tier = 'starter' THEN v_starter_price
                    WHEN subscription_tier = 'pro' THEN v_pro_price
                    WHEN subscription_tier = 'enterprise' THEN v_enterprise_base
                    ELSE 0
                END
            )
            FROM clinics
        ) as mrr_estimate,
        
        -- 4. Crescimento
        (SELECT count(*) FROM clinics WHERE created_at >= date_trunc('month', CURRENT_DATE)) as new_clinics_month;
END;
$$;

-- Concede permissão
GRANT EXECUTE ON FUNCTION public.get_system_health TO authenticated;
