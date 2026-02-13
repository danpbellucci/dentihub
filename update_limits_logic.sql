
-- 1. Adicionar coluna de limite de pacientes customizado na tabela clinics
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS custom_clients_limit INT DEFAULT NULL;

-- 2. Sincronizar dados: Copia os limites da tabela de planos para a tabela de clínicas
-- Isso afeta apenas planos 'free', 'starter' e 'pro'. Enterprise mantém o que já está definido (ou NULL se não definido).
UPDATE public.clinics c
SET
    custom_dentist_limit = p.max_dentists,
    custom_clients_limit = p.max_patients,
    custom_ai_daily_limit = p.max_ai_usage
FROM public.subscription_plans p
WHERE c.subscription_tier = p.slug
AND c.subscription_tier != 'enterprise';

-- 3. Atualizar Função de Trigger: Limite de Pacientes
-- Agora lê a coluna 'custom_clients_limit' da clínica em vez de fazer IF/ELSE fixo.
CREATE OR REPLACE FUNCTION public.check_client_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit int;
    v_count int;
BEGIN
    -- Busca o limite configurado na clínica
    SELECT custom_clients_limit INTO v_limit
    FROM public.clinics 
    WHERE id = NEW.clinic_id;

    -- Se for NULL, considera ilimitado (ex: Pro/Enterprise sem limite definido)
    IF v_limit IS NULL THEN
        RETURN NEW;
    END IF;

    -- Conta pacientes atuais
    SELECT count(*) INTO v_count 
    FROM public.clients 
    WHERE clinic_id = NEW.clinic_id;

    -- Verifica estouro
    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'Limite de pacientes atingido (% de %). Faça upgrade do seu plano.', v_count, v_limit;
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Atualizar Função de Trigger: Limite de Dentistas
-- Agora lê a coluna 'custom_dentist_limit' da clínica.
CREATE OR REPLACE FUNCTION public.check_dentist_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit int;
    v_count int;
BEGIN
    -- Busca o limite configurado na clínica
    SELECT custom_dentist_limit INTO v_limit
    FROM public.clinics 
    WHERE id = NEW.clinic_id;

    -- Se for NULL, considera ilimitado (ex: Enterprise aberto)
    IF v_limit IS NULL THEN
        RETURN NEW;
    END IF;

    -- Conta dentistas atuais
    SELECT count(*) INTO v_count 
    FROM public.dentists 
    WHERE clinic_id = NEW.clinic_id;

    -- Verifica estouro
    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'Limite de dentistas atingido (% de %). Faça upgrade para adicionar mais profissionais.', v_count, v_limit;
    END IF;

    RETURN NEW;
END;
$$;
