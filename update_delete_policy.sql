
-- HABILITAR RLS NA TABELA DE DENTISTAS (SE JÁ NÃO ESTIVER)
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;

-- REMOVER POLÍTICAS ANTIGAS DE EXCLUSÃO (PARA EVITAR CONFLITOS)
DROP POLICY IF EXISTS "Enable delete access for clinic admins" ON public.dentists;
DROP POLICY IF EXISTS "Delete dentist" ON public.dentists;

-- CRIAR POLÍTICA DE EXCLUSÃO: PERMITE QUE O DONO DA CLÍNICA EXCLUA DENTISTAS
-- Utiliza a função helper get_my_clinic_id() se existir, ou verifica diretamente
CREATE POLICY "Enable delete access for clinic admins" ON public.dentists
FOR DELETE
USING (
  clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid())
);

-- NOTA: Se você ainda tiver problemas de chave estrangeira (FK),
-- certifique-se de que o código Frontend está transferindo os registros dependentes
-- (Agendamentos, Prontuários, Solicitações) antes de tentar a exclusão.
