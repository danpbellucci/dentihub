
-- ==============================================================================
-- CORREÇÃO DE RECURSÃO INFINITA (ERRO 42P17)
-- ==============================================================================

-- 1. Cria uma função segura para buscar o clinic_id do usuário atual
--    'SECURITY DEFINER' faz a função rodar com permissões de admin,
--    ignorando o RLS da tabela user_profiles e evitando o loop infinito.
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT clinic_id 
  FROM public.user_profiles 
  WHERE id = auth.uid() 
  LIMIT 1;
$$;

-- 2. Recriar Políticas da Tabela USER_PROFILES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver perfis da mesma clinica" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Permitir leitura por email para vinculo" ON public.user_profiles;
DROP POLICY IF EXISTS "Permitir auto-vinculo de perfil" ON public.user_profiles;

-- Política de Leitura:
-- O usuário pode ver a si mesmo (pelo ID)
-- OU pode ver outros usuários se o clinic_id deles for igual ao retornado pela função segura.
CREATE POLICY "Visualizar Perfis" ON public.user_profiles
FOR SELECT
USING (
  id = auth.uid() 
  OR 
  clinic_id = get_my_clinic_id()
  OR
  email = auth.jwt() ->> 'email' -- Necessário para o vínculo inicial por e-mail
);

-- Política de Atualização (Para Auto-Vínculo):
CREATE POLICY "Atualizar Próprio Perfil" ON public.user_profiles
FOR UPDATE
USING (
  email = auth.jwt() ->> 'email' OR id = auth.uid()
)
WITH CHECK (
  id = auth.uid() -- Só permite atualizar se o ID final for o do usuário logado
);

-- Política de Inserção (Admin ou Sistema):
CREATE POLICY "Criar Perfil" ON public.user_profiles
FOR INSERT
WITH CHECK (true);

-- Política de Exclusão (Admin):
CREATE POLICY "Deletar Perfil" ON public.user_profiles
FOR DELETE
USING (
  clinic_id = get_my_clinic_id() 
  AND 
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'administrator'
);

-- 3. Atualizar Políticas das Outras Tabelas para usar a Função (Mais Rápido)

-- Clinics
DROP POLICY IF EXISTS "Membros podem ver sua clinica" ON public.clinics;
DROP POLICY IF EXISTS "Admin vê sua clinica" ON public.clinics;

CREATE POLICY "Ver Clinica Vinculada" ON public.clinics
FOR SELECT USING (
  id = get_my_clinic_id()
);

-- Clients
DROP POLICY IF EXISTS "Acesso total a membros da clinica" ON public.clients;
CREATE POLICY "Acesso Clients" ON public.clients
FOR ALL USING ( clinic_id = get_my_clinic_id() );

-- Dentists
DROP POLICY IF EXISTS "Acesso total a membros da clinica" ON public.dentists;
CREATE POLICY "Acesso Dentists" ON public.dentists
FOR ALL USING ( clinic_id = get_my_clinic_id() );

-- Appointments
DROP POLICY IF EXISTS "Acesso total a membros da clinica" ON public.appointments;
CREATE POLICY "Acesso Appointments" ON public.appointments
FOR ALL USING ( clinic_id = get_my_clinic_id() );

-- Transactions
DROP POLICY IF EXISTS "Acesso total a membros da clinica" ON public.transactions;
CREATE POLICY "Acesso Transactions" ON public.transactions
FOR ALL USING ( clinic_id = get_my_clinic_id() );

-- Clinical Records
DROP POLICY IF EXISTS "Acesso total a membros da clinica" ON public.clinical_records;
CREATE POLICY "Acesso Records" ON public.clinical_records
FOR ALL USING ( clinic_id = get_my_clinic_id() );

-- Appointment Requests (Mantém INSERT público, ALL para membros)
DROP POLICY IF EXISTS "Membros gerenciam solicitacoes" ON public.appointment_requests;
DROP POLICY IF EXISTS "Publico pode criar solicitacoes" ON public.appointment_requests;

CREATE POLICY "Membros Requests" ON public.appointment_requests
FOR ALL USING ( clinic_id = get_my_clinic_id() );

CREATE POLICY "Publico Requests" ON public.appointment_requests
FOR INSERT WITH CHECK (true);
