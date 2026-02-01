
-- Tabela para armazenar as interações dos pacientes com o e-mail de lembrete
CREATE TABLE IF NOT EXISTS public.appointment_status_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'reschedule')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.appointment_status_updates ENABLE ROW LEVEL SECURITY;

-- 1. Permitir inserção pública (Pacientes clicam no link sem estar logados)
DROP POLICY IF EXISTS "Public insert status updates" ON public.appointment_status_updates;
CREATE POLICY "Public insert status updates" ON public.appointment_status_updates
    FOR INSERT
    WITH CHECK (true);

-- 2. Permitir leitura/gerenciamento apenas para membros da clínica (via função segura ou direta)
DROP POLICY IF EXISTS "Clinic manage status updates" ON public.appointment_status_updates;
CREATE POLICY "Clinic manage status updates" ON public.appointment_status_updates
    FOR ALL
    USING (
      clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
      OR 
      (SELECT auth.jwt() ->> 'email' = 'danilobellucci@gmail.com') -- Super Admin Bypass
    );
