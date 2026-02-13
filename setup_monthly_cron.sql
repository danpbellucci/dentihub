
-- ============================================================================
-- AGENDAMENTO DO RELATÓRIO MENSAL
-- ============================================================================
-- Executa no dia 1 de cada mês às 12:00 UTC (09:00 BRT)
-- ============================================================================

-- Remover agendamento anterior se existir
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'monthly-report-job';

-- Criar novo agendamento
SELECT cron.schedule(
  'monthly-report-job', -- Nome único
  '0 12 1 * *',         -- Min 0, Hora 12, Dia 1, Todo Mês, Todo Ano
  $$
  select net.http_post(
      url:='https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-monthly-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- Nota: Substitua SUA_SERVICE_ROLE_KEY e a URL do projeto se necessário.
