
-- ============================================================================
-- CONFIGURAÇÃO DE SUPER ADMIN (GOD MODE) - VERSÃO SEGURA (Tabela)
-- ============================================================================

-- 1. Criar tabela de admins
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Bloquear acesso direto via API
DROP POLICY IF EXISTS "No API access" ON public.super_admins;
CREATE POLICY "No API access" ON public.super_admins FOR ALL USING (false);

-- Inserir Admin Inicial
INSERT INTO public.super_admins (email)
VALUES ('danilobellucci@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 2. Criar função verificadora
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com privilégios de sistema
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

-- 3. Atualizar Políticas RLS para incluir o bypass do Super Admin

-- --- CLINICS ---
DROP POLICY IF EXISTS "Ver Clinica Vinculada" ON public.clinics;
CREATE POLICY "Ver Clinica Vinculada" ON public.clinics
FOR SELECT USING (
  id = get_my_clinic_id() 
  OR is_super_admin() -- Bypass
);

DROP POLICY IF EXISTS "Owner Gerencia Clinica" ON public.clinics;
CREATE POLICY "Owner Gerencia Clinica" ON public.clinics
FOR ALL USING (
  id = auth.uid() 
  OR is_super_admin() -- Bypass
);

-- --- USER PROFILES ---
DROP POLICY IF EXISTS "Visualizar Perfis" ON public.user_profiles;
CREATE POLICY "Visualizar Perfis" ON public.user_profiles
FOR SELECT USING (
  id = auth.uid() 
  OR clinic_id = get_my_clinic_id()
  OR email = auth.jwt() ->> 'email'
  OR is_super_admin() -- Bypass
);

DROP POLICY IF EXISTS "Atualizar Próprio Perfil" ON public.user_profiles;
CREATE POLICY "Atualizar Próprio Perfil" ON public.user_profiles
FOR UPDATE USING (
  email = auth.jwt() ->> 'email' OR id = auth.uid() OR is_super_admin()
) WITH CHECK (
  id = auth.uid() OR is_super_admin()
);

-- --- CLIENTS ---
DROP POLICY IF EXISTS "Acesso Clients" ON public.clients;
CREATE POLICY "Acesso Clients" ON public.clients
FOR ALL USING ( 
    clinic_id = get_my_clinic_id() 
    OR is_super_admin() 
);

-- --- DENTISTS ---
DROP POLICY IF EXISTS "Acesso Dentists" ON public.dentists;
CREATE POLICY "Acesso Dentists" ON public.dentists
FOR ALL USING ( 
    clinic_id = get_my_clinic_id() 
    OR is_super_admin() 
);

-- --- APPOINTMENTS ---
DROP POLICY IF EXISTS "Acesso Appointments" ON public.appointments;
CREATE POLICY "Acesso Appointments" ON public.appointments
FOR ALL USING ( 
    clinic_id = get_my_clinic_id() 
    OR is_super_admin() 
);

-- --- TRANSACTIONS ---
DROP POLICY IF EXISTS "Acesso Transactions" ON public.transactions;
CREATE POLICY "Acesso Transactions" ON public.transactions
FOR ALL USING ( 
    clinic_id = get_my_clinic_id() 
    OR is_super_admin() 
);

-- --- CLINICAL RECORDS ---
DROP POLICY IF EXISTS "Acesso Records" ON public.clinical_records;
CREATE POLICY "Acesso Records" ON public.clinical_records
FOR ALL USING ( 
    clinic_id = get_my_clinic_id() 
    OR is_super_admin() 
);

-- --- COMMUNICATIONS ---
DROP POLICY IF EXISTS "Acesso Communications" ON public.communications;
CREATE POLICY "Acesso Communications" ON public.communications
FOR ALL USING ( 
    clinic_id = get_my_clinic_id() 
    OR is_super_admin() 
);

-- --- APPOINTMENT REQUESTS ---
DROP POLICY IF EXISTS "Membros Requests" ON public.appointment_requests;
CREATE POLICY "Membros Requests" ON public.appointment_requests
FOR ALL USING ( 
    clinic_id = get_my_clinic_id() 
    OR is_super_admin() 
);

-- --- ROLES & PERMISSIONS ---
DROP POLICY IF EXISTS "Membros leem roles" ON public.clinic_roles;
CREATE POLICY "Membros leem roles" ON public.clinic_roles
FOR SELECT USING (
  clinic_id = get_my_clinic_id() OR is_super_admin()
);

DROP POLICY IF EXISTS "Membros leem permissoes" ON public.role_permissions;
CREATE POLICY "Membros leem permissoes" ON public.role_permissions
FOR SELECT USING (
  clinic_id = get_my_clinic_id() OR is_super_admin()
);

DROP POLICY IF EXISTS "Membros leem notificacoes" ON public.role_notifications;
CREATE POLICY "Membros leem notificacoes" ON public.role_notifications
FOR SELECT USING (
  clinic_id = get_my_clinic_id() OR is_super_admin()
);

DROP POLICY IF EXISTS "Admins gerenciam roles" ON public.clinic_roles;
CREATE POLICY "Admins gerenciam roles" ON public.clinic_roles
FOR ALL USING (
  (clinic_id = get_my_clinic_id() AND (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'administrator')
  OR is_super_admin()
);

DROP POLICY IF EXISTS "Admins gerenciam permissoes" ON public.role_permissions;
CREATE POLICY "Admins gerenciam permissoes" ON public.role_permissions
FOR ALL USING (
  (clinic_id = get_my_clinic_id() AND (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'administrator')
  OR is_super_admin()
);

DROP POLICY IF EXISTS "Admins gerenciam notificacoes" ON public.role_notifications;
CREATE POLICY "Admins gerenciam notificacoes" ON public.role_notifications
FOR ALL USING (
  (clinic_id = get_my_clinic_id() AND (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'administrator')
  OR is_super_admin()
);
