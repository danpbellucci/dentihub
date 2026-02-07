
-- Adiciona a coluna de controle de override manual
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT FALSE;

-- Opcional: Se quiser garantir que a coluna apareça nas views de segurança (embora views criadas sem * não peguem automaticamente, para este caso específico de uso interno do sistema, basta a tabela)
