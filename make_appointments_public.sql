
-- ============================================================================
-- HABILITAR LEITURA PÚBLICA EM AGENDAMENTOS
-- ============================================================================
-- Conforme solicitado, esta política permite que qualquer pessoa (anon ou authenticated)
-- visualize os agendamentos. Isso é usado para verificar a disponibilidade de horários
-- na página pública de agendamento.

-- Garante que RLS está ativo
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Remove política antiga de leitura pública se existir para evitar conflitos
DROP POLICY IF EXISTS "Public read access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public read access" ON public.appointments;

-- Cria a nova política permissiva para SELECT
CREATE POLICY "Public read access to appointments"
ON public.appointments
FOR SELECT
TO public -- 'public' inclui roles 'anon' e 'authenticated'
USING (true); -- Permite ler qualquer linha (necessário para ver horários ocupados)
