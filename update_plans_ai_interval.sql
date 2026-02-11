
-- Adiciona a coluna para definir o tipo de intervalo do limite de IA
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS ai_usage_limit_type TEXT DEFAULT 'daily'; -- 'daily' (Diário por dentista) ou 'total' (Uso único/vitalício da conta)

-- Atualiza o plano Free para ser limite TOTAL (Vitalício para teste)
UPDATE public.subscription_plans 
SET ai_usage_limit_type = 'total' 
WHERE slug = 'free';

-- Garante que os planos pagos sejam diários (padrão)
UPDATE public.subscription_plans 
SET ai_usage_limit_type = 'daily' 
WHERE slug IN ('starter', 'pro');
