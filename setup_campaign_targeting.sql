
-- Função para buscar alvos das campanhas
-- Retorna usuários que se encaixam nos critérios E ainda não receberam este e-mail específico.
-- AGORA FILTRA PELA CONFIGURAÇÃO DE NOTIFICAÇÃO 'system_campaigns'

CREATE OR REPLACE FUNCTION public.get_campaign_targets(
    p_campaign_key TEXT -- ex: 'activation_ai', 'monetization_limit'
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    name TEXT,
    clinic_name TEXT,
    metric_value INT -- Retorna o valor que gatilhou (ex: num de pacientes)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. ATIVAÇÃO: O PODER DA IA (48h sem uso de Prontuário)
    IF p_campaign_key = 'activation_ai' THEN
        RETURN QUERY
        SELECT 
            p.id, p.email, c.name, c.name as clinic_name, 0
        FROM public.user_profiles p
        JOIN public.clinics c ON p.clinic_id = c.id
        JOIN public.role_notifications rn ON rn.clinic_id = c.id AND rn.role = p.role
        WHERE 
            p.created_at < NOW() - INTERVAL '2 days' -- Criado há mais de 2 dias
            AND p.created_at > NOW() - INTERVAL '5 days' -- Mas não muito antigo (janela de oportunidade)
            AND rn.notification_type = 'system_campaigns' AND rn.is_enabled = true
            AND NOT EXISTS (SELECT 1 FROM public.clinical_records cr WHERE cr.clinic_id = c.id) -- Nunca usou IA
            AND NOT EXISTS ( -- Nunca recebeu este email
                SELECT 1 FROM public.communications cm 
                WHERE cm.recipient_email = p.email 
                AND cm.subject LIKE '%Inteligência Artificial%'
            );

    -- 2. ATIVAÇÃO: AGENDA VAZIA (24h sem agendamentos)
    ELSIF p_campaign_key = 'activation_agenda' THEN
        RETURN QUERY
        SELECT 
            p.id, p.email, c.name, c.name, 0
        FROM public.user_profiles p
        JOIN public.clinics c ON p.clinic_id = c.id
        JOIN public.role_notifications rn ON rn.clinic_id = c.id AND rn.role = p.role
        WHERE 
            p.created_at < NOW() - INTERVAL '1 day'
            AND p.created_at > NOW() - INTERVAL '4 days'
            AND rn.notification_type = 'system_campaigns' AND rn.is_enabled = true
            AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.clinic_id = c.id)
            AND NOT EXISTS (
                SELECT 1 FROM public.communications cm 
                WHERE cm.recipient_email = p.email 
                AND cm.subject LIKE '%Comece a organizar%'
            );

    -- 3. RETENÇÃO: O FANTASMA DA AGENDA (3 dias sem NOVOS agendamentos futuros)
    -- Lógica: Tem agendamentos passados, mas nenhum futuro criado recentemente.
    ELSIF p_campaign_key = 'retention_ghost' THEN
        RETURN QUERY
        SELECT 
            p.id, p.email, c.name, c.name, 0
        FROM public.user_profiles p
        JOIN public.clinics c ON p.clinic_id = c.id
        JOIN public.role_notifications rn ON rn.clinic_id = c.id AND rn.role = p.role
        WHERE 
            p.role = 'administrator' -- Apenas donos
            AND rn.notification_type = 'system_campaigns' AND rn.is_enabled = true
            AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.clinic_id = c.id) -- Já usou a agenda antes
            AND NOT EXISTS ( -- Não tem agendamento futuro
                SELECT 1 FROM public.appointments a 
                WHERE a.clinic_id = c.id 
                AND a.start_time > NOW()
            )
            AND NOT EXISTS ( -- Não recebeu este email nos últimos 15 dias
                SELECT 1 FROM public.communications cm 
                WHERE cm.recipient_email = p.email 
                AND cm.subject LIKE '%dias tranquilos%'
                AND cm.sent_at > NOW() - INTERVAL '15 days'
            );

    -- 4. MONETIZAÇÃO: QUASE NO LIMITE (Pacientes > 25 no plano Free)
    ELSIF p_campaign_key = 'monetization_limit' THEN
        RETURN QUERY
        SELECT 
            p.id, p.email, c.name, c.name, count(cl.id)::INT
        FROM public.user_profiles p
        JOIN public.clinics c ON p.clinic_id = c.id
        JOIN public.clients cl ON cl.clinic_id = c.id
        JOIN public.role_notifications rn ON rn.clinic_id = c.id AND rn.role = p.role
        WHERE 
            c.subscription_tier = 'free'
            AND p.role = 'administrator'
            AND rn.notification_type = 'system_campaigns' AND rn.is_enabled = true
            AND NOT EXISTS (
                SELECT 1 FROM public.communications cm 
                WHERE cm.recipient_email = p.email 
                AND cm.subject LIKE '%limite de pacientes%'
            )
        GROUP BY p.id, p.email, c.name, rn.id
        HAVING count(cl.id) >= 25;

    -- 5. MONETIZAÇÃO: VICIADO EM IA (Usou 3 cotas no Free)
    ELSIF p_campaign_key = 'monetization_ai' THEN
        RETURN QUERY
        SELECT 
            p.id, p.email, c.name, c.name, count(cr.id)::INT
        FROM public.user_profiles p
        JOIN public.clinics c ON p.clinic_id = c.id
        JOIN public.clinical_records cr ON cr.clinic_id = c.id
        JOIN public.role_notifications rn ON rn.clinic_id = c.id AND rn.role = p.role
        WHERE 
            c.subscription_tier = 'free'
            AND p.role = 'administrator'
            AND rn.notification_type = 'system_campaigns' AND rn.is_enabled = true
            AND NOT EXISTS (
                SELECT 1 FROM public.communications cm 
                WHERE cm.recipient_email = p.email 
                AND cm.subject LIKE '%Desbloqueie a IA%'
            )
        GROUP BY p.id, p.email, c.name, rn.id
        HAVING count(cr.id) >= 3;

    END IF;
END;
$$;
