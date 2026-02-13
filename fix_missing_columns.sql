
-- ============================================================================
-- SCRIPT DE REPARO DE BANCO DE DADOS (COLUNAS AUSENTES)
-- ============================================================================
-- Execute este script no SQL Editor do Supabase para corrigir o erro 
-- "PGRST301: Could not find the 'custom_clients_limit' column".

-- 1. Criar a coluna 'custom_clients_limit' na tabela clinics se não existir
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS custom_clients_limit INT DEFAULT NULL;

-- 2. Conceder permissões explícitas (garantia)
GRANT ALL ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;

-- 3. Atualizar o cache de schema do PostgREST (Importante!)
NOTIFY pgrst, 'reload config';

-- 4. Reprocessar a sincronização de dados dos planos (apenas para garantir valores corretos)
UPDATE public.clinics c
SET
    custom_dentist_limit = p.max_dentists,
    custom_clients_limit = p.max_patients,
    custom_ai_daily_limit = p.max_ai_usage
FROM public.subscription_plans p
WHERE c.subscription_tier = p.slug
AND c.subscription_tier != 'enterprise'
AND c.is_manual_override = FALSE;

-- 5. Recriar Trigger de Limite de Pacientes (Para garantir que use a nova coluna)
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

DROP TRIGGER IF EXISTS check_client_limit_trigger ON public.clients;
CREATE TRIGGER check_client_limit_trigger
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.check_client_limit();
