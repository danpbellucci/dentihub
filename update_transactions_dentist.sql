
-- Adiciona a coluna dentist_id na tabela transactions
-- Se for NULL, considera-se uma transação da CLÍNICA (Geral)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS dentist_id UUID REFERENCES public.dentists(id) ON DELETE SET NULL;

-- Atualiza a view de segurança (caso exista alguma restrita que precise ler essa coluna, 
-- mas a política RLS atual já cobre ALL columns para autenticados)
