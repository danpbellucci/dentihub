
-- ============================================================================
-- LIMPEZA DE POLÍTICAS RLS REDUNDANTES
-- ============================================================================
-- Este script remove políticas antigas que foram substituídas pela lógica
-- mais segura e eficiente da função 'get_my_clinic_id()'.
-- ============================================================================

-- 1. APPOINTMENTS (Manter apenas: 'Acesso Appointments')
DROP POLICY IF EXISTS "Clinics isolate appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinics manage their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Gerenciamento total de agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "Private access for appointments" ON public.appointments;

-- 2. CLIENTS (Manter apenas: 'Acesso Clients')
DROP POLICY IF EXISTS "Clinics isolate clients" ON public.clients;
DROP POLICY IF EXISTS "Clinics manage their clients" ON public.clients;
DROP POLICY IF EXISTS "Gerenciamento total de pacientes" ON public.clients;
DROP POLICY IF EXISTS "Private access for clients" ON public.clients;

-- 3. CLINICAL_RECORDS (Manter apenas: 'Acesso Records')
DROP POLICY IF EXISTS "Clinics isolate records" ON public.clinical_records;
DROP POLICY IF EXISTS "Private access for clinical_records" ON public.clinical_records;

-- 4. DENTISTS (Manter apenas: 'Acesso Dentists' e 'Enable delete access for clinic admins')
DROP POLICY IF EXISTS "Clinics isolate dentists" ON public.dentists;
DROP POLICY IF EXISTS "Clinics manage their dentists" ON public.dentists;
DROP POLICY IF EXISTS "Gerenciamento total de dentistas" ON public.dentists;
DROP POLICY IF EXISTS "Owner read access dentists" ON public.dentists;
DROP POLICY IF EXISTS "Owners can manage dentists" ON public.dentists;

-- 5. TRANSACTIONS (Manter apenas: 'Acesso Transactions')
DROP POLICY IF EXISTS "Clinics isolate transactions" ON public.transactions;
DROP POLICY IF EXISTS "Clinics manage their transactions" ON public.transactions;
DROP POLICY IF EXISTS "Gerenciamento total de transacoes" ON public.transactions;
DROP POLICY IF EXISTS "Private access for transactions" ON public.transactions;

-- 6. COMMUNICATIONS (Consolidar em uma nova política moderna)
DROP POLICY IF EXISTS "Clinics isolate comms" ON public.communications;
DROP POLICY IF EXISTS "Users can insert their own communications" ON public.communications;
DROP POLICY IF EXISTS "Users can view their own communications" ON public.communications;

-- Recriar política única para communications usando a função segura
CREATE POLICY "Acesso Communications" ON public.communications
FOR ALL USING ( clinic_id = get_my_clinic_id() );

-- 7. APPOINTMENT_REQUESTS (Limpar duplicatas, manter 'Membros Requests' e 'Publico Requests')
DROP POLICY IF EXISTS "Clinic delete requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinic manage requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinic update requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinics can delete their requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinics can update their requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinics can view/manage their requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinics manage requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinics update requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Gerenciamento total de solicitacoes" ON public.appointment_requests;
DROP POLICY IF EXISTS "Public can create requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Public can request appointments" ON public.appointment_requests;
DROP POLICY IF EXISTS "Public insert requests" ON public.appointment_requests;

-- 8. CLINICS (Limpar duplicatas, manter 'Ver Clinica Vinculada' e gerenciamento do Owner)
DROP POLICY IF EXISTS "Membros podem ver sua clinica" ON public.clinics;
DROP POLICY IF EXISTS "Owner read access clinics" ON public.clinics;
DROP POLICY IF EXISTS "Owners can insert their clinic" ON public.clinics; -- Service role faz isso no signup
DROP POLICY IF EXISTS "Owners can update their clinic" ON public.clinics;
DROP POLICY IF EXISTS "Service role insert clinic" ON public.clinics;
DROP POLICY IF EXISTS "Users can select own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Users can update own clinic" ON public.clinics;

-- Garantir política de gerenciamento pelo próprio ID (Owner inicial)
CREATE POLICY "Owner Gerencia Clinica" ON public.clinics
FOR ALL USING ( id = auth.uid() );

-- 9. USER_PROFILES (Limpar antigas)
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.user_profiles;
-- Mantemos 'Visualizar Perfis', 'Criar Perfil', 'Atualizar Próprio Perfil' e 'Deletar Perfil' (criadas no fix anterior)

