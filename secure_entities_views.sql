
-- ============================================================================
-- SEGURANÇA: PROTEGER DADOS DE CLÍNICAS E DENTISTAS
-- ============================================================================

-- 1. CLÍNICAS
-- Revogar acesso público direto à tabela 'clinics' (protege stripe_id, tier, etc)
DROP POLICY IF EXISTS "Public can view clinic basics" ON public.clinics;

-- É necessário dropar a view antes de recriar se a estrutura de colunas mudar
DROP VIEW IF EXISTS public.public_clinics;

-- Criar View Segura
-- REMOVIDO: coluna 'email' (contato direto deve ser via form/whatsapp)
CREATE OR REPLACE VIEW public.public_clinics AS
SELECT
    id,
    name,
    slug,
    address,
    city,
    state,
    observation,
    logo_url,
    phone,
    whatsapp
FROM public.clinics;

-- 2. DENTISTAS
-- Revogar acesso público direto à tabela 'dentists' (protege cpf, email pessoal, etc)
DROP POLICY IF EXISTS "Public can view dentists" ON public.dentists;
DROP POLICY IF EXISTS "Publico pode ver dentistas da clinica" ON public.dentists;

-- É necessário dropar a view antes de recriar para remover colunas
DROP VIEW IF EXISTS public.public_dentists;

-- Criar View Segura
-- REMOVIDO: coluna 'cro' (privacidade) e 'color' (uso interno apenas)
CREATE OR REPLACE VIEW public.public_dentists AS
SELECT
    id,
    clinic_id,
    name,
    specialties,
    services,
    accepted_plans,
    schedule_config
FROM public.dentists;

-- 3. PERMISSÕES
-- Conceder acesso de leitura às views para público e logados
GRANT SELECT ON public.public_clinics TO anon, authenticated, service_role;
GRANT SELECT ON public.public_dentists TO anon, authenticated, service_role;
