
-- 1. Remover a restrição de verificação antiga (se existir) para permitir novos tipos
ALTER TABLE public.communications DROP CONSTRAINT IF EXISTS communications_type_check;

-- 2. Adicionar nova restrição incluindo 'system' e 'marketing'
ALTER TABLE public.communications 
ADD CONSTRAINT communications_type_check 
CHECK (type IN ('reminder', 'birthday', 'agenda', 'recall', 'welcome', 'system', 'marketing_campaign'));

-- 3. Índice para evitar envios duplicados (Performance)
CREATE INDEX IF NOT EXISTS idx_comms_recipient_subject ON public.communications(recipient_email, subject);
