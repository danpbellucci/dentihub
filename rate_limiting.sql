
-- Tabela para logs de rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address TEXT NOT NULL,
    endpoint TEXT DEFAULT 'appointment_request',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por IP e Data (essencial para performance da verificação)
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_time ON public.rate_limit_logs(ip_address, created_at);

-- Política de segurança: Ninguém acessa via API direta (apenas Service Role via Edge Function)
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Remove permissões públicas se existirem
DROP POLICY IF EXISTS "No access for anyone" ON public.rate_limit_logs;
CREATE POLICY "No access for anyone" ON public.rate_limit_logs
    FOR ALL
    USING (false);
