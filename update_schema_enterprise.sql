
-- 1. Adicionar colunas de limites personalizados na tabela de clínicas
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS custom_dentist_limit INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_ai_daily_limit INT DEFAULT NULL;

-- 2. Atualizar a função de verificação de limite de dentistas
CREATE OR REPLACE FUNCTION public.check_dentist_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tier text;
    v_count int;
    v_limit int;
    v_custom_limit int;
BEGIN
    -- Obter o plano e limite customizado da clínica
    SELECT subscription_tier, custom_dentist_limit INTO v_tier, v_custom_limit
    FROM public.clinics 
    WHERE id = NEW.clinic_id;

    -- Se tiver limite customizado (Enterprise), usa ele.
    IF v_custom_limit IS NOT NULL THEN
        v_limit := v_custom_limit;
    ELSE
        -- Definir limites padrão baseados no plano
        IF v_tier = 'free' THEN 
            v_limit := 1;
        ELSIF v_tier = 'starter' THEN 
            v_limit := 3;
        ELSIF v_tier = 'pro' THEN
            v_limit := 5;
        ELSE 
            v_limit := 1; -- Fallback
        END IF;
    END IF;

    -- Contar dentistas existentes nesta clínica
    SELECT count(*) INTO v_count 
    FROM public.dentists 
    WHERE clinic_id = NEW.clinic_id;

    -- Verificar se excede (>= porque estamos tentando inserir +1)
    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'Limite de dentistas atingido (% de %). Faça upgrade para adicionar mais profissionais.', v_count, v_limit;
    END IF;

    RETURN NEW;
END;
$$;
