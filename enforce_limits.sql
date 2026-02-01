
-- ============================================================================
-- PROTEÇÃO DE LIMITES DE PLANO (BACKEND HARD LIMITS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LIMITES DE PACIENTES (CLIENTS)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_client_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões de sistema para ler a tabela clinics
AS $$
DECLARE
    v_tier text;
    v_count int;
    v_limit int;
BEGIN
    -- Obter o plano da clínica
    SELECT subscription_tier INTO v_tier 
    FROM public.clinics 
    WHERE id = NEW.clinic_id;

    -- Definir limites baseados no plano
    IF v_tier = 'free' THEN 
        v_limit := 30;
    ELSIF v_tier = 'starter' THEN 
        v_limit := 100;
    ELSE 
        v_limit := 999999; -- Pro (Ilimitado na prática)
    END IF;

    -- Contar pacientes existentes nesta clínica
    SELECT count(*) INTO v_count 
    FROM public.clients 
    WHERE clinic_id = NEW.clinic_id;

    -- Verificar se excede (>= porque estamos tentando inserir +1)
    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'Limite de pacientes atingido para o plano %. Faça upgrade para continuar.', v_tier;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger Pacientes
DROP TRIGGER IF EXISTS check_client_limit_trigger ON public.clients;
CREATE TRIGGER check_client_limit_trigger
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.check_client_limit();


-- ----------------------------------------------------------------------------
-- 2. LIMITES DE DENTISTAS (DENTISTS) - ATUALIZADO
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_dentist_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tier text;
    v_count int;
    v_limit int;
BEGIN
    -- Obter o plano da clínica
    SELECT subscription_tier INTO v_tier 
    FROM public.clinics 
    WHERE id = NEW.clinic_id;

    -- Definir limites de DENTISTAS baseados no plano
    IF v_tier = 'free' THEN 
        v_limit := 1;
    ELSIF v_tier = 'starter' THEN 
        v_limit := 3;
    ELSIF v_tier = 'pro' THEN
        v_limit := 5; -- Limite ajustado para Plano Pro
    ELSE 
        v_limit := 1; -- Fallback
    END IF;

    -- Contar dentistas existentes nesta clínica
    SELECT count(*) INTO v_count 
    FROM public.dentists 
    WHERE clinic_id = NEW.clinic_id;

    -- Verificar se excede
    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'Limite de dentistas atingido para o plano % (Máximo: %). Faça upgrade para adicionar mais profissionais.', v_tier, v_limit;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger Dentistas
DROP TRIGGER IF EXISTS check_dentist_limit_trigger ON public.dentists;
CREATE TRIGGER check_dentist_limit_trigger
BEFORE INSERT ON public.dentists
FOR EACH ROW
EXECUTE FUNCTION public.check_dentist_limit();
