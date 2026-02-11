
-- Adiciona colunas para precificação dinâmica (Modelo Enterprise)
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS price_per_dentist NUMERIC DEFAULT 60,
ADD COLUMN IF NOT EXISTS price_per_ai_block NUMERIC DEFAULT 15,
ADD COLUMN IF NOT EXISTS ai_block_size INT DEFAULT 5;
