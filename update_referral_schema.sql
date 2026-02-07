
-- 1. Adicionar colunas na tabela de clínicas
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.clinics(id) ON DELETE SET NULL;

-- 2. Gerar códigos de indicação para clínicas existentes que não possuem
-- Usa uma string aleatória de 6 caracteres maiúsculos
UPDATE public.clinics 
SET referral_code = UPPER(SUBSTRING(MD5(id::text || random()::text) FROM 1 FOR 6))
WHERE referral_code IS NULL;

-- 3. Garantir que a coluna referral_code não seja nula futuramente (opcional, mas recomendado)
-- ALTER TABLE public.clinics ALTER COLUMN referral_code SET NOT NULL;

-- 4. Criar índice para busca rápida por código de indicação no cadastro
CREATE INDEX IF NOT EXISTS idx_clinics_referral_code ON public.clinics(referral_code);
