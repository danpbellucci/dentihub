
-- Remove a restrição antiga que impedia o mesmo e-mail em clínicas diferentes
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_email_key;

-- Adiciona a nova restrição: O e-mail deve ser único APENAS dentro da mesma clínica
-- Isso permite que o mesmo e-mail seja funcionário na Clínica A e na Clínica B
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_email_clinic_key UNIQUE (email, clinic_id);
