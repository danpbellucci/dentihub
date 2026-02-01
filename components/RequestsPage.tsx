
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { format, parseISO } from 'date-fns';
import { Check, X, Clock, AlertTriangle, CalendarCheck, Smartphone, Mail, MapPin, User, UserCheck, Loader2, HelpCircle, RefreshCw } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import Toast, { ToastType } from './Toast';
import { UserProfile } from '../types';

const RequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [acceptId, setAcceptId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  const intervalRef = useRef<any>(null);

  // Consome o contexto do Layout
  const { refreshNotifications, userProfile } = useOutletContext<{ refreshNotifications?: () => void, userProfile: UserProfile | null }>() || {};

  useEffect(() => {
    // 1. Carregamento inicial
    fetchRequests();
    
    // 2. Configura Polling (Backup de segurança caso o Realtime falhe)
    // Verifica a cada 15 segundos
    intervalRef.current = setInterval(() => {
        fetchRequests(true); // true = silent mode (sem loading spinner)
    }, 15000);

    // 3. Configura Realtime
    const channel = supabase
      .channel('requests_page_changes')
      .on(
        'postgres_changes',
        { 
            event: '*', 
            schema: 'public', 
            table: 'appointment_requests' 
        },
        (payload) => {
          console.log('Evento Realtime recebido:', payload);
          // Apenas recarregamos a lista silenciosamente
          fetchRequests(true); 
          if (refreshNotifications) refreshNotifications(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userProfile?.clinic_id]); // Recria se mudar a clínica

  const fetchRequests = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let targetClinicId = user.id;
    if (userProfile?.clinic_id) {
        targetClinicId = userProfile.clinic_id;
    } else {
        const { data: profile } = await supabase.from('user_profiles').select('clinic_id').eq('id', user.id).maybeSingle();
        if (profile) targetClinicId = profile.clinic_id;
    }

    const { data } = await supabase
      .from('appointment_requests')
      .select('*, dentist:dentists(name)')
      .eq('clinic_id', targetClinicId) 
      .order('requested_time', { ascending: true });
    
    if (data) {
        // Processamento de dados (CPFs, etc)
        const cpfsToCheck = data
            .map(req => req.patient_cpf)
            .filter(cpf => cpf && cpf.length > 0);

        let existingCpfs = new Set();

        if (cpfsToCheck.length > 0) {
            const { data: existingClients } = await supabase
                .from('clients')
                .select('cpf')
                .eq('clinic_id', targetClinicId)
                .in('cpf', cpfsToCheck);
            
            if (existingClients) {
                existingClients.forEach(c => existingCpfs.add(c.cpf));
            }
        }

        const enrichedRequests = data.map(req => ({
            ...req,
            isExistingPatient: req.patient_cpf ? existingCpfs.has(req.patient_cpf) : false
        }));

        setRequests(enrichedRequests);
    }
    if (!isSilent) setLoading(false);
  };

  const handleAction = async (request: any, action: 'accepted' | 'rejected') => {
    if (processing) return;
    setProcessing(true);

    try {
        if (action === 'accepted') {
          // 0. Check for double booking
          const start = parseISO(request.requested_time);
          const end = new Date(start.getTime() + 60 * 60 * 1000); // Assuming 1h for requests

          const { data: conflicts } = await supabase
            .from('appointments')
            .select('id')
            .eq('dentist_id', request.dentist_id)
            .neq('status', 'cancelled')
            .lt('start_time', end.toISOString())
            .gt('end_time', start.toISOString());
          
          if (conflicts && conflicts.length > 0) {
              setWarningMessage("Não foi possível aceitar: O dentista já possui agendamento neste horário.");
              setProcessing(false);
              return;
          }

          let finalClientId = null;
          let isNewClient = false;

          // 1. Check if client already exists by CPF
          if (request.patient_cpf) {
              const { data: existingClient } = await supabase
                  .from('clients')
                  .select('id, whatsapp, email, birth_date, address') // Seleciona campos para verificar se precisa atualizar
                  .eq('clinic_id', request.clinic_id)
                  .eq('cpf', request.patient_cpf)
                  .maybeSingle();
              
              if (existingClient) {
                  finalClientId = existingClient.id;

                  // --- ATUALIZAÇÃO INCREMENTAL DE DADOS ---
                  // Verifica se existem dados novos na solicitação para campos que estão vazios no cadastro atual
                  const updates: any = {};
                  
                  if (!existingClient.whatsapp && request.patient_phone) {
                      updates.whatsapp = request.patient_phone;
                  }
                  if (!existingClient.email && request.patient_email) {
                      updates.email = request.patient_email;
                  }
                  if (!existingClient.birth_date && request.patient_birth_date) {
                      updates.birth_date = request.patient_birth_date;
                  }
                  if (!existingClient.address && request.patient_address) {
                      updates.address = request.patient_address;
                  }

                  // Se houver atualizações, aplica no banco
                  if (Object.keys(updates).length > 0) {
                      await supabase.from('clients').update(updates).eq('id', existingClient.id);
                  }
              }
          }

          // 2. Create actual client ONLY if not found
          if (!finalClientId) {
              const { data: newClient, error: clientError } = await supabase.from('clients').insert({
                clinic_id: request.clinic_id,
                name: request.patient_name,
                email: request.patient_email || null,
                whatsapp: request.patient_phone,
                cpf: request.patient_cpf || null,
                address: request.patient_address || null,
                birth_date: request.patient_birth_date || null
              }).select().single();

              if (clientError) {
                  console.error("Erro ao criar paciente:", clientError);
                  setWarningMessage("Erro ao criar cadastro do paciente.");
                  setProcessing(false);
                  return;
              }
              
              if (newClient) {
                  finalClientId = newClient.id;
                  isNewClient = true;

                  if (isNewClient && newClient.email) {
                      try {
                          const origin = window.location.href.split('#')[0].replace(/\/$/, '');
                          await supabase.functions.invoke('send-emails', {
                              body: {
                                  type: 'welcome',
                                  recipients: [{ 
                                      id: newClient.id, 
                                      name: newClient.name, 
                                      email: newClient.email 
                                  }],
                                  origin: origin
                              }
                          });
                      } catch (mailErr) { console.error(mailErr); }
                  }
              }
          }

          if (finalClientId) {
            // 3. Create Appointment
            const { error: apptError } = await supabase.from('appointments').insert({
              clinic_id: request.clinic_id,
              dentist_id: request.dentist_id,
              client_id: finalClientId,
              service_name: request.service_name,
              start_time: start.toISOString(),
              end_time: end.toISOString(),
              status: 'scheduled'
            });

            if (apptError) {
                setWarningMessage("Erro ao criar o agendamento.");
                setProcessing(false);
                return;
            }

            // 4. Send Confirmation Notification
            if (request.patient_email) {
                try {
                    const dentistName = request.dentist?.name || 'Dentista';
                    const apptData = {
                        date: format(start, "dd/MM/yyyy"),
                        time: format(start, "HH:mm"),
                        service_name: request.service_name,
                        dentist_name: dentistName
                    };
                    const origin = window.location.href.split('#')[0].replace(/\/$/, '');

                    await supabase.functions.invoke('send-emails', {
                        body: {
                            type: 'appointment',
                            subtype: 'created',
                            appointment: { id: 'pending', ...apptData },
                            client: { name: request.patient_name, email: request.patient_email },
                            origin: origin
                        }
                    });
                } catch (notifyErr) { console.error(notifyErr); }
            }
          }
        }

        // 5. Delete request (Cleanup)
        const { error: deleteError } = await supabase
            .from('appointment_requests')
            .delete()
            .eq('id', request.id);

        if (deleteError) throw deleteError;

        // Atualiza lista localmente e reseta refs
        fetchRequests(true);
        if (refreshNotifications) refreshNotifications();
        
        setToast({ message: action === 'accepted' ? "Solicitação aceita com sucesso!" : "Solicitação recusada.", type: 'success' });

    } catch (err: any) {
        console.error("Erro ao processar solicitação:", err);
        setWarningMessage("Ocorreu um erro inesperado.");
    } finally {
        setProcessing(false);
        setAcceptId(null);
        setRejectId(null);
    }
  };

  const confirmRejection = async () => {
    if (!rejectId) return;
    const req = requests.find(r => r.id === rejectId);
    if (req) await handleAction(req, 'rejected');
  };

  const confirmAcceptance = async () => {
    if (!acceptId) return;
    const req = requests.find(r => r.id === acceptId);
    if (req) await handleAction(req, 'accepted');
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800">Solicitações de Agendamento</h1>
            <button onClick={() => fetchRequests(false)} className="text-gray-400 hover:text-primary transition-colors p-1 rounded-full hover:bg-gray-100" title="Atualizar Lista">
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors ml-1">
                <HelpCircle size={20} />
            </button>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading && requests.length === 0 ? (
            <div className="p-12 flex justify-center items-center text-gray-500">
                <Loader2 className="animate-spin mr-2" /> Carregando solicitações...
            </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
             <CalendarCheck className="h-12 w-12 text-gray-300 mb-3" />
             <p>Nenhuma solicitação pendente no momento.</p>
             <p className="text-sm text-gray-400 mt-1">Novas solicitações aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {requests.map((req) => (
              <li key={req.id} className="p-6 flex flex-col sm:flex-row justify-between items-start hover:bg-gray-50 transition-colors animate-fade-in-up">
                <div className="mb-4 sm:mb-0 flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                    {req.patient_name}
                    {req.isExistingPatient ? (
                        <span className="ml-3 text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center border border-indigo-200" title="CPF já consta na base de pacientes">
                            <UserCheck size={12} className="mr-1"/> Paciente Já Cadastrado
                        </span>
                    ) : (
                        <span className="ml-3 text-xs font-normal bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center">
                            <User size={12} className="mr-1"/> Novo Paciente
                        </span>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-600">
                      <div className="space-y-1">
                          <p><span className="font-semibold text-gray-700">Serviço:</span> {req.service_name}</p>
                          <p><span className="font-semibold text-gray-700">Dentista:</span> {req.dentist?.name}</p>
                          <div className="flex items-center text-primary font-bold mt-1 bg-blue-50 w-fit px-2 py-1 rounded">
                            <Clock size={16} className="mr-1.5" />
                            {format(parseISO(req.requested_time), "dd/MM/yyyy 'às' HH:mm")}
                          </div>
                      </div>

                      <div className="space-y-1 border-l pl-4 md:border-l-0 md:pl-0 md:border-l-gray-200 md:pl-4">
                          {req.patient_phone && (
                              <a 
                                href={`https://wa.me/55${req.patient_phone.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center text-gray-700 hover:text-green-600 transition-colors group/phone w-fit"
                                title="Abrir WhatsApp Web"
                              >
                                  <Smartphone size={14} className="mr-2 text-green-600 group-hover/phone:scale-110 transition-transform"/> 
                                  <span className="group-hover/phone:underline">{req.patient_phone}</span>
                              </a>
                          )}
                          {req.patient_email && (
                              <p className="flex items-center text-gray-700">
                                  <Mail size={14} className="mr-2 text-blue-500"/> 
                                  {req.patient_email}
                              </p>
                          )}
                          {(req.patient_cpf || req.patient_birth_date) && (
                              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                                  {req.patient_cpf && <span>CPF: {req.patient_cpf}</span>}
                                  {req.patient_birth_date && <span>Nasc: {format(parseISO(req.patient_birth_date), 'dd/MM/yyyy')}</span>}
                              </div>
                          )}
                          {req.patient_address && (
                              <p className="flex items-start text-xs text-gray-500 mt-1">
                                  <MapPin size={12} className="mr-2 mt-0.5 flex-shrink-0"/> 
                                  {req.patient_address}
                              </p>
                          )}
                      </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-4 sm:mt-0 sm:ml-4 self-start w-full sm:w-auto">
                  <button 
                    onClick={() => setRejectId(req.id)}
                    disabled={processing}
                    className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition disabled:opacity-50 text-sm font-bold"
                  >
                    <X size={16} className="mr-2" /> Recusar
                  </button>
                  <button 
                    onClick={() => setAcceptId(req.id)}
                    disabled={processing}
                    className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 text-sm font-bold shadow-sm"
                  >
                    {processing && acceptId === req.id ? <Loader2 className="animate-spin" size={16} /> : <><Check size={16} className="mr-2" /> Aceitar</>}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MODAL DE AVISO */}
      {warningMessage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-yellow-100 p-3 rounded-full inline-block mb-4">
                <AlertTriangle className="text-yellow-600" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Atenção</h3>
             <p className="text-gray-600 mb-6">{warningMessage}</p>
             <button onClick={() => setWarningMessage(null)} className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-bold transition">Entendi</button>
          </div>
        </div>
      )}

      {/* MODAL RECUSA */}
      {rejectId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-100 p-3 rounded-full inline-block mb-4">
                <AlertTriangle className="text-red-600" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Recusar Solicitação?</h3>
             <p className="text-gray-600 mb-6 text-sm">Esta ação não pode ser desfeita.</p>
             <div className="flex space-x-3 w-full">
                <button onClick={() => setRejectId(null)} disabled={processing} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold transition">Cancelar</button>
                <button onClick={confirmRejection} disabled={processing} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg shadow-red-200">{processing ? <Loader2 className="animate-spin" size={16}/> : 'Sim, Recusar'}</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL ACEITE */}
      {acceptId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-green-100 p-3 rounded-full inline-block mb-4">
                <CalendarCheck className="text-green-600" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Agendamento?</h3>
             <p className="text-gray-600 mb-6 text-sm">Deseja confirmar para <strong>{requests.find(r => r.id === acceptId)?.patient_name}</strong>?</p>
             <div className="flex space-x-3 w-full">
                <button onClick={() => setAcceptId(null)} disabled={processing} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold transition">Cancelar</button>
                <button onClick={confirmAcceptance} disabled={processing} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition shadow-lg shadow-green-200">{processing ? <Loader2 className="animate-spin" size={16}/> : 'Sim, Confirmar'}</button>
             </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center text-gray-800 gap-2"><HelpCircle className="text-primary"/> Solicitações de Agendamento</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-600">
                <p>Gerencie os pedidos de consulta vindos do seu link público.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Recebimento:</strong> Quando um paciente agenda online, o pedido aparece aqui automaticamente.</li>
                   <li><strong>Aceitar:</strong> Cria o agendamento na sua agenda oficial e notifica o paciente por e-mail.</li>
                   <li><strong>Recusar:</strong> Remove o pedido da lista.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;