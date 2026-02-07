
-- ============================================================================
-- RPC: OBTER ESTATÍSTICAS DE INDICAÇÕES (CLÍNICAS + PACIENTES)
-- ============================================================================
-- Esta função permite que uma clínica (padrinho) veja a lista de clínicas que indicou,
-- incluindo a contagem de pacientes de cada uma, sem expor os dados sensíveis dos pacientes.
--
-- Requisito: O usuário logado deve ser o "referrer" (padrinho) das clínicas listadas.

CREATE OR REPLACE FUNCTION public.get_my_referrals_stats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  subscription_tier TEXT,
  patient_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com privilégios de sistema para poder contar na tabela 'clients' de outra clínica
SET search_path = public
AS $$
DECLARE
  my_clinic_id UUID;
BEGIN
  -- 1. Identificar a clínica do usuário logado
  SELECT clinic_id INTO my_clinic_id 
  FROM public.user_profiles 
  WHERE id = auth.uid() 
  LIMIT 1;

  -- 2. Retornar dados agregados
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.created_at,
    c.subscription_tier::TEXT, -- Cast explícito para texto
    COUNT(cl.id) as patient_count
  FROM public.clinics c
  LEFT JOIN public.clients cl ON c.id = cl.clinic_id
  WHERE c.referred_by = my_clinic_id
  GROUP BY c.id, c.name, c.created_at, c.subscription_tier
  ORDER BY c.created_at DESC;
END;
$$;

-- Conceder permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_my_referrals_stats TO authenticated;
