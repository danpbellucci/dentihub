
-- ============================================================================
-- SCRIPT DE CORREÇÃO DE STORAGE (PATIENT-FILES)
-- ============================================================================
-- Execute este script no SQL Editor do Supabase para corrigir o erro "RLS Policy".

-- 1. Garante que o bucket exista (Privado para segurança)
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-files', 'patient-files', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Remove políticas antigas (conflitantes ou restritivas demais)
DROP POLICY IF EXISTS "Upload Patient Files" ON storage.objects;
DROP POLICY IF EXISTS "View Patient Files" ON storage.objects;
DROP POLICY IF EXISTS "Delete Patient Files" ON storage.objects;

-- 3. RECRIAR POLÍTICAS SEGURAS E FUNCIONAIS

-- INSERT (Upload)
-- Permite que usuários autenticados façam upload, desde que o caminho comece com o ID da sua clínica.
-- Removemos a validação estrita de metadata por enquanto para garantir compatibilidade.
CREATE POLICY "Upload Patient Files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-files'
  AND auth.role() = 'authenticated'
  -- Garante que o usuário só grave na pasta da própria clínica
  -- (storage.foldername(name))[1] retorna a primeira parte do path (clinic_id)
  AND (storage.foldername(name))[1] = public.get_my_clinic_id()::text
);

-- SELECT (Download/Visualização)
-- Permite ver arquivos da própria clínica
CREATE POLICY "View Patient Files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = public.get_my_clinic_id()::text
);

-- DELETE (Exclusão)
-- Permite apagar arquivos da própria clínica
CREATE POLICY "Delete Patient Files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patient-files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = public.get_my_clinic_id()::text
);

-- 4. Garante permissões de execução na função auxiliar (caso não tenha)
GRANT EXECUTE ON FUNCTION public.get_my_clinic_id TO authenticated;
