
-- 1. Cria a tabela de estoque se não existir
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

-- 2. Índice para performance
CREATE INDEX IF NOT EXISTS idx_inventory_clinic ON public.inventory_items(clinic_id);

-- 3. Habilitar Segurança (RLS)
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- 4. Definir Políticas de Acesso
DROP POLICY IF EXISTS "Acesso Inventory" ON public.inventory_items;

-- Política robusta: tenta usar a função segura get_my_clinic_id, senão usa subquery padrão
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_clinic_id') THEN
        EXECUTE 'CREATE POLICY "Acesso Inventory" ON public.inventory_items FOR ALL USING ( clinic_id = get_my_clinic_id() OR (SELECT auth.jwt() ->> ''email'') = ''[SEU_EMAIL_ADMIN]'' )';
    ELSE
        EXECUTE 'CREATE POLICY "Acesso Inventory" ON public.inventory_items FOR ALL USING ( clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) )';
    END IF;
END
$$;

-- 5. Atualizar restrição de tipos de comunicação para permitir alertas de estoque
ALTER TABLE public.communications DROP CONSTRAINT IF EXISTS communications_type_check;
ALTER TABLE public.communications ADD CONSTRAINT communications_type_check 
    CHECK (type IN ('reminder', 'urgent_reminder', 'birthday', 'agenda', 'recall', 'welcome', 'system', 'marketing_campaign', 'stock_alert', 'support_ticket', 'prescription'));

-- 6. Garantir permissões de acesso à tabela para usuários autenticados
GRANT ALL ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
