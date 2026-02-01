
-- ============================================================================
-- CONFIGURAÇÃO DE AGENDAMENTO DE E-MAILS (CRON JOBS)
-- ============================================================================
-- Instruções:
-- 1. Substitua 'https://SEU_PROJETO.supabase.co' pela URL do seu projeto.
-- 2. Substitua 'SUA_SERVICE_ROLE_KEY' pela chave 'service_role' (secret) do seu projeto.
-- 3. Execute este script no SQL Editor do Supabase.
-- ============================================================================

-- Habilitar as extensões necessárias (se ainda não estiverem habilitadas)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1. JOB: Agenda Diária (Envia às 22:00 UTC = 19:00 Brasília)
-- Verifica a tabela 'role_notifications' para saber quem deve receber.
select cron.schedule(
  'daily-agenda-job', -- Nome único do job
  '0 22 * * *',       -- Cronograma (Minuto 0, Hora 22 UTC)
  $$
  select net.http_post(
      url:='https://SEU_PROJETO.supabase.co/functions/v1/send-daily-agenda',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- 2. JOB: Resumo Financeiro (Envia às 22:15 UTC = 19:15 Brasília)
-- Envia previsão de recebimentos e contas a pagar do dia seguinte.
select cron.schedule(
  'daily-finance-job', -- Nome único do job
  '15 22 * * *',       -- Cronograma (Minuto 15, Hora 22 UTC)
  $$
  select net.http_post(
      url:='https://SEU_PROJETO.supabase.co/functions/v1/send-daily-finance',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- 3. JOB: Lembretes de Consulta (Roda a cada hora)
-- (Opcional: Garante que os lembretes de 24h rodem periodicamente)
select cron.schedule(
  'hourly-reminders-job',
  '0 * * * *', -- Todo começo de hora
  $$
  select net.http_post(
      url:='https://SEU_PROJETO.supabase.co/functions/v1/send-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- Para ver os jobs agendados:
-- select * from cron.job;

-- Para remover um job (se precisar corrigir):
-- select cron.unschedule('daily-agenda-job');
