
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Communication, Client } from '../types';
import { Mail, RefreshCw, Loader2, CheckCircle, AlertCircle, User, Filter, AlertTriangle, Clock, Zap, Gift, HelpCircle, X, Calendar, Search, Send, Check } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

interface RecallCandidate extends Client {
    lastVisit?: string;
    lastCampaign?: string; 
    daysSince?: number;
    daysSinceCampaign?: number;
}

const MessagingPage: React.FC = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'automations' | 'recall'>('automations');

  const [rawCandidates, setRawCandidates] = useState<RecallCandidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<RecallCandidate[]>([]);
  const [recallDays, setRecallDays] = useState<number | ''>('');
  const [filterNoCampaign, setFilterNoCampaign] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [loadingRecall, setLoadingRecall] = useState(false);
  const [successModal, setSuccessModal] = useState<{ open: boolean, count: number }>({ open: false, count: 0 });
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => { fetchHistory(); }, []);
  useEffect(() => { if (activeTab === 'recall' && rawCandidates.length === 0) fetchAllPatientsData(); }, [activeTab]);
  useEffect(() => { applyFilters(); }, [recallDays, filterNoCampaign, rawCandidates]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase.from('communications').select('*').order('sent_at', { ascending: false }).limit(50);
    if (data) setCommunications(data as Communication[]);
    setLoading(false);
  };

  const fetchAllPatientsData = async () => {
      setLoadingRecall(true);
      setRawCandidates([]); setSelectedCandidates([]);
      try {
          const { data: clients } = await supabase.from('clients').select('id, name, email, whatsapp').not('email', 'is', null);
          if (!clients) { setLoadingRecall(false); return; }
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return; 
          const { data: profile } = await supabase.from('user_profiles').select('clinic_id').eq('id', user.id).maybeSingle();
          const targetClinicId = profile?.clinic_id || user.id;

          const { data: appointments } = await supabase.from('appointments').select('client_id, start_time').eq('clinic_id', targetClinicId).neq('status', 'cancelled').lte('start_time', new Date().toISOString()).order('start_time', { ascending: false });
          const { data: pastCampaigns } = await supabase.from('communications').select('related_id, sent_at').eq('clinic_id', targetClinicId).eq('type', 'recall').order('sent_at', { ascending: false });

          const lastVisits: Record<string, string> = {};
          if (appointments) appointments.forEach((appt: any) => { if (!lastVisits[appt.client_id]) lastVisits[appt.client_id] = appt.start_time; });
          const lastCampaigns: Record<string, string> = {};
          if (pastCampaigns) pastCampaigns.forEach((comm: any) => { if (comm.related_id && !lastCampaigns[comm.related_id]) lastCampaigns[comm.related_id] = comm.sent_at; });

          const today = new Date();
          const candidates: RecallCandidate[] = clients.map((client: any) => {
              const lastVisitDate = lastVisits[client.id];
              const lastCampaignDate = lastCampaigns[client.id];
              let daysSince = -1; 
              if (lastVisitDate) daysSince = differenceInDays(today, parseISO(lastVisitDate));
              let daysSinceCampaign = -1;
              if (lastCampaignDate) daysSinceCampaign = differenceInDays(today, parseISO(lastCampaignDate));
              return { ...client, lastVisit: lastVisitDate, lastCampaign: lastCampaignDate, daysSince: daysSince, daysSinceCampaign: daysSinceCampaign };
          });
          candidates.sort((a, b) => { const da = a.daysSince === -1 ? 99999 : a.daysSince!; const db = b.daysSince === -1 ? 99999 : b.daysSince!; return db - da; });
          setRawCandidates(candidates);
      } catch (err) { console.error(err); } finally { setLoadingRecall(false); }
  };

  const applyFilters = () => {
      let filtered = [...rawCandidates];
      if (recallDays !== '' && recallDays > 0) filtered = filtered.filter(c => { if (c.daysSince === -1) return true; return (c.daysSince || 0) >= Number(recallDays); });
      if (filterNoCampaign) filtered = filtered.filter(c => !c.lastCampaign);
      setFilteredCandidates(filtered); setSelectedCandidates([]); 
  };

  const sendCampaign = async (type: 'recall') => {
      if (selectedCandidates.length === 0) return;
      setSending(true);
      try {
        const recipients = filteredCandidates.filter(c => selectedCandidates.includes(c.id)).map(c => ({ id: c.id, name: c.name, email: c.email }));
        const { data, error } = await supabase.functions.invoke('send-emails', { body: { type: type, recipients: recipients } });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        const count = data.results?.campaigns || recipients.length;
        fetchHistory(); fetchAllPatientsData(); 
        setSuccessModal({ open: true, count });
      } catch (err: any) { alert(err.message || "Erro desconhecido."); } finally { setSending(false); }
  };

  const toggleCandidate = (id: string) => setSelectedCandidates(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAllCandidates = (list: any[]) => { if (selectedCandidates.length === list.length && list.length > 0) setSelectedCandidates([]); else setSelectedCandidates(list.map(c => c.id)); };

  const getStatusBadge = (status: string) => {
      if (status === 'sent') return <span className="px-2 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-500/20 text-xs font-bold flex items-center w-fit"><CheckCircle size={10} className="mr-1"/> Enviado</span>;
      if (status === 'failed') return <span className="px-2 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-500/20 text-xs font-bold flex items-center w-fit"><AlertCircle size={10} className="mr-1"/> Falha</span>;
      return <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-400 text-xs font-bold">{status}</span>;
  };

  const getTypeLabel = (type: string) => {
      switch(type) { case 'reminder': return 'Lembrete (24h)'; case 'birthday': return 'Aniversário'; case 'agenda': return 'Agenda Dentista'; case 'recall': return 'Campanha Retorno'; case 'welcome': return 'Boas-vindas'; default: return type; }
  };

  const quickFilters = [ { label: 'Todos', days: '' }, { label: '2+ Meses', days: 60 }, { label: '4+ Meses', days: 120 }, { label: '6+ Meses', days: 180 }, { label: '12+ Meses', days: 365 } ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Central de Mensagens</h1>
        <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors"><HelpCircle size={20} /></button>
      </div>

      <div className="flex border-b border-white/10 mb-6 overflow-x-auto">
        <button className={`py-2 px-6 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'automations' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'}`} onClick={() => setActiveTab('automations')}>Histórico & Automações</button>
        <button className={`py-2 px-6 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'recall' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'}`} onClick={() => setActiveTab('recall')}>Campanha Manual (Retorno)</button>
      </div>

      {activeTab === 'automations' && (
          <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 p-6 rounded-lg border border-blue-500/20 flex items-center justify-between">
                  <div>
                      <h3 className="font-bold text-white flex items-center gap-2"><Zap className="text-yellow-400 fill-current" size={20} /> Sistema de Envios Automáticos</h3>
                      <p className="text-sm text-gray-400 mt-1">O DentiHub verifica diariamente sua agenda e base de pacientes.</p>
                  </div>
                  <div className="text-right hidden sm:block">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-900/30 text-green-400 border border-green-500/30"><Clock size={12} className="mr-1"/> Ativo</span>
                      <p className="text-xs text-gray-500 mt-1">Processamento: 08:00</p>
                  </div>
              </div>

              <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow border border-white/5 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5 bg-gray-800/50 flex justify-between items-center">
                      <h3 className="font-bold text-white">Últimos Envios</h3>
                      <button onClick={fetchHistory} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"><RefreshCw size={18} className={loading ? "animate-spin" : ""}/></button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-white/5">
                          <thead className="bg-gray-800/50">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Data</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Tipo</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Destinatário</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                              {communications.length === 0 ? (
                                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">Nenhum envio registrado.</td></tr>
                              ) : (
                                  communications.map(c => (
                                      <tr key={c.id} className="hover:bg-gray-800/50">
                                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-400">{format(parseISO(c.sent_at), "dd/MM HH:mm")}</td>
                                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-300 font-medium">{getTypeLabel(c.type)}</td>
                                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-400">
                                              <div className="font-bold text-gray-200">{c.recipient_name}</div>
                                              <div className="text-[10px] text-gray-500">{c.recipient_email}</div>
                                          </td>
                                          <td className="px-6 py-3 whitespace-nowrap">{getStatusBadge(c.status)}</td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'recall' && (
          <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-lg shadow border border-white/5 animate-fade-in-up">
              <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-6">
                  <p className="text-sm text-orange-200"><strong>Campanha Manual:</strong> Filtre pacientes que não comparecem há um tempo e envie um e-mail de retorno.</p>
              </div>

              <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-400 mb-2">Filtros Rápidos</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                      {quickFilters.map(filter => (
                          <button key={filter.label} onClick={() => setRecallDays(filter.days as any)} className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${recallDays === filter.days ? 'bg-primary text-white border-primary' : 'bg-gray-800 text-gray-400 border-white/10 hover:border-primary hover:text-white'}`}>{filter.label}</button>
                      ))}
                  </div>

                  <div className="flex flex-col md:flex-row items-end gap-4 pb-6 border-b border-white/5">
                      <div className="w-full md:w-auto">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dias sem consulta (mín)</label>
                          <div className="flex items-center gap-2">
                              <input type="number" value={recallDays} onChange={(e) => setRecallDays(e.target.value ? Number(e.target.value) : '')} placeholder="Todos" className="bg-gray-800 border border-white/10 p-2 rounded w-32 text-sm text-white focus:border-primary outline-none" min="0"/>
                          </div>
                      </div>
                      
                      <div className="flex items-center h-10 pb-1">
                          <label className="flex items-center cursor-pointer text-sm text-gray-400 hover:text-white">
                              <input type="checkbox" checked={filterNoCampaign} onChange={(e) => setFilterNoCampaign(e.target.checked)} className="mr-2 bg-gray-800 border-gray-600 rounded text-primary"/> Nunca receberam campanha
                          </label>
                      </div>

                      <button onClick={fetchAllPatientsData} disabled={loadingRecall} className="ml-auto px-4 py-2 text-primary hover:bg-blue-500/10 rounded font-bold transition flex items-center text-sm">
                          <RefreshCw className={`mr-2 ${loadingRecall ? "animate-spin" : ""}`} size={16}/> Atualizar
                      </button>
                  </div>
              </div>

              {filteredCandidates.length > 0 ? (
                  <div className="animate-fade-in-up">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-gray-300">{filteredCandidates.length} Pacientes Encontrados</h3>
                          <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500">{selectedCandidates.length} selecionados</span>
                              <button onClick={() => sendCampaign('recall')} disabled={selectedCandidates.length === 0 || sending} className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition disabled:opacity-50 flex items-center shadow-md">
                                  {sending ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2" size={16}/>} Enviar Campanha
                              </button>
                          </div>
                      </div>

                      <div className="border border-white/5 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto custom-scrollbar">
                          <table className="min-w-full divide-y divide-white/5">
                              <thead className="bg-gray-800 sticky top-0 z-10">
                                  <tr>
                                      <th className="px-4 py-3 w-10 text-center">
                                          <input type="checkbox" checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0} onChange={() => toggleAllCandidates(filteredCandidates)} className="bg-gray-700 border-gray-600 rounded text-primary"/>
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Paciente</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Última Consulta</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Última Campanha</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Contato</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                  {filteredCandidates.map(c => (
                                      <tr key={c.id} className={`hover:bg-gray-800/50 transition-colors ${selectedCandidates.includes(c.id) ? 'bg-blue-900/20' : ''}`}>
                                          <td className="px-4 py-3 text-center">
                                              <input type="checkbox" checked={selectedCandidates.includes(c.id)} onChange={() => toggleCandidate(c.id)} className="bg-gray-700 border-gray-600 rounded text-primary"/>
                                          </td>
                                          <td className="px-4 py-3"><div className="text-sm font-bold text-gray-200">{c.name}</div></td>
                                          <td className="px-4 py-3">
                                              {c.daysSince === -1 ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-500">Nunca visitou</span> : (
                                                  <div>
                                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold mb-1 ${ (c.daysSince || 0) > 180 ? 'bg-red-900/30 text-red-400' : (c.daysSince || 0) > 90 ? 'bg-orange-900/30 text-orange-400' : 'bg-green-900/30 text-green-400' }`}>Há {c.daysSince} dias</span>
                                                      <div className="text-xs text-gray-500">{c.lastVisit ? format(parseISO(c.lastVisit), 'dd/MM/yyyy') : '-'}</div>
                                                  </div>
                                              )}
                                          </td>
                                          <td className="px-4 py-3">
                                              {c.lastCampaign ? (
                                                  <div className="text-xs text-gray-400">
                                                      <div className="font-bold text-gray-300">{format(parseISO(c.lastCampaign), 'dd/MM/yyyy')}</div>
                                                      <span className="text-gray-500">Há {c.daysSinceCampaign} dias</span>
                                                  </div>
                                              ) : <span className="text-xs text-gray-600 italic">Nunca enviado</span>}
                                          </td>
                                          <td className="px-4 py-3">
                                              <div className="text-sm text-gray-400">{c.email}</div>
                                              <div className="text-xs text-gray-500">{c.whatsapp}</div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              ) : !loadingRecall && (
                    <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-lg border border-dashed border-white/10">
                        <User size={48} className="mx-auto mb-2 opacity-20"/>
                        <p>Nenhum paciente encontrado.</p>
                        <button onClick={() => { setRecallDays(''); setFilterNoCampaign(false); }} className="text-sm text-primary hover:underline mt-2">Limpar filtros</button>
                    </div>
              )}
              {loadingRecall && <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary mx-auto"/><p className="text-gray-500 mt-2">Carregando...</p></div>}
          </div>
      )}

      {/* Success Modal */}
      {successModal.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-white/10 p-8 rounded-xl shadow-2xl w-full max-w-sm text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-900/30 mb-6"><Check className="h-8 w-8 text-green-500" strokeWidth={3} /></div>
                <h3 className="text-2xl font-bold text-white mb-2">Sucesso!</h3>
                <p className="text-gray-400 mb-6">Sua campanha foi enviada para <strong>{successModal.count}</strong> pacientes.</p>
                <button onClick={() => setSuccessModal({ open: false, count: 0 })} className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition shadow-md">Concluir</button>
            </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="text-xl font-bold flex items-center text-white gap-2"><HelpCircle className="text-primary"/> Central de Mensagens</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-400">
                <p>Aqui você gerencia a comunicação automatizada e campanhas.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Histórico & Automações:</strong> Acompanhe envios automáticos (lembretes, etc).</li>
                   <li><strong>Campanha Manual:</strong> Filtre pacientes sumidos e envie e-mails de retorno em massa.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingPage;
