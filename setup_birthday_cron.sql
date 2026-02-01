
-- ============================================================================
-- 1. CRIAR FUNÇÃO RPC PARA BUSCAR ANIVERSARIANTES
-- ============================================================================
-- Esta função retorna clientes que fazem aniversário hoje, junto com dados da clínica.
-- Ignora o ano de nascimento para matching.

CREATE OR REPLACE FUNCTION public.get_birthdays_today()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  clinic_id UUID,
  clinic_name TEXT,
  clinic_email TEXT
) 
LANGUAGE sql
SECURITY DEFINER -- Roda como admin para poder ler dados de todas as clínicas
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.name,
    c.email,
    c.clinic_id,
    cl.name as clinic_name,
    cl.email as clinic_email
  FROM 
    public.clients c
  JOIN 
    public.clinics cl ON c.clinic_id = cl.id
  WHERE 
    c.email IS NOT NULL 
    AND c.birth_date IS NOT NULL
    AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM c.birth_date) = EXTRACT(DAY FROM CURRENT_DATE);
$$;

-- ============================================================================
-- 2. AGENDAR CRON JOB (08:00 BRT)
-- ============================================================================
-- Horário de Brasília (UTC-3) -> 08:00 BRT = 11:00 UTC.
-- ATENÇÃO: Substitua 'SUA_SERVICE_ROLE_KEY' e 'https://SEU_PROJETO.supabase.co' 
-- pelas suas credenciais reais antes de rodar.

select cron.schedule(
  'daily-birthday-job', -- Nome único
  '0 11 * * *',         -- 11:00 UTC (08:00 BRT)
  $$
  select net.http_post(
      url:='https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-birthday-emails',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
