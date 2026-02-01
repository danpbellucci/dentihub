
-- Cria o bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-files', 'patient-files', false) -- Private bucket for security
ON CONFLICT (id) DO NOTHING;

-- Políticas de Segurança (RLS) para patient-files

-- 1. Permitir SELECT (Download/Visualização) para membros da clínica
-- A estrutura de pastas é: {clinic_id}/{client_id}/{filename}
-- O usuário deve pertencer à clinic_id que está na pasta raiz do arquivo.
DROP POLICY IF EXISTS "View Patient Files" ON storage.objects;
CREATE POLICY "View Patient Files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-files' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT clinic_id::text FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);

-- 2. Permitir INSERT (Upload) para membros da clínica
DROP POLICY IF EXISTS "Upload Patient Files" ON storage.objects;
CREATE POLICY "Upload Patient Files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-files' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT clinic_id::text FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);

-- 3. Permitir DELETE para membros da clínica
DROP POLICY IF EXISTS "Delete Patient Files" ON storage.objects;
CREATE POLICY "Delete Patient Files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patient-files' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (SELECT clinic_id::text FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);
