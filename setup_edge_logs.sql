
-- Tabela para logar execuções de Edge Functions
CREATE TABLE IF NOT EXISTS public.edge_function_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    function_name TEXT NOT NULL, -- ex: 'process-audio', 'send-emails'
    metadata JSONB DEFAULT '{}'::jsonb, -- Dados extras (ex: duração, user_id)
    status TEXT DEFAULT 'success',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para performance em dashboards baseados em data
CREATE INDEX IF NOT EXISTS idx_edge_logs_created_at ON public.edge_function_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_edge_logs_function_name ON public.edge_function_logs(function_name);

-- Habilitar RLS
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

-- 1. Ninguém pode acessar publicamente
DROP POLICY IF EXISTS "No public access" ON public.edge_function_logs;
DROP POLICY IF EXISTS "Super Admin View Logs" ON public.edge_function_logs;
DROP POLICY IF EXISTS "Service Role Insert Logs" ON public.edge_function_logs;

-- 2. Apenas Super Admin pode LER
CREATE POLICY "Super Admin View Logs" ON public.edge_function_logs
FOR SELECT
USING ( is_super_admin() );

-- 3. Service Role (Edge Functions) pode INSERIR (Bypass RLS nativo do Supabase Client Admin, mas boa prática definir)
CREATE POLICY "Service Role Insert Logs" ON public.edge_function_logs
FOR INSERT
WITH CHECK (true);
