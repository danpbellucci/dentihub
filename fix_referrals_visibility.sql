
-- Habilitar RLS na tabela clinics (garantia)
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Remover política anterior se existir (para evitar duplicação ou conflito)
DROP POLICY IF EXISTS "View Referred Clinics" ON public.clinics;

-- Criar política que permite visualizar clínicas onde 'referred_by' é igual ao ID da clínica do usuário logado
CREATE POLICY "View Referred Clinics" ON public.clinics
FOR SELECT
USING (
  referred_by IN (
      SELECT clinic_id 
      FROM public.user_profiles 
      WHERE id = auth.uid()
  )
);
