
-- ============================================================================
-- TABELA DE ATUALIZAÇÃO DE STATUS (INTERAÇÃO POR EMAIL)
-- ============================================================================

-- 1. Criar a tabela
CREATE TABLE IF NOT EXISTS public.appointment_status_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'reschedule')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Segurança (RLS)
ALTER TABLE public.appointment_status_updates ENABLE ROW LEVEL SECURITY;

-- 3. Política: Permitir inserção PÚBLICA
-- Necessário para que o paciente, ao clicar no link do email (sem estar logado),
-- consiga registrar sua resposta.
DROP POLICY IF EXISTS "Public insert status updates" ON public.appointment_status_updates;
CREATE POLICY "Public insert status updates" ON public.appointment_status_updates
    FOR INSERT
    WITH CHECK (true);

-- 4. Política: Permitir leitura/gerenciamento apenas para membros da CLÍNICA
-- Garante que uma clínica não veja as notificações de outra.
DROP POLICY IF EXISTS "Clinic manage status updates" ON public.appointment_status_updates;
CREATE POLICY "Clinic manage status updates" ON public.appointment_status_updates
    FOR ALL
    USING (
      -- Usuário logado pertence à mesma clínica do registro
      clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
      OR 
      -- Super Admin Bypass (opcional, útil para suporte)
      (SELECT auth.jwt() ->> 'email' = 'danilobellucci@gmail.com')
    );
