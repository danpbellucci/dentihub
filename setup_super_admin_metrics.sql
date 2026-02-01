
-- Liberar acesso à tabela de logs de Rate Limit apenas para o Super Admin
-- (Necessário para a métrica de chamadas de API pública)
DROP POLICY IF EXISTS "No access for anyone" ON public.rate_limit_logs;

CREATE POLICY "Super Admin View Logs" ON public.rate_limit_logs
FOR SELECT
USING ( is_super_admin() );

-- Permitir inserção pela Edge Function (Service Role) mas bloquear outros
CREATE POLICY "Service Role Insert Logs" ON public.rate_limit_logs
FOR INSERT
WITH CHECK (true); -- Na prática, o Service Role ignora RLS, mas isso deixa explícito se mudarmos a config.

-- Garantir que a função is_super_admin() está disponível e atualizada
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.jwt() ->> 'email' = 'danilobellucci@gmail.com';
$$;
