
-- ============================================================================
-- JOB: LEMBRETES URGENTES (12H ANTES)
-- ============================================================================
-- Envia e-mail para pacientes agendados daqui a 12h que ainda estão com status
-- 'scheduled' (não confirmaram nem cancelaram).
-- ============================================================================

-- Remover se já existir para atualizar
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'urgent-reminders-job';

-- Agendar para rodar a cada hora cheia (ex: 08:00, 09:00...)
SELECT cron.schedule(
  'urgent-reminders-job',
  '0 * * * *',
  $$
  select net.http_post(
      url:='https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-urgent-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- NOTA: Substitua 'SUA_SERVICE_ROLE_KEY' e a URL base antes de rodar.
