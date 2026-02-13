
-- ============================================================================
-- TRIGGER: ALERTA DE ERRO EM EDGE FUNCTIONS
-- ============================================================================
-- Monitora a tabela 'edge_function_logs'. Se entrar um registro com status
-- diferente de 'success', dispara a função de alerta para o admin.

-- 1. Função que será chamada pelo Trigger
CREATE OR REPLACE FUNCTION public.trigger_admin_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se o status não for sucesso, envia o alerta
    IF NEW.status NOT IN ('success', 'running') THEN
        -- Faz a chamada HTTP para a Edge Function de alerta
        -- Substitua SUA_SERVICE_ROLE_KEY pela chave real.
        PERFORM net.http_post(
            url := 'https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-admin-alert',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY' 
            ),
            body := jsonb_build_object(
                'function_name', NEW.function_name,
                'error_details', NEW.metadata, -- Assume que detalhes do erro estão aqui
                'metadata', NEW.metadata,
                'created_at', NEW.created_at
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Criar o Trigger na tabela
DROP TRIGGER IF EXISTS on_edge_function_error ON public.edge_function_logs;

CREATE TRIGGER on_edge_function_error
AFTER INSERT ON public.edge_function_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_admin_alert();

-- Nota: A extensão pg_net deve estar habilitada ('create extension if not exists pg_net').
