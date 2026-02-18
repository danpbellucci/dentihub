
-- ============================================================================
-- FUNÇÃO DE SEGMENTAÇÃO PARA MARKETING STUDIO (GOD MODE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_clinics_by_segment(p_segment TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ,
    subscription_tier TEXT,
    detail_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. CLÍNICAS COM CADASTRO INCOMPLETO (Sem endereço ou cidade)
    IF p_segment = 'incomplete_profile' THEN
        RETURN QUERY
        SELECT 
            c.id, c.name, c.email, c.created_at, c.subscription_tier::TEXT,
            'Faltando endereço ou localização' as detail_reason
        FROM clinics c
        WHERE (c.address IS NULL OR c.address = '' OR c.city IS NULL OR c.city = '')
        AND c.name != 'Minha Clínica';

    -- 2. CLÍNICAS SEM DENTISTAS CADASTRADOS
    ELSIF p_segment = 'no_dentists' THEN
        RETURN QUERY
        SELECT 
            c.id, c.name, c.email, c.created_at, c.subscription_tier::TEXT,
            'Nenhum dentista cadastrado' as detail_reason
        FROM clinics c
        WHERE NOT EXISTS (SELECT 1 FROM dentists d WHERE d.clinic_id = c.id);

    -- 3. CLÍNICAS SEM NENHUM AGENDAMENTO
    ELSIF p_segment = 'no_appointments' THEN
        RETURN QUERY
        SELECT 
            c.id, c.name, c.email, c.created_at, c.subscription_tier::TEXT,
            'Agenda nunca utilizada' as detail_reason
        FROM clinics c
        WHERE NOT EXISTS (SELECT 1 FROM appointments a WHERE a.clinic_id = c.id);

    -- 4. TODOS OS ADMINISTRADORES (TODAS AS CLÍNICAS)
    ELSIF p_segment = 'all_admins' THEN
        RETURN QUERY
        SELECT 
            c.id, c.name, c.email, c.created_at, c.subscription_tier::TEXT,
            'Disparo Geral' as detail_reason
        FROM clinics c;

    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_clinics_by_segment TO authenticated;
