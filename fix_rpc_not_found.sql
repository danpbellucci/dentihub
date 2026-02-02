
-- ============================================================================
-- CORREÇÃO DE ERRO 404: CRIAR FUNÇÃO RPC DE AÇÃO PÚBLICA
-- ============================================================================
-- Execute este script para corrigir o erro "Erro de conexão ao verificar o agendamento".

-- 1. Cria ou substitui a função segura
CREATE OR REPLACE FUNCTION public.get_appointment_details_for_action(p_appointment_id UUID)
RETURNS TABLE (
  client_id UUID,
  clinic_id UUID,
  clinic_name TEXT,
  clinic_slug TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Importante: Roda com permissões de admin para ler dados necessários
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.client_id,
    a.clinic_id,
    c.name as clinic_name,
    c.slug as clinic_slug
  FROM
    public.appointments a
  JOIN
    public.clinics c ON a.clinic_id = c.id
  WHERE
    a.id = p_appointment_id
  LIMIT 1;
END;
$$;

-- 2. Concede permissão pública (Obrigatório para links de e-mail funcionarem sem login)
GRANT EXECUTE ON FUNCTION public.get_appointment_details_for_action TO anon, authenticated, service_role;

-- 3. Garante que a tabela de atualizações de status permite inserção pública
-- (Caso o paciente clique em Confirmar/Cancelar)
ALTER TABLE public.appointment_status_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert status updates" ON public.appointment_status_updates;

CREATE POLICY "Public insert status updates" ON public.appointment_status_updates
    FOR INSERT
    WITH CHECK (true);
