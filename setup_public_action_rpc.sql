
-- ============================================================================
-- ATUALIZAÇÃO DA FUNÇÃO DE AÇÃO PÚBLICA (Incluindo Status Atual)
-- ============================================================================

-- 1. Remove a função antiga para permitir alteração no tipo de retorno
DROP FUNCTION IF EXISTS public.get_appointment_details_for_action(uuid);

-- 2. Recria a função com o novo campo 'current_status'
CREATE OR REPLACE FUNCTION public.get_appointment_details_for_action(p_appointment_id UUID)
RETURNS TABLE (
  client_id UUID,
  clinic_id UUID,
  clinic_name TEXT,
  clinic_slug TEXT,
  current_status TEXT -- Campo adicionado
)
LANGUAGE plpgsql
SECURITY DEFINER -- Importante: Roda com permissões de admin
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.client_id,
    a.clinic_id,
    c.name as clinic_name,
    c.slug as clinic_slug,
    a.status as current_status
  FROM
    public.appointments a
  JOIN
    public.clinics c ON a.clinic_id = c.id
  WHERE
    a.id = p_appointment_id
  LIMIT 1;
END;
$$;

-- 3. Garante permissões públicas
GRANT EXECUTE ON FUNCTION public.get_appointment_details_for_action TO anon, authenticated, service_role;
