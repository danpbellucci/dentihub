
-- ============================================================================
-- CORREÇÃO DE ERRO: CLINIC_ID AMBÍGUO NO RADAR DE CHURN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_at_risk_clinics()
RETURNS TABLE (
    clinic_id UUID,
    clinic_name TEXT,
    owner_name TEXT,
    owner_email TEXT,
    owner_phone TEXT,
    days_inactive INT,
    last_login TIMESTAMPTZ,
    subscription_tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        up.email as owner_name, 
        up.email,
        c.whatsapp,
        EXTRACT(DAY FROM (NOW() - COALESCE(latest_session.last_seen, c.created_at)))::INT as days_inactive,
        COALESCE(latest_session.last_seen, c.created_at) as last_login,
        c.subscription_tier
    FROM public.clinics c
    JOIN public.user_profiles up ON up.clinic_id = c.id AND up.role = 'administrator'
    -- FIX: Alias 'a' para a tabela appointments dentro do LATERAL JOIN
    -- Isso resolve a ambiguidade com up.clinic_id que está disponível no escopo lateral
    LEFT JOIN LATERAL (
        SELECT a.created_at as last_seen 
        FROM public.appointments a
        WHERE a.clinic_id = c.id 
        ORDER BY a.created_at DESC 
        LIMIT 1
    ) latest_session ON true
    WHERE 
        -- FIX: Alias explícito na subquery também para segurança
        c.id NOT IN (SELECT up_inner.clinic_id FROM public.user_profiles up_inner WHERE up_inner.email = '[SEU_EMAIL_ADMIN]')
        AND (
            latest_session.last_seen < NOW() - INTERVAL '7 days' 
            OR latest_session.last_seen IS NULL 
        )
    ORDER BY days_inactive DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_at_risk_clinics TO authenticated;
