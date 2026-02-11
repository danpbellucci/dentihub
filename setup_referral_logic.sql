
-- ============================================================================
-- LÓGICA DE REFERRAL (INDICAÇÃO) - REGRAS DE NEGÓCIO V3 (30 PACIENTES)
-- ============================================================================

-- 1. Garantir coluna de validade do bônus
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS bonus_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Tabela de Eventos (Evita duplicidade de bônus pelo mesmo motivo)
CREATE TABLE IF NOT EXISTS public.referral_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    referred_clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('10_patients', '30_patients', 'paid_subscription')),
    bonus_applied TEXT NOT NULL, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referred_clinic_id, event_type)
);

-- 2.1 Atualizar restrição de check se a tabela já existir (para incluir 30_patients)
ALTER TABLE public.referral_events DROP CONSTRAINT IF EXISTS referral_events_event_type_check;
ALTER TABLE public.referral_events ADD CONSTRAINT referral_events_event_type_check 
CHECK (event_type IN ('10_patients', '30_patients', 'paid_subscription'));


-- 3. Função Inteligente de Concessão de Bônus
DROP FUNCTION IF EXISTS public.grant_referral_bonus(uuid, text);

CREATE OR REPLACE FUNCTION public.grant_referral_bonus(
    p_referrer_id UUID, 
    p_reward_tier TEXT -- 'starter' ou 'pro'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_tier TEXT;
    v_new_tier TEXT;
    v_referrer_email TEXT;
    v_referrer_name TEXT;
    v_subject TEXT;
    v_body_html TEXT;
BEGIN
    -- Busca o plano atual do padrinho
    SELECT subscription_tier INTO v_current_tier FROM public.clinics WHERE id = p_referrer_id;

    -- REGRA DE UPGRADE:
    IF p_reward_tier = 'pro' THEN
        v_new_tier := 'pro';
    ELSIF p_reward_tier = 'starter' THEN
        IF v_current_tier = 'free' THEN
            v_new_tier := 'starter';
        ELSE
            v_new_tier := v_current_tier; -- Mantém Pro ou Starter se já tiver
        END IF;
    ELSE
        v_new_tier := v_current_tier;
    END IF;

    -- Atualiza a clínica do Padrinho
    UPDATE public.clinics
    SET 
        -- Soma 30 dias. Se já tiver bônus ativo, soma ao final dele. Se não, soma a partir de agora.
        bonus_expires_at = CASE 
            WHEN bonus_expires_at > NOW() THEN bonus_expires_at + INTERVAL '30 days'
            ELSE NOW() + INTERVAL '30 days'
        END,
        subscription_tier = v_new_tier
    WHERE id = p_referrer_id
    RETURNING email, name INTO v_referrer_email, v_referrer_name;

    -- Notificação (Placeholder para integração pg_net)
    BEGIN
        IF v_referrer_email IS NOT NULL THEN
            -- Aqui você pode inserir lógica de notificação
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignora falha de notificação
    END;
END;
$$;

-- 4. Trigger Regra 1: 30 Pacientes Cadastrados -> Padrinho ganha Starter
-- (Renomeamos a lógica interna, mantendo a compatibilidade de gatilho)
CREATE OR REPLACE FUNCTION public.check_referral_10_patients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referrer_id UUID;
    v_count INT;
BEGIN
    -- Verifica quem indicou esta clínica
    SELECT referred_by INTO v_referrer_id FROM public.clinics WHERE id = NEW.clinic_id;
    
    IF v_referrer_id IS NOT NULL THEN
        -- Conta pacientes
        SELECT count(*) INTO v_count FROM public.clients WHERE clinic_id = NEW.clinic_id;

        -- NOVA REGRA: 30 PACIENTES (Antiga era 10)
        IF v_count >= 30 THEN
            -- Verifica se já houve bonificação por marco de paciente (10 ou 30)
            -- Isso garante que clínicas antigas que ganharam com 10 não ganhem de novo com 30
            -- e clínicas novas ganhem apenas ao atingir 30.
            IF NOT EXISTS (
                SELECT 1 FROM public.referral_events 
                WHERE referred_clinic_id = NEW.clinic_id 
                AND (event_type = '10_patients' OR event_type = '30_patients')
            ) THEN
                
                -- Registra evento como '30_patients'
                INSERT INTO public.referral_events (referrer_id, referred_clinic_id, event_type, bonus_applied)
                VALUES (v_referrer_id, NEW.clinic_id, '30_patients', 'starter');

                -- Aplica regra: Starter
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

-- 5. Trigger Regra 2: Assinatura Paga (Qualquer uma) -> Padrinho ganha Pro
CREATE OR REPLACE FUNCTION public.check_referral_paid_sub()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se mudou de Free para qualquer plano pago (Starter ou Pro)
    IF OLD.subscription_tier = 'free' AND NEW.subscription_tier IN ('starter', 'pro') AND NEW.referred_by IS NOT NULL THEN
        
        -- Se ainda não bonificou por pagamento
        IF NOT EXISTS (SELECT 1 FROM public.referral_events WHERE referred_clinic_id = NEW.id AND event_type = 'paid_subscription') THEN
            
            -- Registra evento
            INSERT INTO public.referral_events (referrer_id, referred_clinic_id, event_type, bonus_applied)
            VALUES (NEW.referred_by, NEW.id, 'paid_subscription', 'pro');

            -- Aplica regra: Pro
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
