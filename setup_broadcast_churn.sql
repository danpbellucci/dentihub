
-- ============================================================================
-- 1. SISTEMA DE BROADCAST (AVISOS GLOBAIS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'warning', 'success', 'error')) DEFAULT 'info',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- RLS: Leitura pública (para todos os users verem), Escrita apenas Super Admin
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos leem avisos ativos" ON public.system_announcements;
CREATE POLICY "Todos leem avisos ativos" ON public.system_announcements
    FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

DROP POLICY IF EXISTS "Super Admin gerencia avisos" ON public.system_announcements;
CREATE POLICY "Super Admin gerencia avisos" ON public.system_announcements
    FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());


-- ============================================================================
-- 2. RADAR DE CHURN (CLÍNICAS EM RISCO)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_at_risk_clinics();

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
        up.email as owner_name, -- Fallback se não tiver metadados, ou join com outra tabela se houver
        up.email,
        c.whatsapp,
        EXTRACT(DAY FROM (NOW() - COALESCE(latest_session.last_seen, c.created_at)))::INT as days_inactive,
        COALESCE(latest_session.last_seen, c.created_at) as last_login,
        c.subscription_tier
    FROM public.clinics c
    JOIN public.user_profiles up ON up.clinic_id = c.id AND up.role = 'administrator'
    -- Tenta pegar o último login da tabela de sessões (auth.sessions não é acessível diretamente aqui facilmente sem config extra, 
    -- então usaremos uma aproximação baseada em logs ou created_at se for MVP. 
    -- Para este exemplo, vamos considerar a data de criação do último agendamento como "sinal de vida")
    LEFT JOIN LATERAL (
        SELECT created_at as last_seen 
        FROM public.appointments 
        WHERE clinic_id = c.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) latest_session ON true
    WHERE 
        c.id NOT IN (SELECT clinic_id FROM public.user_profiles WHERE email = 'danilobellucci@gmail.com') -- Ignora o admin
        AND (
            latest_session.last_seen < NOW() - INTERVAL '7 days' -- Sem agendamentos há 7 dias
            OR latest_session.last_seen IS NULL -- Nunca agendou nada
        )
    ORDER BY days_inactive DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_at_risk_clinics TO authenticated;
