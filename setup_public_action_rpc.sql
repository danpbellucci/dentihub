
-- ============================================================================
-- FUNÇÃO SEGURA PARA AÇÕES DE AGENDAMENTO (PÚBLICO)
-- ============================================================================
-- Permite buscar IDs e Nome da Clínica baseados no ID do agendamento,
-- contornando o RLS da tabela appointments de forma segura.

CREATE OR REPLACE FUNCTION public.get_appointment_details_for_action(p_appointment_id UUID)
RETURNS TABLE (
  client_id UUID,
  clinic_id UUID,
  clinic_name TEXT,
  clinic_slug TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões de administrador para ler a tabela
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

-- Conceder permissão para usuários anônimos (pacientes clicando no email)
GRANT EXECUTE ON FUNCTION public.get_appointment_details_for_action TO anon, authenticated, service_role;
