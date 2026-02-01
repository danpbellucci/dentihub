
-- Tabela para armazenar leads (emails da landing page)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    source TEXT DEFAULT 'landing_page_plans',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Política: Permitir inserção pública (qualquer pessoa pode se cadastrar na landing page)
DROP POLICY IF EXISTS "Public insert leads" ON public.leads;
CREATE POLICY "Public insert leads" ON public.leads
    FOR INSERT
    WITH CHECK (true);

-- Política: Apenas administradores (Super Admin) podem ver os leads
DROP POLICY IF EXISTS "Admin select leads" ON public.leads;
CREATE POLICY "Admin select leads" ON public.leads
    FOR SELECT
    USING (public.is_super_admin());
