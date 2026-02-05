
-- 1. Atualizar tabela de LEADS (Adiciona colunas de controle se não existirem)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    source TEXT DEFAULT 'landing_page',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona colunas de controle de campanha
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_contact_at') THEN
        ALTER TABLE public.leads ADD COLUMN last_contact_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email_count') THEN
        ALTER TABLE public.leads ADD COLUMN email_count INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'unsubscribed') THEN
        ALTER TABLE public.leads ADD COLUMN unsubscribed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Public insert leads" ON public.leads;
CREATE POLICY "Public insert leads" ON public.leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin select leads" ON public.leads;
CREATE POLICY "Admin select leads" ON public.leads FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Service role manages leads" ON public.leads;
CREATE POLICY "Service role manages leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

-- 2. Configurar Cron Job (Diário às 10:00 AM BRT / 13:00 UTC)
-- Verifica leads antigos (5 dias) e envia e-mail de recuperação
SELECT cron.schedule(
  'leads-followup-job',
  '0 13 * * *',
  $$
  select net.http_post(
      url:='https://cbsyffgbsymujxeodcqh.supabase.co/functions/v1/manage-leads',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"type": "cron_followup"}'::jsonb
  ) as request_id;
  $$
);
