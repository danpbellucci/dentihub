
-- ============================================================================
-- SEGURANÇA DE STORAGE: VALIDAÇÃO SERVER-SIDE (Tamanho e Tipo)
-- ============================================================================
-- Este script atualiza as políticas de RLS para impedir que usuários (mesmo autenticados)
-- façam upload de arquivos que não atendam aos critérios de segurança, mitigando
-- o risco de bypass da validação do front-end.

-- 1. BUCKET: CLINIC-LOGOS (Usado em SettingsPage)
-- Regras: Máximo 5MB, Apenas Imagens (image/*)

DROP POLICY IF EXISTS "Upload Logo Propria Clinica" ON storage.objects;

CREATE POLICY "Upload Logo Propria Clinica"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clinic-logos'
  AND auth.role() = 'authenticated'
  -- Garante isolamento entre clínicas (Tenant Isolation)
  AND (storage.foldername(name))[1] LIKE (public.get_my_clinic_id()::text || '%')
  -- Validação de Tamanho: Máximo 5MB (5 * 1024 * 1024 bytes)
  AND (metadata->>'size')::int <= 5242880
  -- Validação de Tipo: Apenas Imagens
  AND metadata->>'mimetype' LIKE 'image/%'
);

-- 2. BUCKET: PATIENT-FILES (Prontuários/Documentos)
-- Regras: Máximo 10MB, Imagens ou PDF

DROP POLICY IF EXISTS "Upload Patient Files" ON storage.objects;

CREATE POLICY "Upload Patient Files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-files'
  AND auth.role() = 'authenticated'
  -- Garante isolamento entre clínicas
  AND (storage.foldername(name))[1] LIKE (public.get_my_clinic_id()::text || '%')
  -- Validação de Tamanho: Máximo 10MB (10 * 1024 * 1024 bytes)
  AND (metadata->>'size')::int <= 10485760
  -- Validação de Tipo: Imagens ou PDF
  AND (
    metadata->>'mimetype' LIKE 'image/%' 
    OR 
    metadata->>'mimetype' = 'application/pdf'
  )
);

-- Nota: As políticas de UPDATE e DELETE já existentes garantem apenas o isolamento de tenant,
-- mas a restrição de tipo/tamanho é crucial no INSERT (Upload).
