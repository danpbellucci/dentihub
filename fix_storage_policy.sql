
-- Execute este script no Editor SQL do Supabase para corrigir o erro de permissão no upload de logos.

-- Garante que o bucket exista (opcional, já que a imagem mostra que existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-logos', 'clinic-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Segurança (RLS) para o Storage

-- 1. Permitir que qualquer pessoa (público) visualize os logos
DROP POLICY IF EXISTS "Public Access to Logos" ON storage.objects;
CREATE POLICY "Public Access to Logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'clinic-logos' );

-- 2. Permitir que usuários logados façam upload de arquivos
DROP POLICY IF EXISTS "Authenticated Users Upload Logos" ON storage.objects;
CREATE POLICY "Authenticated Users Upload Logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clinic-logos' 
  AND auth.role() = 'authenticated'
);

-- 3. Permitir que usuários logados atualizem/substituam arquivos
DROP POLICY IF EXISTS "Authenticated Users Update Logos" ON storage.objects;
CREATE POLICY "Authenticated Users Update Logos"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'clinic-logos' AND auth.role() = 'authenticated' );

-- 4. Permitir que usuários logados deletem arquivos
DROP POLICY IF EXISTS "Authenticated Users Delete Logos" ON storage.objects;
CREATE POLICY "Authenticated Users Delete Logos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'clinic-logos' AND auth.role() = 'authenticated' );
