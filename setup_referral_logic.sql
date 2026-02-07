
-- 1. Preparar a tabela de clínicas para receber bônus temporal
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS bonus_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Tabela para registrar eventos de indicação (evita bônus duplicado)
CREATE TABLE IF NOT EXISTS public.referral_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE, -- Quem indicou (ganha o bônus)
    referred_clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE, -- Quem foi indicado (atingiu a meta)
    event_type TEXT NOT NULL CHECK (event_type IN ('10_patients', 'paid_subscription')),
    bonus_applied TEXT NOT NULL, -- 'starter' ou 'pro'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referred_clinic_id, event_type) -- Garante que cada marco só paga bônus 1 vez por clínica indicada
);

-- 3. Função Genérica para Conceder Bônus
CREATE OR REPLACE FUNCTION public.grant_referral_bonus(
    p_referrer_id UUID, 
    p_tier TEXT -- 'starter' ou 'pro'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.clinics
    SET 
        -- Se já tem bônus ativo, soma 30 dias ao final. Se não, soma 30 dias a partir de agora.
        bonus_expires_at = CASE 
            WHEN bonus_expires_at > NOW() THEN bonus_expires_at + INTERVAL '30 days'
            ELSE NOW() + INTERVAL '30 days'
        END,
        -- Atualiza o tier se o tier do bônus for superior ou igual ao atual
        subscription_tier = CASE
            WHEN p_tier = 'pro' THEN 'pro' -- Pro sempre ganha
            WHEN p_tier = 'starter' AND subscription_tier = 'free' THEN 'starter' -- Starter só melhora se for Free
            ELSE subscription_tier -- Mantém o atual (ex: se já é Pro e ganha Starter, mantém Pro mas ganha dias)
        END
    WHERE id = p_referrer_id;
END;
$$;

-- 4. Trigger: Meta de 10 Pacientes (Ganha 1 mês de Starter)
CREATE OR REPLACE FUNCTION public.check_referral_10_patients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clinic_id UUID;
    v_referrer_id UUID;
    v_count INT;
BEGIN
    v_clinic_id := NEW.clinic_id;

    -- Verifica se a clínica foi indicada por alguém
    SELECT referred_by INTO v_referrer_id FROM public.clinics WHERE id = v_clinic_id;
    
    IF v_referrer_id IS NOT NULL THEN
        -- Conta pacientes
        SELECT count(*) INTO v_count FROM public.clients WHERE clinic_id = v_clinic_id;

        -- Se atingiu 10 e ainda não gerou evento
        IF v_count >= 10 THEN
            IF NOT EXISTS (SELECT 1 FROM public.referral_events WHERE referred_clinic_id = v_clinic_id AND event_type = '10_patients') THEN
                -- Registra evento
                INSERT INTO public.referral_events (referrer_id, referred_clinic_id, event_type, bonus_applied)
                VALUES (v_referrer_id, v_clinic_id, '10_patients', 'starter');

                -- Aplica bônus ao padrinho
                PERFORM public.grant_referral_bonus(v_referrer_id, 'starter');
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_referral_10_patients ON public.clients;
CREATE TRIGGER trigger_referral_10_patients
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.check_referral_10_patients();

-- 5. Trigger: Meta de Assinatura Paga (Ganha 1 mês de Pro)
CREATE OR REPLACE FUNCTION public.check_referral_paid_sub()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se mudou de Free para Pago (Starter ou Pro) E tem padrinho
    IF OLD.subscription_tier = 'free' AND NEW.subscription_tier IN ('starter', 'pro') AND NEW.referred_by IS NOT NULL THEN
        
        IF NOT EXISTS (SELECT 1 FROM public.referral_events WHERE referred_clinic_id = NEW.id AND event_type = 'paid_subscription') THEN
            -- Registra evento
            INSERT INTO public.referral_events (referrer_id, referred_clinic_id, event_type, bonus_applied)
            VALUES (NEW.referred_by, NEW.id, 'paid_subscription', 'pro');

            -- Aplica bônus ao padrinho
            PERFORM public.grant_referral_bonus(NEW.referred_by, 'pro');
        END IF;

    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_referral_paid_sub ON public.clinics;
CREATE TRIGGER trigger_referral_paid_sub
AFTER UPDATE OF subscription_tier ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.check_referral_paid_sub();
