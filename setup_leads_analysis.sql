
-- ============================================================================
-- RPC: ANÁLISE DE CONVERSÃO DE LEADS
-- ============================================================================
-- Retorna todos os leads e verifica se existe um usuário correspondente.

CREATE OR REPLACE FUNCTION public.get_leads_analysis()
RETURNS TABLE (
    id UUID,
    email TEXT,
    source TEXT,
    created_at TIMESTAMPTZ,
    has_account BOOLEAN,
    clinic_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Roda como admin para ver tabelas protegidas
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.email,
        l.source,
        l.created_at,
        EXISTS(SELECT 1 FROM public.user_profiles up WHERE up.email = l.email) as has_account,
        (
            SELECT c.name 
            FROM public.user_profiles up 
            JOIN public.clinics c ON c.id = up.clinic_id 
            WHERE up.email = l.email 
            LIMIT 1
        ) as clinic_name
    FROM 
        public.leads l
    ORDER BY 
        l.created_at DESC;
END;
$$;

-- Concede permissão de execução
GRANT EXECUTE ON FUNCTION public.get_leads_analysis TO authenticated;
