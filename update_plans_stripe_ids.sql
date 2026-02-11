
-- Adiciona colunas para os IDs de preço do Stripe dos componentes variáveis
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS stripe_dentist_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_ai_price_id TEXT;

-- (Opcional) Se a coluna stripe_product_id ainda não existir ou precisar de ajuste
-- ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
