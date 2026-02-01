
-- ============================================================================
-- JOB: RELATÓRIO DIÁRIO DO SUPER ADMIN
-- ============================================================================
-- Envia um resumo das métricas globais do sistema para o Super Admin.
-- Horário: 23:55 UTC (Final do dia)
-- ============================================================================

-- Garantir extensões necessárias
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remover agendamento anterior de forma segura (não falha se não existir)
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'super-admin-daily-report-job';

-- Criar novo agendamento
SELECT cron.schedule(
  'super-admin-daily-report-job', -- Nome único do job
  '55 23 * * *',                  -- 23:55 UTC todos os dias
  $$
  select net.http_post(
      url:='https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-super-admin-daily-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- NOTA: Substitua 'SUA_SERVICE_ROLE_KEY' pela chave real do projeto antes de executar no SQL Editor do Supabase.
-- NOTA: Substitua a URL base 'https://cbsyffgbsymujxeodcqh.supabase.co' pela URL correta do seu projeto se for diferente.
