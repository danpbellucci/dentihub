
-- ============================================================================
-- ADICIONAR RESTRIÇÃO: CPF ÚNICO POR CLÍNICA
-- ============================================================================
-- Este script garante que não possam existir dois pacientes com o mesmo CPF
-- dentro da mesma clínica.

-- 1. Primeiro, tentamos limpar duplicatas existentes (Opcional, mas recomendado)
-- Mantém o registro mais recente e deleta os antigos duplicados.
DELETE FROM public.clients c1
USING public.clients c2
WHERE c1.id < c2.id 
  AND c1.cpf = c2.cpf 
  AND c1.clinic_id = c2.clinic_id
  AND c1.cpf IS NOT NULL 
  AND c1.cpf != '';

-- 2. Adicionar a restrição (Constraint)
ALTER TABLE public.clients
ADD CONSTRAINT clients_cpf_clinic_unique UNIQUE (clinic_id, cpf);

-- Nota: Se o comando acima falhar, significa que ainda existem duplicatas que
-- precisam ser resolvidas manualmente ou que o script de limpeza não foi suficiente.
