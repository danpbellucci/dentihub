
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';
import { CheckCircle, XCircle, Loader2, RefreshCcw, AlertOctagon, ArrowRight } from 'lucide-react';

const AppointmentActionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error' | 'reschedule'>('success');
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  
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
      // 1. Buscar detalhes do agendamento via RPC Segura
      const { data: appointmentData, error: fetchError } = await supabase
        .rpc('get_appointment_details_for_action', { p_appointment_id: id })
        .maybeSingle();

      if (fetchError) {
          console.error("Erro RPC:", fetchError);
          // Detecta erro 404 (Função não encontrada) para mensagem amigável
          if (fetchError.code === 'PGRST202' || fetchError.message.includes('404')) {
             setDebugInfo('Erro de configuração no servidor (RPC Missing). Contate a clínica.');
          }
          throw new Error("Não foi possível verificar os dados do agendamento.");
      }

      if (!appointmentData) {
          throw new Error("Agendamento não encontrado ou já removido.");
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
          }, 2000);
          
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
      <div className="absolute top-6 flex items-center text-gray-400 font-bold text-xl gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/')}>
          <Logo className="w-8 h-8" /> DentiHub
      </div>

      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl max-w-md w-full text-center animate-fade-in-up border border-gray-100 relative overflow-hidden">
        {/* Decorative Top Bar */}
        <div className={`absolute top-0 left-0 w-full h-2 ${status === 'success' && action !== 'cancel' ? 'bg-green-500' : status === 'reschedule' ? 'bg-blue-500' : 'bg-red-500'}`}></div>

        {loading ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="animate-spin text-primary h-12 w-12 mb-4" />
            <p className="text-gray-500 font-medium">Conectando ao sistema...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center pt-4">
            {status === 'success' ? (
              action === 'cancel' ? (
                <div className="bg-red-50 p-5 rounded-full mb-6 ring-4 ring-red-100 shadow-inner">
                   <XCircle className="h-12 w-12 text-red-500" />
                </div>
              ) : (
                <div className="bg-green-50 p-5 rounded-full mb-6 ring-4 ring-green-100 shadow-inner">
                   <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              )
            ) : status === 'reschedule' ? (
                <div className="bg-blue-50 p-5 rounded-full mb-6 ring-4 ring-blue-100 shadow-inner">
                   <RefreshCcw className="h-12 w-12 text-blue-500 animate-spin-slow" />
                </div>
            ) : (
                <div className="bg-gray-100 p-5 rounded-full mb-6 shadow-inner">
                   <AlertOctagon className="h-12 w-12 text-gray-500" />
                </div>
            )}
            
            <h2 className={`text-2xl font-black mb-4 ${status === 'error' ? 'text-gray-800' : 'text-gray-900'}`}>
                {status === 'success' ? (action === 'confirm' ? 'Confirmado!' : 'Cancelado') : 
                 status === 'reschedule' ? 'Reagendando...' : 'Ops!'}
            </h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                {message}
            </p>

            {debugInfo && (
                <p className="text-xs text-red-400 bg-red-50 p-2 rounded mb-6 w-full border border-red-100">
                    {debugInfo}
                </p>
            )}

            <button 
                onClick={() => navigate('/')}
                className="w-full px-6 py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg flex items-center justify-center gap-2 group"
            >
                Ir para o Início
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentActionPage;
