-- SQL para testar as Edge Functions do DentiHub
-- Este script utiliza a extensão pg_net para realizar chamadas HTTP.
-- Certifique-se de que a extensão pg_net está habilitada no seu projeto Supabase.

-- IMPORTANTE: Substitua '<YOUR_SERVICE_ROLE_KEY>' pela sua chave Service Role real.
-- Você pode encontrar essa chave em Settings > API no seu painel do Supabase.

-- 1. Testar Relatório Diário Super Admin
SELECT net.http_post(
    url := 'https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-super-admin-daily-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{"testMode": true, "testEmail": "[SEU_EMAIL_ADMIN]"}'::jsonb
);

-- 2. Testar Previsão Financeira (7 dias)
SELECT net.http_post(
    url := 'https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-daily-finance',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{"testMode": true, "testEmail": "[SEU_EMAIL_ADMIN]"}'::jsonb
);

-- 3. Testar Relatório Mensal
SELECT net.http_post(
    url := 'https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-monthly-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{"testMode": true, "testEmail": "[SEU_EMAIL_ADMIN]"}'::jsonb
);

-- 4. Testar Campanhas de Sistema (Ativação)
SELECT net.http_post(
    url := 'https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-system-campaigns',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{"testMode": true, "testEmail": "[SEU_EMAIL_ADMIN]"}'::jsonb
);

-- 5. Testar Processamento de Leads
SELECT net.http_post(
    url := 'https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/manage-leads',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{"type": "process", "testMode": true, "testEmail": "[SEU_EMAIL_ADMIN]"}'::jsonb
);

-- 6. Testar Lembretes de Agendamento (24h)
SELECT net.http_post(
    url := 'https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{"testMode": true, "testEmail": "[SEU_EMAIL_ADMIN]"}'::jsonb
);

-- 7. Testar Lembretes Urgentes (2h)
SELECT net.http_post(
    url := 'https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/send-urgent-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{"testMode": true, "testEmail": "[SEU_EMAIL_ADMIN]"}'::jsonb
);

-- DICA: Para ver os resultados das chamadas, consulte a tabela 'net.http_responses'
-- SELECT * FROM net.http_responses ORDER BY created_at DESC LIMIT 10;
