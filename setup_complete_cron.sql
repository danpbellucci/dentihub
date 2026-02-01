
-- ============================================================================
-- SCRIPT DE LIMPEZA E CORREÇÃO FINAL DE CRON JOBS
-- ============================================================================
-- Este script remove especificamente os jobs duplicados identificados e
-- recria a configuração padrão correta.
--
-- Instruções:
-- 1. Substitua 'https://cbsyffgbsymujxeodcqh.supabase.co' pela URL do seu projeto.
-- 2. Substitua 'SUA_SERVICE_ROLE_KEY' pela chave 'service_role' do Supabase.
-- 3. Execute no SQL Editor.
-- ============================================================================

-- 1. REMOVER JOBS ANTIGOS/DUPLICADOS (Baseado na sua imagem)
-- Usamos SELECT cron.unschedule para evitar erro se já tiverem sido removidos.

-- Remove duplicatas de lembretes
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-reminders-hourly';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'hourly-reminders-job'; 

-- Remove duplicatas de agenda
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-daily-agenda-18h';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-agenda-job';

-- Remove outros jobs para garantir limpeza
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-finance-job';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-birthday-job';


-- 2. RECRIAÇÃO DOS JOBS OFICIAIS (Apenas 1 de cada tipo)

-- A. Agenda Diária (22:00 UTC = 19:00 BRT)
SELECT cron.schedule(
  'daily-agenda-job',
  '0 22 * * *',
  $$
  select net.http_post(
      url:='https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-daily-agenda',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- B. Resumo Financeiro (22:15 UTC = 19:15 BRT)
SELECT cron.schedule(
  'daily-finance-job',
  '15 22 * * *',
  $$
  select net.http_post(
      url:='https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-daily-finance',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- C. Lembretes de Consulta (Rodar a cada HORA cheia)
-- A função verifica agendamentos entre 23h e 24h a frente.
SELECT cron.schedule(
  'hourly-reminders-job',
  '0 * * * *',
  $$
  select net.http_post(
      url:='https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- D. Aniversariantes do Dia (11:00 UTC = 08:00 BRT)
SELECT cron.schedule(
  'daily-birthday-job',
  '0 11 * * *',
  $$
  select net.http_post(
      url:='https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-birthday-emails',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- 3. GARANTIR FUNÇÃO DE ANIVERSÁRIO
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
SECURITY DEFINER
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
