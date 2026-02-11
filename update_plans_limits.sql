
-- Adiciona colunas para controle dinâmico de limites nos planos
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS max_dentists INT DEFAULT NULL, -- NULL = Ilimitado
ADD COLUMN IF NOT EXISTS max_patients INT DEFAULT NULL, -- NULL = Ilimitado
ADD COLUMN IF NOT EXISTS max_ai_usage INT DEFAULT NULL; -- NULL = Ilimitado (Diário por dentista)

-- Atualiza os planos existentes com os valores hardcoded atuais para manter compatibilidade inicial
UPDATE public.subscription_plans SET max_dentists = 1, max_patients = 30, max_ai_usage = 3 WHERE slug = 'free';
UPDATE public.subscription_plans SET max_dentists = 3, max_patients = 100, max_ai_usage = 5 WHERE slug = 'starter';
UPDATE public.subscription_plans SET max_dentists = 5, max_patients = NULL, max_ai_usage = 10 WHERE slug = 'pro';
