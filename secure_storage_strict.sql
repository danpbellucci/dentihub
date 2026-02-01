
-- ============================================================================
-- SEGURANÇA AVANÇADA DE STORAGE
-- ============================================================================
-- Esta política substitui a anterior. Ela garante que um usuário só pode
-- fazer Upload, Update ou Delete de arquivos que tenham o nome iniciando
-- com o ID da sua própria clínica (ex: "ID_DA_CLINICA-timestamp.png").

-- 1. Remover políticas antigas permissivas
DROP POLICY IF EXISTS "Authenticated Users Upload Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete Logos" ON storage.objects;

-- 2. Política de Upload Restritiva
CREATE POLICY "Upload Logo Propria Clinica"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clinic-logos' 
  AND auth.role() = 'authenticated'
  -- O nome do arquivo DEVE começar com o Clinic ID do usuário
  AND (storage.foldername(name))[1] LIKE (public.get_my_clinic_id()::text || '%')
);

-- 3. Política de Update Restritiva
CREATE POLICY "Update Logo Propria Clinica"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'clinic-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] LIKE (public.get_my_clinic_id()::text || '%')
);

-- 4. Política de Delete Restritiva
CREATE POLICY "Delete Logo Propria Clinica"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'clinic-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] LIKE (public.get_my_clinic_id()::text || '%')
);

-- Nota: A política de SELECT pública permanece, pois os logos são públicos.
