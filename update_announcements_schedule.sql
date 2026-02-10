
-- 1. Adicionar coluna start_at (Início do agendamento)
ALTER TABLE public.system_announcements 
ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Atualizar a Política de Segurança (RLS)
-- A mensagem só aparece se: estiver ativa E (já começou) E (ainda não expirou)
DROP POLICY IF EXISTS "Todos leem avisos ativos" ON public.system_announcements;

CREATE POLICY "Todos leem avisos ativos" ON public.system_announcements
    FOR SELECT
    USING (
        is_active = true 
        AND (start_at IS NULL OR start_at <= NOW()) 
        AND (expires_at IS NULL OR expires_at > NOW())
    );
