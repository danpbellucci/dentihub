
-- Execute este script no SQL Editor do Supabase para corrigir o erro ao salvar o plano

-- 1. Adiciona as colunas de precificação dinâmica, se não existirem
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS price_per_dentist NUMERIC DEFAULT 60,
ADD COLUMN IF NOT EXISTS price_per_ai_block NUMERIC DEFAULT 15,
ADD COLUMN IF NOT EXISTS ai_block_size INT DEFAULT 5;

-- 2. Atualiza o cache do esquema do PostgREST para reconhecer as novas colunas imediatamente
NOTIFY pgrst, 'reload config';

-- 3. (Opcional) Define os valores padrão para o plano Enterprise existente (se houver)
UPDATE public.subscription_plans
SET 
    price_per_dentist = 60,
    price_per_ai_block = 15,
    ai_block_size = 5
WHERE is_enterprise = true;
