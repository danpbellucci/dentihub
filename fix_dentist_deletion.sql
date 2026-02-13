
-- ============================================================================
-- CORREÇÃO DE EXCLUSÃO DE DENTISTAS (FOREIGN KEYS)
-- ============================================================================
-- Este script altera o comportamento das chaves estrangeiras.
-- Ao excluir um dentista, os registros vinculados (prontuários, agendamentos, etc)
-- NÃO serão apagados. O campo 'dentist_id' ficará NULL, preservando o histórico.

-- 1. Clinical Records (Prontuários - O erro principal do print)
ALTER TABLE public.clinical_records 
DROP CONSTRAINT IF EXISTS clinical_records_dentist_id_fkey;

ALTER TABLE public.clinical_records
ADD CONSTRAINT clinical_records_dentist_id_fkey
FOREIGN KEY (dentist_id) REFERENCES public.dentists(id)
ON DELETE SET NULL;

-- 2. Appointments (Agendamentos)
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_dentist_id_fkey;

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_dentist_id_fkey
FOREIGN KEY (dentist_id) REFERENCES public.dentists(id)
ON DELETE SET NULL;

-- 3. Transactions (Financeiro - Comissões/Vínculos)
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_dentist_id_fkey;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_dentist_id_fkey
FOREIGN KEY (dentist_id) REFERENCES public.dentists(id)
ON DELETE SET NULL;

-- 4. Inventory Items (Itens de Estoque do Dentista)
ALTER TABLE public.inventory_items
DROP CONSTRAINT IF EXISTS inventory_items_dentist_id_fkey;

ALTER TABLE public.inventory_items
ADD CONSTRAINT inventory_items_dentist_id_fkey
FOREIGN KEY (dentist_id) REFERENCES public.dentists(id)
ON DELETE SET NULL;

-- 5. Appointment Requests (Solicitações Online)
ALTER TABLE public.appointment_requests
DROP CONSTRAINT IF EXISTS appointment_requests_dentist_id_fkey;

ALTER TABLE public.appointment_requests
ADD CONSTRAINT appointment_requests_dentist_id_fkey
FOREIGN KEY (dentist_id) REFERENCES public.dentists(id)
ON DELETE SET NULL;
