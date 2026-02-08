
-- Execute este script no SQL Editor do Supabase para corrigir o erro na página de Assinaturas

-- 1. Adiciona a coluna de controle manual de assinatura
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT FALSE;

-- 2. Atualiza a view de segurança para refletir a nova coluna (se necessário para admin)
-- (Opcional, pois o Super Admin geralmente acessa a tabela diretamente, mas é boa prática)
COMMENT ON COLUMN public.clinics.is_manual_override IS 'Indica se o plano foi definido manualmente pelo Super Admin, ignorando o Stripe';
