
-- 1. Remover a restrição de CHECK na tabela user_profiles para permitir novos nomes de roles
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2. Remover a restrição de CHECK na tabela role_permissions
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;

-- 3. Criar tabela para armazenar os perfis personalizados da clínica
CREATE TABLE IF NOT EXISTS public.clinic_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: 'receptionist'
    label TEXT NOT NULL, -- Ex: 'Recepcionista'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, name)
);

-- 4. Habilitar RLS para clinic_roles
ALTER TABLE public.clinic_roles ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso para clinic_roles
CREATE POLICY "Membros leem roles" ON public.clinic_roles
FOR SELECT USING (
  clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);

CREATE POLICY "Admins gerenciam roles" ON public.clinic_roles
FOR ALL USING (
  clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  AND 
  (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'administrator'
);
