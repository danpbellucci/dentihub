
-- Tabela para armazenar configurações de notificação por papel (role)
CREATE TABLE IF NOT EXISTS public.role_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'administrator', 'dentist', 'employee', ou custom
    notification_type TEXT NOT NULL, -- 'agenda_daily', 'finance_daily'
    is_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, role, notification_type)
);

-- Habilitar RLS
ALTER TABLE public.role_notifications ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: Membros veem as configurações
CREATE POLICY "Membros leem notificacoes" ON public.role_notifications
FOR SELECT
USING (
  clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);

-- Política de Escrita: Apenas administradores
CREATE POLICY "Admins gerenciam notificacoes" ON public.role_notifications
FOR ALL
USING (
  clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  AND 
  (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'administrator'
);
