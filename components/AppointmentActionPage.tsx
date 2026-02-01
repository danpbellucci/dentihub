
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';
import { CheckCircle, XCircle, Loader2, RefreshCcw } from 'lucide-react';

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
      setMessage('O link que você acessou parece inválido ou incompleto. Verifique se copiou todo o endereço.');
      setLoading(false);
      return;
    }

    try {
      // 1. Buscar detalhes do agendamento via RPC Segura (Bypass RLS)
      const { data: appointmentData, error: fetchError } = await supabase
        .rpc('get_appointment_details_for_action', { p_appointment_id: id })
        .maybeSingle();

      if (fetchError) {
          console.error("Erro RPC:", fetchError);
          throw new Error("Erro de conexão ao verificar o agendamento.");
      }

      if (!appointmentData) {
          throw new Error("Agendamento não encontrado. O link pode ter expirado ou o agendamento foi removido.");
      }

      // Cast to any to access properties returned by the RPC function
      const { clinic_name, clinic_slug, client_id, clinic_id } = appointmentData as any;
      const displayClinicName = clinic_name || 'Clínica Odontológica';

      // 2. Lógica de Reagendamento (Redirecionamento)
      if (action === 'reschedule') {
          // Grava a intenção de reagendar antes de redirecionar
          await supabase.from('appointment_status_updates').insert({
              appointment_id: id,
              client_id: client_id,
              clinic_id: clinic_id,
              status: 'reschedule'
          });

          setStatus('reschedule');
          setMessage('Redirecionando para a página de agendamento...');
          
          const targetSlug = clinic_slug || clinic_id;
          setTimeout(() => {
              navigate(`/${targetSlug}`);
          }, 1500);
          
          setLoading(false);
          return;
      }

      // 3. Grava o status na tabela intermediária (appointment_status_updates)
      let dbStatus = '';
      let displayMessage = '';

      if (action === 'confirm') {
          dbStatus = 'confirmed';
          displayMessage = `Obrigado! Sua presença foi confirmada na ${displayClinicName}.`;
      }
      if (action === 'cancel') {
          dbStatus = 'cancelled';
          displayMessage = `Sua solicitação de cancelamento foi recebida. A ${displayClinicName} foi notificada.`;
      }

      const { error: insertError } = await supabase.from('appointment_status_updates').insert({
          appointment_id: id,
          client_id: client_id,
          clinic_id: clinic_id,
          status: dbStatus
      });

      if (insertError) throw insertError;

      // 4. Feedback Visual
      setStatus('success');
      setMessage(displayMessage);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err.message || 'Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Header Minimalista */}
      <div className="absolute top-6 flex items-center text-gray-400 font-bold text-xl gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <Logo className="w-8 h-8" /> DentiHub
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
                   <XCircle className="h-12 w-12 text-gray-400" />
                </div>
            )}
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {status === 'success' ? (action === 'confirm' ? 'Confirmado!' : 'Cancelado') : 
                 status === 'reschedule' ? 'Reagendando...' : 'Ops!'}
            </h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
                {message}
            </p>

            <button 
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition"
            >
                Ir para o Início
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentActionPage;
