
-- Agendar a verificação de campanhas de sistema
-- Roda todos os dias às 09:00 AM (Horário de Brasília aprox. 12:00 UTC)

select cron.schedule(
  'system-campaigns-job',
  '0 12 * * *', 
  $$
  select net.http_post(
      url:='https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-system-campaigns',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
