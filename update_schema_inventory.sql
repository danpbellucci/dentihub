
-- Tabela para controle de estoque
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity INT DEFAULT 0,
    min_quantity INT DEFAULT 5,
    unit TEXT, -- Unidade, Peça, Litro, Caixa
    category TEXT, -- Descartável, Instrumento, Medicamento
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_inventory_clinic ON public.inventory_items(clinic_id);

-- Habilitar RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Política de Acesso (Leitura e Escrita) para membros da clínica
DROP POLICY IF EXISTS "Acesso Inventory" ON public.inventory_items;
CREATE POLICY "Acesso Inventory" ON public.inventory_items
FOR ALL USING ( 
    clinic_id = get_my_clinic_id() 
    OR is_super_admin() 
);
