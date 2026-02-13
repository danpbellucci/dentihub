
-- ============================================================================
-- CORREÇÃO DE CONSTRAINT: PERMITIR PLANO 'ENTERPRISE'
-- ============================================================================
-- O erro ocorre porque a coluna 'subscription_tier' tem uma trava que só aceita
-- valores antigos (free, starter, pro). Vamos atualizar para incluir 'enterprise'.

-- 1. Remove a restrição antiga
ALTER TABLE public.clinics
DROP CONSTRAINT IF EXISTS clinics_subscription_tier_check;

-- 2. Adiciona a nova restrição com a lista atualizada
ALTER TABLE public.clinics
ADD CONSTRAINT clinics_subscription_tier_check
CHECK (subscription_tier IN ('free', 'starter', 'pro', 'enterprise'));
