
-- Tabela para armazenar códigos de verificação de cadastro (OTP)
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segurança: Ninguém deve acessar essa tabela diretamente via API (apenas Service Role)
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public access" ON public.verification_codes;
CREATE POLICY "No public access" ON public.verification_codes
    FOR ALL
    USING (false);

-- Índice para limpeza e busca
CREATE INDEX IF NOT EXISTS idx_verification_email ON public.verification_codes(email);
