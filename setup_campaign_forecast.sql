
-- ============================================================================
-- PREVISÃO DE CAMPANHAS DO SISTEMA (FORECAST)
-- ============================================================================
-- Esta função projeta quando cada clínica receberá os emails automáticos
-- baseando-se na data de criação e nas regras de negócio atuais.

DROP FUNCTION IF EXISTS public.get_campaign_forecast();

CREATE OR REPLACE FUNCTION public.get_campaign_forecast()
RETURNS TABLE (
    clinic_name TEXT,
    user_email TEXT,
    campaign_type TEXT,
    scheduled_for DATE,
    status TEXT, -- 'Pending', 'Sent', 'Ineligible', 'Missed'
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH targets AS (
        SELECT 
            p.id as user_id,
            p.email,
            p.created_at,
            c.id as clinic_id,
            c.name as c_name,
            -- Verifica uso atual para regras de elegibilidade
            EXISTS(SELECT 1 FROM public.clinical_records cr WHERE cr.clinic_id = c.id) as has_ai_usage,
            EXISTS(SELECT 1 FROM public.appointments a WHERE a.clinic_id = c.id) as has_agenda_usage,
            -- Verifica configurações
            COALESCE((SELECT is_enabled FROM public.role_notifications rn WHERE rn.clinic_id = c.id AND rn.role = p.role AND rn.notification_type = 'system_campaigns'), false) as notifications_enabled
        FROM public.user_profiles p
        JOIN public.clinics c ON p.clinic_id = c.id
        WHERE p.role = 'administrator' -- Focamos nos donos
    ),
    campaign_rules AS (
        -- Definição das Regras de Data e Tipo
        SELECT 'activation_agenda' as c_key, 1 as days_offset, '%Comece a organizar%' as subject_match UNION ALL
        SELECT 'activation_ai', 2, '%Inteligência Artificial%' UNION ALL
        SELECT 'onboarding_3d', 3, '%opinião%' UNION ALL
        SELECT 'onboarding_7d', 7, '%Uma semana juntos%' UNION ALL
        SELECT 'onboarding_30d', 30, '%1 mês de DentiHub%'
    )
    SELECT 
        t.c_name::TEXT,
        t.email::TEXT,
        r.c_key::TEXT,
        (t.created_at + (r.days_offset || ' days')::INTERVAL)::DATE as scheduled_for,
        CASE 
            -- 1. Verifica se já foi enviado
            WHEN EXISTS (
                SELECT 1 FROM public.communications com 
                WHERE com.recipient_email = t.email 
                AND com.subject LIKE r.subject_match
            ) THEN 'Sent'
            
            -- 2. Verifica se notificações estão desligadas
            WHEN NOT t.notifications_enabled THEN 'Blocked'

            -- 3. Verifica Elegibilidade de Uso (Regras específicas)
            WHEN r.c_key = 'activation_ai' AND t.has_ai_usage THEN 'Ineligible'
            WHEN r.c_key = 'activation_agenda' AND t.has_agenda_usage THEN 'Ineligible'

            -- 4. Verifica Janela de Tempo
            WHEN (t.created_at + (r.days_offset || ' days')::INTERVAL) < (NOW() - INTERVAL '24 hours') THEN 'Missed'
            
            ELSE 'Pending'
        END as status,
        CASE
            WHEN r.c_key = 'activation_ai' AND t.has_ai_usage THEN 'Já utilizou IA'
            WHEN r.c_key = 'activation_agenda' AND t.has_agenda_usage THEN 'Já tem agendamentos'
            WHEN NOT t.notifications_enabled THEN 'Notificações desativadas'
            ELSE NULL
        END as reason
    FROM targets t
    CROSS JOIN campaign_rules r
    WHERE 
        -- Filtra apenas o que é relevante (futuro próximo ou enviado recentemente)
        (t.created_at + (r.days_offset || ' days')::INTERVAL) > (NOW() - INTERVAL '60 days')
    ORDER BY scheduled_for DESC, t.c_name ASC;
END;
$$;

-- Concede permissão para usuários logados (O componente Super Admin valida se é admin real)
GRANT EXECUTE ON FUNCTION public.get_campaign_forecast TO authenticated;
