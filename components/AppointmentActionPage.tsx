
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react';

const AppointmentActionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error'>('success');
  const [message, setMessage] = useState('');
  
  const id = searchParams.get('id');
  const action = searchParams.get('action'); // 'confirm' or 'cancel'

  useEffect(() => {
    processAction();
  }, [id, action]);

  const processAction = async () => {
    if (!id || !action) {
      setStatus('error');
      setMessage('Link inválido ou incompleto.');
      setLoading(false);
      return;
    }

    try {
      // 1. Buscar detalhes do agendamento para poder criar o registro na tabela appointment_requests
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
            *,
            client:clients(name, email, whatsapp),
            dentist:dentists(name)
        `)
        .eq('id', id)
        .single();

      if (fetchError || !appointment) {
          throw new Error("Agendamento não encontrado.");
      }

      // 2. Determina o novo status para a tabela APPOINTMENTS (Agenda)
      // Confirmar -> confirmed (Verde na agenda)
      // Recusar -> cancelled (Vermelho na agenda)
      const newStatus = action === 'cancel' ? 'cancelled' : 'confirmed';
      
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) throw updateError;

      // 3. Inserir notificação na tabela APPOINTMENT_REQUESTS (Para acender o sino no painel)
      // O usuário solicitou explicitamente que a informação ficasse gravada nesta tabela.
      const serviceLabel = action === 'confirm' 
          ? 'CONFIRMAÇÃO VIA E-MAIL' 
          : 'CANCELAMENTO VIA E-MAIL';

      const clientName = (appointment.client as any)?.name || 'Paciente';
      const clientPhone = (appointment.client as any)?.whatsapp || 'Não informado';
      const clientEmail = (appointment.client as any)?.email || 'Não informado';

      await supabase.from('appointment_requests').insert({
          clinic_id: appointment.clinic_id,
          dentist_id: appointment.dentist_id,
          patient_name: clientName,
          patient_phone: clientPhone,
          patient_email: clientEmail,
          service_name: serviceLabel,
          requested_time: appointment.start_time,
          status: 'pending' // Pending faz o badge aparecer no menu "Solicitações"
      });

      // 4. Feedback Visual para o Paciente
      if (action === 'cancel') {
        setStatus('success');
        setMessage('O agendamento foi cancelado conforme sua solicitação. A clínica foi notificada.');
      } else {
        setStatus('success');
        setMessage('Obrigado! Sua presença foi confirmada e a clínica já foi avisada.');
      }

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage('Ocorreu um erro ao atualizar o agendamento. Ele pode ter sido excluído ou você não tem permissão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center animate-fade-in-up">
        {loading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="animate-spin text-primary h-12 w-12 mb-4" />
            <p className="text-gray-600 font-medium">Processando sua resposta...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {status === 'success' ? (
              action === 'cancel' ? (
                <div className="bg-red-100 p-4 rounded-full mb-4">
                   <XCircle className="h-10 w-10 text-red-600" />
                </div>
              ) : (
                <div className="bg-green-100 p-4 rounded-full mb-4">
                   <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              )
            ) : (
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                 <Calendar className="h-10 w-10 text-gray-500" />
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {status === 'success' ? (action === 'cancel' ? 'Cancelamento Recebido' : 'Presença Confirmada') : 'Atenção'}
            </h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
              {message}
            </p>

            <button 
              onClick={() => navigate('/')}
              className="w-full py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition shadow-lg"
            >
              Ir para DentiHub
            </button>
          </div>
        )}
      </div>
      <p className="mt-8 text-gray-400 text-sm">DentiHub - Gestão Inteligente</p>
    </div>
  );
};

export default AppointmentActionPage;
