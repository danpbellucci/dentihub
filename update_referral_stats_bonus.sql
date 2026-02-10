
-- ============================================================================
-- RPC ATUALIZADA: ESTATÍSTICAS DE INDICAÇÕES COM BÔNUS E DATA
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_my_referrals_stats();

CREATE OR REPLACE FUNCTION public.get_my_referrals_stats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  subscription_tier TEXT,
  patient_count BIGINT,
  bonus_earned TEXT,
  bonus_date TIMESTAMPTZ -- Campo novo para data do bônus
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_clinic_id UUID;
BEGIN
  -- 1. Identificar a clínica do usuário logado
  SELECT up.clinic_id INTO my_clinic_id 
  FROM public.user_profiles up
  WHERE up.id = auth.uid() 
  LIMIT 1;

  IF my_clinic_id IS NULL THEN
     RETURN;
  END IF;

  -- 2. Retornar dados agregados + Bônus via Lateral Join
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.created_at,
    c.subscription_tier::TEXT,
    COUNT(cl.id) as patient_count,
    reward.bonus_applied::TEXT as bonus_earned,
    reward.created_at as bonus_date
  FROM public.clinics c
  LEFT JOIN public.clients cl ON c.id = cl.clinic_id
  -- Busca o melhor bônus ganho com esta clínica (Prioridade para Pro)
  LEFT JOIN LATERAL (
    SELECT bonus_applied, created_at
    FROM public.referral_events re 
    WHERE re.referred_clinic_id = c.id 
    ORDER BY CASE WHEN bonus_applied = 'pro' THEN 1 ELSE 2 END ASC 
    LIMIT 1
  ) reward ON true
  WHERE c.referred_by = my_clinic_id
  GROUP BY c.id, c.name, c.created_at, c.subscription_tier, reward.bonus_applied, reward.created_at
  ORDER BY c.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referrals_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referrals_stats TO service_role;
