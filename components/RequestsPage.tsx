
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { format, parseISO, addMinutes } from 'date-fns';
import { Check, X, Clock, AlertTriangle, CalendarCheck, Smartphone, Mail, User, UserCheck, Loader2, HelpCircle, RefreshCw, RefreshCcw } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import Toast, { ToastType } from './Toast';
import { UserProfile } from '../types';

const RequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [acceptId, setAcceptId] = useState<string | null>(null);
  
  const intervalRef = useRef<any>(null);
  const navigate = useNavigate();
  const { refreshNotifications, userProfile } = useOutletContext<{ refreshNotifications?: () => void, userProfile: UserProfile | null }>() || {};

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => { fetchData(true); }, 15000);
    const channel = supabase.channel('requests_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_requests' }, () => { fetchData(true); if (refreshNotifications) refreshNotifications(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_status_updates' }, () => { fetchData(true); })
      .subscribe();
    return () => { supabase.removeChannel(channel); if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [userProfile?.clinic_id]);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let targetClinicId = user.id;
    if (userProfile?.clinic_id) targetClinicId = userProfile.clinic_id;
    else { const { data: profile } = await supabase.from('user_profiles').select('clinic_id').eq('id', user.id).maybeSingle(); if (profile) targetClinicId = profile.clinic_id; }

    const { data: reqData } = await supabase.from('appointment_requests').select('*, dentist:dentists(name)').eq('clinic_id', targetClinicId).order('requested_time', { ascending: true });
    if (reqData) {
        const cpfsToCheck = reqData.map(req => req.patient_cpf).filter(cpf => cpf && cpf.length > 0);
        let existingCpfs = new Set();
        if (cpfsToCheck.length > 0) { const { data: existingClients } = await supabase.from('clients').select('cpf').eq('clinic_id', targetClinicId).in('cpf', cpfsToCheck); if (existingClients) existingClients.forEach(c => existingCpfs.add(c.cpf)); }
        setRequests(reqData.map(req => ({ ...req, isExistingPatient: req.patient_cpf ? existingCpfs.has(req.patient_cpf) : false })));
    }

    const { data: updateData } = await supabase.from('appointment_status_updates').select(`id, status, created_at, appointment_id, client:clients(name, email, whatsapp), appointment:appointments(start_time, service_name, dentist:dentists(name))`).eq('clinic_id', targetClinicId).order('created_at', { ascending: true });
    if (updateData) setStatusUpdates(updateData);
    if (!isSilent) setLoading(false);
  };

  const handleRequestAction = async (request: any, action: 'accepted' | 'rejected') => {
    if (processing) return;
    setProcessing(true);
    try {
        if (action === 'accepted') {
          // 1. Determinar a duração correta do serviço
          let duration = 60; // Default fallback
          
          if (request.dentist_id) {
              const { data: dentistData } = await supabase
                  .from('dentists')
                  .select('services')
                  .eq('id', request.dentist_id)
                  .single();

              if (dentistData?.services && Array.isArray(dentistData.services)) {
                  // Procura o serviço na lista do dentista
                  const serviceItem = dentistData.services.find((s: any) => {
                      let sName = '';
                      if (typeof s === 'string') {
                          try { sName = JSON.parse(s).name; } catch { sName = s; }
                      } else { sName = s.name; }
                      return sName === request.service_name;
                  });

                  if (serviceItem) {
                      if (typeof serviceItem === 'string') {
                          try { duration = Number(JSON.parse(serviceItem).duration) || 60; } catch { duration = 60; }
                      } else {
                          duration = Number(serviceItem.duration) || 60;
                      }
                  }
              }
          }

          const start = parseISO(request.requested_time);
          const end = addMinutes(start, duration);
          
          // 2. Verificar conflitos com a duração correta
          const { data: conflicts } = await supabase
            .from('appointments')
            .select('id')
            .eq('dentist_id', request.dentist_id)
            .neq('status', 'cancelled')
            .lt('start_time', end.toISOString())
            .gt('end_time', start.toISOString());
          
          if (conflicts && conflicts.length > 0) { 
              setWarningMessage(`O dentista já possui agendamento neste horário (Conflito entre ${format(start, 'HH:mm')} e ${format(end, 'HH:mm')}).`); 
              setProcessing(false); 
              return; 
          }

          let finalClientId = null;
          let feedbackMessage = "Solicitação aceita!";

          // 3. Verifica se já existe paciente com este CPF na base
          if (request.patient_cpf) { 
              const { data: existingClient } = await supabase
                  .from('clients')
                  .select('id, name, email, whatsapp, address, birth_date')
                  .eq('clinic_id', request.clinic_id)
                  .eq('cpf', request.patient_cpf)
                  .maybeSingle();
              
              if (existingClient) {
                  // Se encontrou, usa o ID existente
                  finalClientId = existingClient.id;
                  feedbackMessage = `Agendamento confirmado para o paciente já cadastrado: ${existingClient.name}`;

                  // Lógica de Atualização: Se o cadastro tiver campos vazios e a solicitação tiver dados, atualiza.
                  const updates: any = {};
                  if (request.patient_email && !existingClient.email) updates.email = request.patient_email;
                  if (request.patient_phone && !existingClient.whatsapp) updates.whatsapp = request.patient_phone;
                  if (request.patient_address && !existingClient.address) updates.address = request.patient_address;
                  if (request.patient_birth_date && !existingClient.birth_date) updates.birth_date = request.patient_birth_date;

                  if (Object.keys(updates).length > 0) {
                      await supabase.from('clients').update(updates).eq('id', existingClient.id);
                      feedbackMessage += " (Cadastro atualizado com novas informações)";
                  }
              }
          }

          // 4. Se não encontrou pelo CPF, cria um novo
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
              
              if (clientError) throw new Error("Erro ao criar cliente: " + clientError.message);
              if (newClient) { 
                  finalClientId = newClient.id; 
                  feedbackMessage = "Novo paciente cadastrado e agendamento confirmado!";
              }
          }

          // 5. Cria o agendamento vinculado ao ID final (seja novo ou existente)
          if (finalClientId) {
            const { data: newAppt, error: apptError } = await supabase.from('appointments').insert({ 
                clinic_id: request.clinic_id, 
                dentist_id: request.dentist_id, 
                client_id: finalClientId, 
                service_name: request.service_name, 
                start_time: start.toISOString(), 
                end_time: end.toISOString(), 
                status: 'scheduled' 
            }).select().single();
            
            if (apptError) throw apptError;
            
            // Envia e-mail de confirmação com o ID CORRETO do agendamento
            if (request.patient_email && newAppt) { 
                await supabase.functions.invoke('send-emails', { 
                    body: { 
                        type: 'appointment', 
                        subtype: 'created', 
                        appointment: { 
                            id: newAppt.id, // ID real gerado pelo banco
                            date: format(start, "dd/MM/yyyy"), 
                            time: format(start, "HH:mm"), 
                            service_name: request.service_name, 
                            dentist_name: request.dentist?.name 
                        }, 
                        client: { name: request.patient_name, email: request.patient_email }, 
                        origin: window.location.href.split('#')[0].replace(/\/$/, '') 
                    } 
                }); 
            }
            
            setToast({ message: feedbackMessage, type: 'success' });
          }
        } else {
            setToast({ message: "Solicitação recusada.", type: 'success' });
        }

        // Limpa a solicitação da lista
        await supabase.from('appointment_requests').delete().eq('id', request.id);
        
        fetchData(true); 
        if (refreshNotifications) refreshNotifications();
        
    } catch (err: any) { 
        console.error(err); 
        setWarningMessage("Erro ao processar: " + (err.message || "Tente novamente.")); 
    } finally { 
        setProcessing(false); 
        setAcceptId(null); 
        setRejectId(null); 
    }
  };

  const handleStatusUpdate = async (update: any) => {
      setProcessing(true);
      try {
          if (update.status === 'reschedule') {
              await supabase.from('appointment_status_updates').delete().eq('id', update.id);
              setToast({ message: "Notificação removida.", type: 'info' });
          } else {
              const { error } = await supabase.from('appointments').update({ status: update.status }).eq('id', update.appointment_id);
              if (error) throw error;
              await supabase.from('appointment_status_updates').delete().eq('id', update.id);
              setToast({ message: `Agendamento ${update.status === 'confirmed' ? 'confirmado' : 'cancelado'} com sucesso!`, type: 'success' });
          }
          fetchData(true);
      } catch (err: any) { setToast({ message: "Erro ao atualizar: " + err.message, type: 'error' }); } 
      finally { setProcessing(false); }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Solicitações e Avisos</h1>
            <button onClick={() => fetchData(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10" title="Atualizar">
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors ml-1"><HelpCircle size={20} /></button>
        </div>
      </div>
      
      {loading && requests.length === 0 && statusUpdates.length === 0 ? (
          <div className="p-12 flex justify-center items-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Carregando...</div>
      ) : (requests.length === 0 && statusUpdates.length === 0) ? (
          <div className="p-12 text-center text-gray-500 bg-gray-900/60 backdrop-blur-md rounded-lg shadow border border-white/5">
             <CalendarCheck className="h-12 w-12 text-gray-600 mb-3 mx-auto" />
             <p>Nenhuma solicitação pendente.</p>
          </div>
      ) : (
          <div className="space-y-6">
              
              {statusUpdates.length > 0 && (
                  <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center"><Mail className="mr-2" size={16}/> Respostas de Lembretes</h3>
                      <div className="bg-gray-900/60 backdrop-blur-md shadow rounded-lg overflow-hidden border border-white/5">
                          <ul className="divide-y divide-white/5">
                              {statusUpdates.map(upd => (
                                  <li key={upd.id} className="p-4 flex flex-col sm:flex-row items-center justify-between hover:bg-gray-800/50">
                                      <div className="flex-1 mb-3 sm:mb-0">
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="font-bold text-white text-lg">{(upd.client as any)?.name}</span>
                                              {upd.status === 'confirmed' && <span className="bg-green-900/30 text-green-400 border border-green-500/20 text-xs font-bold px-2 py-0.5 rounded flex items-center"><Check size={12} className="mr-1"/> Confirmou</span>}
                                              {upd.status === 'cancelled' && <span className="bg-red-900/30 text-red-400 border border-red-500/20 text-xs font-bold px-2 py-0.5 rounded flex items-center"><X size={12} className="mr-1"/> Cancelou</span>}
                                              {upd.status === 'reschedule' && <span className="bg-blue-900/30 text-blue-400 border border-blue-500/20 text-xs font-bold px-2 py-0.5 rounded flex items-center"><RefreshCcw size={12} className="mr-1"/> Quer Reagendar</span>}
                                          </div>
                                          <div className="text-sm text-gray-400">
                                              Agendamento: <strong className="text-gray-300">{format(parseISO((upd.appointment as any)?.start_time), "dd/MM 'às' HH:mm")}</strong> com {(upd.appointment as any)?.dentist?.name}
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                              Recebido em: {format(parseISO(upd.created_at), "dd/MM/yyyy HH:mm")}
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          {upd.status === 'reschedule' ? (
                                              <button onClick={() => handleStatusUpdate(upd)} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 text-sm flex items-center">
                                                  <Check size={16} className="mr-1"/> Ciente (Remover Aviso)
                                              </button>
                                          ) : (
                                              <button onClick={() => handleStatusUpdate(upd)} className="px-4 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 text-sm flex items-center">
                                                  <RefreshCw size={16} className="mr-1"/> Atualizar Agenda
                                              </button>
                                          )}
                                      </div>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  </div>
              )}

              {requests.length > 0 && (
                  <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center"><CalendarCheck className="mr-2" size={16}/> Novos Pedidos de Agendamento</h3>
                      <div className="bg-gray-900/60 backdrop-blur-md shadow rounded-lg overflow-hidden border border-white/5">
                          <ul className="divide-y divide-white/5">
                            {requests.map((req) => (
                              <li key={req.id} className="p-6 flex flex-col sm:flex-row justify-between items-start hover:bg-gray-800/50 transition-colors">
                                <div className="mb-4 sm:mb-0 flex-1">
                                  <h3 className="text-lg font-bold text-white mb-2 flex items-center">
                                    {req.patient_name}
                                    {req.isExistingPatient ? (
                                        <span className="ml-3 text-xs font-bold bg-indigo-900/30 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center">
                                            <UserCheck size={12} className="mr-1"/> Paciente Cadastrado
                                        </span>
                                    ) : (
                                        <span className="ml-3 text-xs font-normal bg-blue-900/30 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center">
                                            <User size={12} className="mr-1"/> Novo Paciente
                                        </span>
                                    )}
                                  </h3>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-400">
                                      <div className="space-y-1">
                                          <p><span className="font-semibold text-gray-500">Serviço:</span> {req.service_name}</p>
                                          <p><span className="font-semibold text-gray-500">Dentista:</span> {req.dentist?.name}</p>
                                          <div className="flex items-center text-primary font-bold mt-1 bg-blue-900/20 w-fit px-2 py-1 rounded border border-blue-500/20">
                                            <Clock size={16} className="mr-1.5" />
                                            {format(parseISO(req.requested_time), "dd/MM/yyyy 'às' HH:mm")}
                                          </div>
                                      </div>

                                      <div className="space-y-1 border-l border-white/5 pl-4 md:border-l-0 md:pl-0 md:border-l-white/5 md:pl-4">
                                          {req.patient_phone && (
                                              <div className="flex items-center text-gray-300">
                                                  <Smartphone size={14} className="mr-2 text-green-500"/> 
                                                  {req.patient_phone}
                                              </div>
                                          )}
                                          {req.patient_email && (
                                              <div className="flex items-center text-gray-300">
                                                  <Mail size={14} className="mr-2 text-blue-500"/> 
                                                  {req.patient_email}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                </div>

                                <div className="flex space-x-3 mt-4 sm:mt-0 sm:ml-4 self-start w-full sm:w-auto">
                                  <button onClick={() => setRejectId(req.id)} disabled={processing} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border border-red-500/30 text-red-400 rounded-md hover:bg-red-900/20 transition text-sm font-bold">
                                    <X size={16} className="mr-2" /> Recusar
                                  </button>
                                  <button onClick={() => setAcceptId(req.id)} disabled={processing} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm font-bold shadow-sm">
                                    {processing && acceptId === req.id ? <Loader2 className="animate-spin" size={16} /> : <><Check size={16} className="mr-2" /> Aceitar</>}
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* MODAL DE AVISO */}
      {warningMessage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-yellow-900/20 p-3 rounded-full inline-block mb-4"><AlertTriangle className="text-yellow-500" size={32} /></div>
             <h3 className="text-lg font-bold text-white mb-2">Atenção</h3>
             <p className="text-gray-400 mb-6">{warningMessage}</p>
             <button onClick={() => setWarningMessage(null)} className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-bold transition">Entendi</button>
          </div>
        </div>
      )}

      {/* MODAL RECUSA */}
      {rejectId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-900/20 p-3 rounded-full inline-block mb-4"><AlertTriangle className="text-red-500" size={32} /></div>
             <h3 className="text-lg font-bold text-white mb-2">Recusar Solicitação?</h3>
             <div className="flex space-x-3 w-full">
                <button onClick={() => setRejectId(null)} disabled={processing} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 font-bold transition">Cancelar</button>
                <button onClick={() => { const req = requests.find(r => r.id === rejectId); if (req) handleRequestAction(req, 'rejected'); }} disabled={processing} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg">{processing ? <Loader2 className="animate-spin" size={16}/> : 'Sim, Recusar'}</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL ACEITE */}
      {acceptId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-green-900/20 p-3 rounded-full inline-block mb-4"><CalendarCheck className="text-green-500" size={32} /></div>
             <h3 className="text-lg font-bold text-white mb-2">Confirmar Agendamento?</h3>
             <p className="text-gray-400 mb-6 text-sm">Deseja confirmar para <strong>{requests.find(r => r.id === acceptId)?.patient_name}</strong>?</p>
             <div className="flex space-x-3 w-full">
                <button onClick={() => setAcceptId(null)} disabled={processing} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 font-bold transition">Cancelar</button>
                <button onClick={() => { const req = requests.find(r => r.id === acceptId); if (req) handleRequestAction(req, 'accepted'); }} disabled={processing} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition shadow-lg">{processing ? <Loader2 className="animate-spin" size={16}/> : 'Sim, Confirmar'}</button>
             </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="text-xl font-bold flex items-center text-white gap-2"><HelpCircle className="text-primary"/> Central de Notificações</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-400">
                <p>Aqui você gerencia tudo o que chega para a clínica:</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Respostas de E-mail:</strong> Quando um paciente interage com o lembrete.</li>
                   <li><strong>Pedidos Online:</strong> Solicitações de agendamento via link público.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
