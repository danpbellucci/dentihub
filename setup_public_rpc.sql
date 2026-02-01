
-- ============================================================================
-- FUNÇÃO PARA CONSULTAR DISPONIBILIDADE PÚBLICA
-- ============================================================================
-- Esta função permite que a página pública de agendamento verifique conflitos
-- sem dar acesso direto à tabela de appointments (protegendo dados dos pacientes).

CREATE OR REPLACE FUNCTION public.get_dentist_busy_times(
  p_dentist_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS TABLE (
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER -- Roda com permissões de admin para ignorar RLS
SET search_path = public
AS $$
  SELECT start_time, end_time
  FROM appointments
  WHERE dentist_id = p_dentist_id
    AND status != 'cancelled'
    AND start_time >= p_start_time
    AND start_time <= p_end_time;
$$;

-- Concede permissão de execução para usuários anônimos (página pública)
GRANT EXECUTE ON FUNCTION public.get_dentist_busy_times TO anon, authenticated, service_role;
