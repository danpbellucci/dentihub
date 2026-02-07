
-- ============================================================================
-- RPC: OBTER ESTATÍSTICAS DE INDICAÇÕES (CLÍNICAS + PACIENTES)
-- ============================================================================
-- Esta função permite que uma clínica (padrinho) veja a lista de clínicas que indicou,
-- incluindo a contagem de pacientes de cada uma, sem expor os dados sensíveis dos pacientes.
--
-- Requisito: O usuário logado deve ser o "referrer" (padrinho) das clínicas listadas.

-- 1. Remove versão anterior para garantir atualização
DROP FUNCTION IF EXISTS public.get_my_referrals_stats();

-- 2. Cria a função com SECURITY DEFINER (Permissões de Admin)
CREATE OR REPLACE FUNCTION public.get_my_referrals_stats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  subscription_tier TEXT,
  patient_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Importante: Roda com permissões elevadas para ler 'clients' de outras clínicas
SET search_path = public
AS $$
DECLARE
  my_clinic_id UUID;
BEGIN
  -- Identificar a clínica do usuário logado
  -- IMPORTANTE: Usamos o alias 'up' para desambiguar a coluna 'id' da tabela 'user_profiles'
  -- em relação à variável de retorno 'id' definida em RETURNS TABLE.
  SELECT up.clinic_id INTO my_clinic_id 
  FROM public.user_profiles up
  WHERE up.id = auth.uid() 
  LIMIT 1;

  -- Se não encontrar a clínica (ex: erro de sessão), retorna vazio
  IF my_clinic_id IS NULL THEN
     RETURN;
  END IF;

  -- Retornar dados agregados
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.created_at,
    c.subscription_tier::TEXT, -- Cast explícito para evitar erro de tipo enum
    COUNT(cl.id) as patient_count
  FROM public.clinics c
  LEFT JOIN public.clients cl ON c.id = cl.clinic_id
  WHERE c.referred_by = my_clinic_id
  GROUP BY c.id, c.name, c.created_at, c.subscription_tier
  ORDER BY c.created_at DESC;
END;
$$;

-- 3. Conceder permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_my_referrals_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referrals_stats TO service_role;
