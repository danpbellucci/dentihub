
-- Tabela para armazenar permissões de acesso por módulo e papel
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('dentist', 'employee')),
    module TEXT NOT NULL, -- Identificador da página (ex: 'finance', 'calendar')
    is_allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, role, module)
);

-- Habilitar RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: Todos os membros da clínica podem ler as permissões (para saberem o que podem acessar)
CREATE POLICY "Membros leem permissoes" ON public.role_permissions
FOR SELECT
USING (
  clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);

-- Política de Escrita: Apenas administradores podem modificar
CREATE POLICY "Admins gerenciam permissoes" ON public.role_permissions
FOR ALL
USING (
  clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  AND 
  (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'administrator'
);
