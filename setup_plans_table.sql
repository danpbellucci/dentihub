
-- ============================================================================
-- TABELA DE PLANOS DE ASSINATURA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,          -- Ex: Starter, Pro
    slug TEXT NOT NULL UNIQUE,   -- Ex: starter, pro
    price_monthly NUMERIC NOT NULL, -- Valor visual (ex: 100.00)
    stripe_product_id TEXT,      -- ID do Produto no Stripe (prod_...)
    stripe_price_id TEXT,        -- ID do Preço no Stripe (price_...)
    features JSONB,              -- Lista de features para exibir no card
    is_active BOOLEAN DEFAULT TRUE,
    is_popular BOOLEAN DEFAULT FALSE,
    is_enterprise BOOLEAN DEFAULT FALSE, -- Se for true, usa lógica customizada/contato
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Política de Leitura Pública (Para Landing Page e Settings)
DROP POLICY IF EXISTS "Public read plans" ON public.subscription_plans;
CREATE POLICY "Public read plans" ON public.subscription_plans
    FOR SELECT
    USING (true);

-- Política de Escrita (Apenas Super Admin)
DROP POLICY IF EXISTS "Super Admin manage plans" ON public.subscription_plans;
CREATE POLICY "Super Admin manage plans" ON public.subscription_plans
    FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Inserir Dados Iniciais (Baseado no Hardcoded atual para não quebrar)
INSERT INTO public.subscription_plans (name, slug, price_monthly, stripe_price_id, features, is_popular, display_order, is_enterprise)
VALUES 
(
    'Gratuito', 
    'free', 
    0, 
    NULL, 
    '["1 Dentista", "Até 30 Pacientes", "Prontuário IA (3 usos totais)", "Agenda & Financeiro"]'::jsonb, 
    FALSE, 
    1,
    FALSE
),
(
    'Starter', 
    'starter', 
    100.00, 
    'price_1SrN3I2Obfcu36b5MmVEv6qq', 
    '["Até 3 Dentistas", "Até 100 Pacientes", "Prontuário IA (5 usos/dia/dentista)"]'::jsonb, 
    TRUE, 
    2,
    FALSE
),
(
    'Pro', 
    'pro', 
    300.00, 
    'price_1Sz4tG2Obfcu36b5sVI27lo8', 
    '["Até 5 Dentistas", "Pacientes Ilimitados", "Prontuário IA (10 usos/dia/dentista)"]'::jsonb, 
    FALSE, 
    3,
    FALSE
)
ON CONFLICT (slug) DO NOTHING;
