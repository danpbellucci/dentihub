
-- ============================================================================
-- 1. SEGURANÇA: Permitir que clínicas vejam quem indicaram
-- ============================================================================

-- Primeiro, remover política antiga se existir (para evitar conflitos)
DROP POLICY IF EXISTS "View Referred Clinics" ON public.clinics;

-- Criar a nova política.
-- Uma clínica pode ver registros onde 'referred_by' é o seu próprio ID.
-- Usamos 'get_my_clinic_id()' para segurança se disponível, senão fallback.
CREATE POLICY "View Referred Clinics" ON public.clinics
FOR SELECT
USING (
  referred_by = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);


-- ============================================================================
-- 2. NOTIFICAÇÃO: Enviar E-mail ao Conceder Bônus
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_referral_bonus(
    p_referrer_id UUID, 
    p_tier TEXT -- 'starter' ou 'pro'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referrer_email TEXT;
    v_referrer_name TEXT;
    v_subject TEXT;
    v_body_html TEXT;
    v_bonus_desc TEXT;
BEGIN
    -- 1. Atualizar o Banco de Dados (Lógica Original)
    UPDATE public.clinics
    SET 
        bonus_expires_at = CASE 
            WHEN bonus_expires_at > NOW() THEN bonus_expires_at + INTERVAL '30 days'
            ELSE NOW() + INTERVAL '30 days'
        END,
        subscription_tier = CASE
            WHEN p_tier = 'pro' THEN 'pro'
            WHEN p_tier = 'starter' AND subscription_tier = 'free' THEN 'starter'
            ELSE subscription_tier
        END
    WHERE id = p_referrer_id
    RETURNING email, name INTO v_referrer_email, v_referrer_name;

    -- 2. Preparar E-mail de Notificação
    IF v_referrer_email IS NOT NULL THEN
        
        v_bonus_desc := CASE WHEN p_tier = 'pro' THEN 'Plano PRO' ELSE 'Plano Starter' END;
        v_subject := 'Parabéns! Você ganhou um bônus por indicação 🎁';
        
        v_body_html := format(
            '<div style="font-family: sans-serif; color: #333; padding: 20px; border: 1px solid #eee; border-radius: 8px;">'
            '<h2 style="color: #0ea5e9;">Bônus Liberado! 🚀</h2>'
            '<p>Olá, <strong>%s</strong>!</p>'
            '<p>Temos uma ótima notícia: uma das clínicas que você indicou atingiu a meta!</p>'
            '<div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">'
            '<p style="margin:0;"><strong>Você ganhou:</strong> +30 dias de %s</p>'
            '</div>'
            '<p>Seu acesso bonificado já está ativo. Aproveite!</p>'
            '</div>',
            COALESCE(v_referrer_name, 'Parceiro'),
            v_bonus_desc
        );

        -- 3. Disparar E-mail via pg_net (Assíncrono)
        -- ATENÇÃO: Substitua 'SUA_SERVICE_ROLE_KEY' pela chave real no dashboard do Supabase.
        -- Como não temos a chave aqui, este comando depende da configuração correta no servidor.
        PERFORM net.http_post(
            url := 'https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-emails',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY' 
            ),
            body := jsonb_build_object(
                'type', 'system',
                'recipients', jsonb_build_array(jsonb_build_object('email', v_referrer_email, 'name', v_referrer_name)),
                'subject', v_subject,
                'htmlContent', v_body_html
            )
        );
    END IF;
END;
$$;
