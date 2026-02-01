
-- ============================================================================
-- SEGURANÇA: PROTEGER DADOS FINANCEIROS (AMOUNT)
-- ============================================================================

-- 1. Revogar o acesso público direto à tabela 'appointments'
-- Isso impede que usuários anônimos leiam colunas sensíveis como 'amount' e 'client_id'
DROP POLICY IF EXISTS "Public read access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public read access" ON public.appointments;

-- 2. Criar uma VIEW (Tabela Virtual) apenas com dados seguros
-- Esta view expõe APENAS o necessário para calcular disponibilidade.
CREATE OR REPLACE VIEW public.public_appointments AS
SELECT 
    dentist_id,
    start_time,
    end_time,
    status
FROM 
    public.appointments
WHERE 
    status != 'cancelled'; -- Já filtramos cancelados direto na view

-- 3. Conceder permissão de leitura na VIEW para o público (anon) e logados
GRANT SELECT ON public.public_appointments TO anon, authenticated, service_role;

-- Nota: O Dashboard (admin) continua acessando a tabela 'appointments' original
-- através das políticas RLS de autenticação já existentes.
