
-- 1. Remover a restrição antiga
ALTER TABLE public.communications DROP CONSTRAINT IF EXISTS communications_type_check;

-- 2. Adicionar nova restrição incluindo 'urgent_reminder'
ALTER TABLE public.communications 
ADD CONSTRAINT communications_type_check 
CHECK (type IN ('reminder', 'urgent_reminder', 'birthday', 'agenda', 'recall', 'welcome', 'system', 'marketing_campaign'));
