
-- ============================================================================
-- ATUALIZAÇÃO DE SEGURANÇA: TABELA DE SUPER ADMINS
-- ============================================================================
-- Substitui a verificação de string fixa ('email' = '...') por uma tabela dinâmica.

-- 1. Criar a tabela de Super Admins
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid()
);

-- 2. Habilitar RLS (Segurança)
-- Ninguém acessa essa tabela via API pública. Apenas funções do sistema (Security Definer).
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public access super_admins" ON public.super_admins;
CREATE POLICY "No public access super_admins" ON public.super_admins
    FOR ALL
    USING (false);

-- 3. Migrar o Admin Atual (Seed)
-- Insere o admin atual automaticamente para não perder acesso.
INSERT INTO public.super_admins (email)
VALUES ('[SEU_EMAIL_ADMIN]')
ON CONFLICT (email) DO NOTHING;

-- 4. Atualizar a Função is_super_admin()
-- Agora ela verifica se o e-mail do JWT existe na tabela super_admins.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões de admin para poder ler a tabela super_admins
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.super_admins 
    WHERE email = (auth.jwt() ->> 'email')
  );
END;
$$;

-- 5. Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin TO service_role;
