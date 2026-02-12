
-- Adiciona coluna JSONB para armazenar o estado estruturado do odontograma
-- Isso permite salvar { "18": ["carie"], "21": ["implant"] } diretamente
ALTER TABLE public.clinical_records 
ADD COLUMN IF NOT EXISTS tooth_data JSONB;

-- Atualiza a política de segurança para permitir que a coluna seja acessada
-- (As políticas existentes de "Acesso Records" já cobrem ALL columns, então geralmente não precisa de alteração extra, 
-- mas garantimos que o cache de schema seja atualizado)
NOTIFY pgrst, 'reload config';
