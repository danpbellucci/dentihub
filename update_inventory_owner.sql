
-- Adiciona a coluna dentist_id para vincular itens a um dentista específico
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS dentist_id UUID REFERENCES public.dentists(id) ON DELETE SET NULL;

-- Atualiza permissões (se necessário)
GRANT ALL ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
