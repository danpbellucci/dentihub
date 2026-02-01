
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { CheckCircle, XCircle, Loader2, Calendar, RefreshCcw, Smile } from 'lucide-react';

const AppointmentActionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error' | 'reschedule'>('success');
  const [message, setMessage] = useState('');
  
  const id = searchParams.get('id');
  const action = searchParams.get('action'); // 'confirm', 'cancel', 'reschedule'

  useEffect(() => {
    processAction();
  }, [id, action]);

  const processAction = async () => {
    if (!id || !action) {
      setStatus('error');
      setMessage('O link que você acessou parece inválido ou incompleto.');
      setLoading(false);
      return;
    }

    try {
      // 1. Buscar detalhes do agendamento
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
            *,
            client_id,
            clinic_id,
            clinic:clinics(slug, name)
        `)
        .eq('id', id)
        .single();

      if (fetchError || !appointment) {
          throw new Error("Agendamento não encontrado.");
      }

      const clinicName = (appointment.clinic as any)?.name || 'Clínica Odontológica';

      // 2. Lógica de Reagendamento (Redirecionamento)
      if (action === 'reschedule') {
          // Grava a intenção de reagendar antes de redirecionar
          await supabase.from('appointment_status_updates').insert({
              appointment_id: id,
              client_id: appointment.client_id,
              clinic_id: appointment.clinic_id,
              status: 'reschedule'
          });

          setStatus('reschedule');
          setMessage('Redirecionando para a página de agendamento...');
          
          const clinicSlug = (appointment.clinic as any)?.slug || appointment.clinic_id;
          setTimeout(() => {
              navigate(`/${clinicSlug}`);
          }, 1500);
          
          setLoading(false);
          return;
      }

      // 3. Grava o status na tabela intermediária (appointment_status_updates)
      let dbStatus = '';
      let displayMessage = '';

      if (action === 'confirm') {
          dbStatus = 'confirmed';
          displayMessage = `Obrigado! Sua presença foi confirmada na ${clinicName}.`;
      }
      if (action === 'cancel') {
          dbStatus = 'cancelled';
          displayMessage = `Sua solicitação de cancelamento foi recebida. A ${clinicName} foi notificada.`;
      }

      const { error: insertError } = await supabase.from('appointment_status_updates').insert({
          appointment_id: id,
          client_id: appointment.client_id,
          clinic_id: appointment.clinic_id,
          status: dbStatus
      });

      if (insertError) throw insertError;

      // 4. Feedback Visual
      setStatus('success');
      setMessage(displayMessage);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage('Ocorreu um erro ao processar sua solicitação. O link pode ter expirado ou o agendamento já foi alterado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Header Minimalista */}
      <div className="absolute top-6 flex items-center text-gray-400 font-bold text-xl gap-2">
          <Smile size={24} className="text-primary"/> DentiHub
      </div>

      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center animate-fade-in-up border border-gray-100">
        {loading ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="animate-spin text-primary h-12 w-12 mb-4" />
            <p className="text-gray-600 font-medium">Processando sua resposta...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {status === 'success' ? (
              action === 'cancel' ? (
                <div className="bg-red-50 p-6 rounded-full mb-6 ring-4 ring-red-100">
                   <XCircle className="h-12 w-12 text-red-600" />
                </div>
              ) : (
                <div className="bg-green-50 p-6 rounded-full mb-6 ring-4 ring-green-100">
                   <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              )
            ) : status === 'reschedule' ? (
                <div className="bg-blue-50 p-6 rounded-full mb-6 ring-4 ring-blue-100">
                   <RefreshCcw className="h-12 w-12 text-blue-600" />
                </div>
            ) : (
              <div className="bg-gray-100 p-6 rounded-full mb-6">
                 <Calendar className="h-12 w-12 text-gray-500" />
              </div>
            )}
            
            <h2 className="text-2xl font-black text-gray-900 mb-3">
              {status === 'success' 
                ? (action === 'cancel' ? 'Cancelamento Recebido' : 'Tudo Certo!') 
                : status === 'reschedule' ? 'Reagendando...'
                : 'Ops! Algo deu errado'}
            </h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed text-lg">
              {message}
            </p>

            {status !== 'reschedule' && (
                <button 
                onClick={() => navigate('/')}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg flex items-center justify-center"
                >
                Ir para Início
                </button>
            )}
          </div>
        )}
      </div>
      <p className="mt-8 text-gray-400 text-sm">© {new Date().getFullYear()} DentiHub - Gestão Inteligente</p>
    </div>
  );
};

export default AppointmentActionPage;
