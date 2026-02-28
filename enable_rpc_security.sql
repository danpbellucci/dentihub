
-- ============================================================================
-- SEGURANÇA FRONTEND: EXPOR CHECAGEM DE ADMIN
-- ============================================================================

-- Garante que a função existe (caso não tenha rodado os scripts anteriores)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Roda com privilégios de sistema para ler o JWT com segurança
STABLE
AS $$
  -- A lógica fica 100% no banco de dados. 
  -- Se você mudar o e-mail aqui, o frontend atualiza automaticamente.
  SELECT auth.jwt() ->> 'email' = '[SEU_EMAIL_ADMIN]';
$$;

-- Permite que usuários logados (authenticated) chamem esta função via supabase.rpc()
GRANT EXECUTE ON FUNCTION public.is_super_admin TO authenticated;
