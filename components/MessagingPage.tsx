
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Communication, Client } from '../types';
import { Mail, RefreshCw, Loader2, CheckCircle, AlertCircle, User, Filter, AlertTriangle, Clock, Zap, Gift, HelpCircle, X, Calendar, Search, Send, Check } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

// Interface estendida para incluir dados de recall
interface RecallCandidate extends Client {
    lastVisit?: string;
    lastCampaign?: string; // Data do último envio de campanha
    daysSince?: number;
    daysSinceCampaign?: number;
}

const MessagingPage: React.FC = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'automations' | 'recall'>('automations');

  // Estados para Campanha de Retorno (Recall)
  const [rawCandidates, setRawCandidates] = useState<RecallCandidate[]>([]); // Todos os dados carregados
  const [filteredCandidates, setFilteredCandidates] = useState<RecallCandidate[]>([]); // Dados filtrados na tela
  
  // Filtros
  const [recallDays, setRecallDays] = useState<number | ''>(''); // Vazio = Todos
  const [filterNoCampaign, setFilterNoCampaign] = useState(false); // Apenas quem nunca recebeu
  
  // Seleção genérica
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [loadingRecall, setLoadingRecall] = useState(false);

  // Modal de Sucesso
  const [successModal, setSuccessModal] = useState<{ open: boolean, count: number }>({ open: false, count: 0 });

  // Help State
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  // Carrega os dados de recall ao entrar na aba, apenas uma vez
  useEffect(() => {
      if (activeTab === 'recall' && rawCandidates.length === 0) {
          fetchAllPatientsData();
      }
  }, [activeTab]);

  // Aplica filtros automaticamente quando os estados mudam
  useEffect(() => {
      applyFilters();
  }, [recallDays, filterNoCampaign, rawCandidates]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('communications')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);
    
    if (data) {
        setCommunications(data as Communication[]);
    }
    setLoading(false);
  };

  const fetchAllPatientsData = async () => {
      setLoadingRecall(true);
      setRawCandidates([]);
      setSelectedCandidates([]);

      try {
          // 1. Buscar todos os clientes com contato
          const { data: clients } = await supabase
            .from('clients')
            .select('id, name, email, whatsapp')
            .not('email', 'is', null);
          
          if (!clients) {
              setLoadingRecall(false);
              return;
          }

          const { data: { user } } = await supabase.auth.getUser();
          // Fallback seguro se não houver user (não deve acontecer logado)
          if (!user) return; 
          
          // Busca clinic_id
          const { data: profile } = await supabase.from('user_profiles').select('clinic_id').eq('id', user.id).maybeSingle();
          const targetClinicId = profile?.clinic_id || user.id;

          // 2. Buscar agendamentos (Última Visita)
          const { data: appointments } = await supabase
            .from('appointments')
            .select('client_id, start_time')
            .eq('clinic_id', targetClinicId)
            .neq('status', 'cancelled')
            .lte('start_time', new Date().toISOString())
            .order('start_time', { ascending: false });
          
          // 3. Buscar comunicações passadas (Última Campanha)
          const { data: pastCampaigns } = await supabase
            .from('communications')
            .select('related_id, sent_at')
            .eq('clinic_id', targetClinicId)
            .eq('type', 'recall')
            .order('sent_at', { ascending: false });

          // Mapas para acesso rápido
          const lastVisits: Record<string, string> = {};
          if (appointments) {
              appointments.forEach((appt: any) => {
                  if (!lastVisits[appt.client_id]) lastVisits[appt.client_id] = appt.start_time;
              });
          }

          const lastCampaigns: Record<string, string> = {};
          if (pastCampaigns) {
              pastCampaigns.forEach((comm: any) => {
                  if (comm.related_id && !lastCampaigns[comm.related_id]) {
                      lastCampaigns[comm.related_id] = comm.sent_at;
                  }
              });
          }

          const today = new Date();
          const candidates: RecallCandidate[] = clients.map((client: any) => {
              const lastVisitDate = lastVisits[client.id];
              const lastCampaignDate = lastCampaigns[client.id];
              
              let daysSince = -1; // -1 = Nunca
              if (lastVisitDate) {
                  daysSince = differenceInDays(today, parseISO(lastVisitDate));
              }

              let daysSinceCampaign = -1;
              if (lastCampaignDate) {
                  daysSinceCampaign = differenceInDays(today, parseISO(lastCampaignDate));
              }

              return {
                  ...client,
                  lastVisit: lastVisitDate,
                  lastCampaign: lastCampaignDate,
                  daysSince: daysSince,
                  daysSinceCampaign: daysSinceCampaign
              };
          });

          // Ordenar: Quem não vem há mais tempo primeiro
          candidates.sort((a, b) => {
              const da = a.daysSince === -1 ? 99999 : a.daysSince!;
              const db = b.daysSince === -1 ? 99999 : b.daysSince!;
              return db - da;
          });
          
          setRawCandidates(candidates);

      } catch (err) {
          console.error(err);
      } finally {
          setLoadingRecall(false);
      }
  };

  const applyFilters = () => {
      let filtered = [...rawCandidates];

      // Filtro 1: Dias sem consulta
      if (recallDays !== '' && recallDays > 0) {
          filtered = filtered.filter(c => {
              // Se nunca veio (-1), consideramos que faz "muito tempo", então entra no filtro
              // Se veio, verifica se faz mais dias que o filtro
              if (c.daysSince === -1) return true;
              return (c.daysSince || 0) >= Number(recallDays);
          });
      }

      // Filtro 2: Sem e-mail de campanha enviado
      if (filterNoCampaign) {
          filtered = filtered.filter(c => !c.lastCampaign);
      }

      setFilteredCandidates(filtered);
      // Limpa seleção ao filtrar para evitar envio acidental a ocultos
      setSelectedCandidates([]); 
  };

  const sendCampaign = async (type: 'recall') => {
      if (selectedCandidates.length === 0) return;
      
      const candidatesList = filteredCandidates;
      
      setSending(true);
      try {
        const recipients = candidatesList
            .filter(c => selectedCandidates.includes(c.id))
            .map(c => ({ 
                id: c.id, 
                name: c.name, 
                email: c.email 
            }));

        const { data, error } = await supabase.functions.invoke('send-emails', {
            body: { 
                type: type,
                recipients: recipients
            }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        
        const count = data.results?.campaigns || recipients.length;
        
        // Atualiza histórico e reseta seleção
        fetchHistory();
        fetchAllPatientsData(); // Recarrega para atualizar a data da última campanha
        
        // Abre modal de sucesso
        setSuccessModal({ open: true, count });

      } catch (err: any) {
        console.error("Falha no envio:", err);
        alert(err.message || "Erro desconhecido ao processar envio.");
      } finally {
        setSending(false);
      }
  };

  const toggleCandidate = (id: string) => {
      setSelectedCandidates(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const toggleAllCandidates = (list: any[]) => {
      if (selectedCandidates.length === list.length && list.length > 0) {
          setSelectedCandidates([]);
      } else {
          setSelectedCandidates(list.map(c => c.id));
      }
  };

  const getStatusBadge = (status: string) => {
      if (status === 'sent') return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center w-fit"><CheckCircle size={10} className="mr-1"/> Enviado</span>;
      if (status === 'failed') return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center w-fit"><AlertCircle size={10} className="mr-1"/> Falha</span>;
      return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">{status}</span>;
  };

  const getTypeLabel = (type: string) => {
      switch(type) {
          case 'reminder': return 'Lembrete (24h)';
          case 'birthday': return 'Aniversário';
          case 'agenda': return 'Agenda Dentista';
          case 'recall': return 'Campanha Retorno';
          case 'welcome': return 'Boas-vindas';
          default: return type;
      }
  };

  const quickFilters = [
      { label: 'Todos', days: '' },
      { label: '2+ Meses', days: 60 },
      { label: '4+ Meses', days: 120 },
      { label: '6+ Meses', days: 180 },
      { label: '12+ Meses', days: 365 },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Central de Mensagens</h1>
        <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors">
            <HelpCircle size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        <button 
            className={`py-2 px-6 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'automations' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('automations')}
        >
            Histórico & Automações
        </button>
        <button 
            className={`py-2 px-6 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'recall' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('recall')}
        >
            Campanha Manual (Retorno)
        </button>
      </div>

      {activeTab === 'automations' && (
          <div className="grid grid-cols-1 gap-6">
              {/* Painel Principal */}
              <div className="col-span-full space-y-6">
                  
                  {/* Status da Automação */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100 flex items-center justify-between">
                      <div>
                          <h3 className="font-bold text-gray-800 flex items-center gap-2">
                              <Zap className="text-yellow-500 fill-current" size={20} />
                              Sistema de Envios Automáticos
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                              O DentiHub verifica diariamente sua agenda e base de pacientes para enviar e-mails importantes.
                          </p>
                      </div>
                      <div className="text-right hidden sm:block">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                              <Clock size={12} className="mr-1"/> Ativo
                          </span>
                          <p className="text-xs text-gray-500 mt-1">Processamento: 08:00</p>
                      </div>
                  </div>

                  {/* Histórico Recente */}
                  <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                      <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                          <h3 className="font-bold text-gray-800">Últimos Envios</h3>
                          <button onClick={fetchHistory} className="text-gray-400 hover:text-primary transition-colors p-2 hover:bg-gray-100 rounded-full">
                              <RefreshCw size={18} className={loading ? "animate-spin" : ""}/>
                          </button>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                  <tr>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tipo</th>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Destinatário</th>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                  </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                  {communications.length === 0 ? (
                                      <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">Nenhum envio registrado recentemente.</td></tr>
                                  ) : (
                                      communications.map(c => (
                                          <tr key={c.id} className="hover:bg-gray-50">
                                              <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600">
                                                  {format(parseISO(c.sent_at), "dd/MM HH:mm")}
                                              </td>
                                              <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-800 font-medium">
                                                  {getTypeLabel(c.type)}
                                              </td>
                                              <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600">
                                                  <div className="font-bold">{c.recipient_name}</div>
                                                  <div className="text-[10px] text-gray-400">{c.recipient_email}</div>
                                              </td>
                                              <td className="px-6 py-3 whitespace-nowrap">
                                                  {getStatusBadge(c.status)}
                                              </td>
                                          </tr>
                                      ))
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'recall' && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 animate-fade-in-up">
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
                  <p className="text-sm text-orange-800">
                      <strong>Campanha Manual:</strong> Filtre pacientes que não comparecem à clínica há um determinado período e envie um e-mail de retorno.
                  </p>
              </div>

              <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Filtros Rápidos (Tempo sem consulta)</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                      {quickFilters.map(filter => (
                          <button
                              key={filter.label}
                              onClick={() => setRecallDays(filter.days as any)}
                              className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                                  recallDays === filter.days 
                                  ? 'bg-primary text-white border-primary shadow-md' 
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
                              }`}
                          >
                              {filter.label}
                          </button>
                      ))}
                  </div>

                  <div className="flex flex-col md:flex-row items-end gap-4 pb-6 border-b">
                      <div className="w-full md:w-auto">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                              Dias sem consulta (mínimo)
                          </label>
                          <div className="flex items-center gap-2">
                              <input 
                                  type="number" 
                                  value={recallDays}
                                  onChange={(e) => setRecallDays(e.target.value ? Number(e.target.value) : '')}
                                  placeholder="Todos"
                                  className="border p-2 rounded w-32 text-sm focus:ring-primary focus:border-primary outline-none"
                                  min="0"
                              />
                          </div>
                      </div>
                      
                      <div className="flex items-center h-10 pb-1">
                          <label className="flex items-center cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                              <input 
                                  type="checkbox" 
                                  checked={filterNoCampaign}
                                  onChange={(e) => setFilterNoCampaign(e.target.checked)}
                                  className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                              />
                              Nunca receberam campanha
                          </label>
                      </div>

                      {/* Botão de atualizar manual caso necessário, embora useEffect cuide disso */}
                      <button 
                          onClick={fetchAllPatientsData}
                          disabled={loadingRecall}
                          className="ml-auto px-4 py-2 text-primary hover:bg-blue-50 rounded font-bold transition flex items-center text-sm border border-transparent hover:border-blue-100"
                      >
                          <RefreshCw className={`mr-2 ${loadingRecall ? "animate-spin" : ""}`} size={16}/>
                          Atualizar Lista
                      </button>
                  </div>
              </div>

              {filteredCandidates.length > 0 ? (
                  <div className="animate-fade-in-up">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-gray-700">
                              {filteredCandidates.length} Pacientes Encontrados
                          </h3>
                          <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500">
                                  {selectedCandidates.length} selecionados
                              </span>
                              <button 
                                  onClick={() => sendCampaign('recall')}
                                  disabled={selectedCandidates.length === 0 || sending}
                                  className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition disabled:opacity-50 flex items-center shadow-md"
                              >
                                  {sending ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2" size={16}/>}
                                  Enviar Campanha
                              </button>
                          </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto custom-scrollbar">
                          <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0 z-10">
                                  <tr>
                                      <th className="px-4 py-3 w-10 text-center">
                                          <input 
                                              type="checkbox" 
                                              checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                                              onChange={() => toggleAllCandidates(filteredCandidates)}
                                              className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                          />
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Paciente</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Última Consulta</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Última Campanha</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contato</th>
                                  </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                  {filteredCandidates.map(c => (
                                      <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${selectedCandidates.includes(c.id) ? 'bg-blue-50/30' : ''}`}>
                                          <td className="px-4 py-3 text-center">
                                              <input 
                                                  type="checkbox" 
                                                  checked={selectedCandidates.includes(c.id)}
                                                  onChange={() => toggleCandidate(c.id)}
                                                  className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                              />
                                          </td>
                                          <td className="px-4 py-3">
                                              <div className="text-sm font-bold text-gray-800">{c.name}</div>
                                          </td>
                                          <td className="px-4 py-3">
                                              {c.daysSince === -1 ? (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                                                      Nunca visitou
                                                  </span>
                                              ) : (
                                                  <div>
                                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold mb-1 ${
                                                          (c.daysSince || 0) > 180 ? 'bg-red-100 text-red-800' : 
                                                          (c.daysSince || 0) > 90 ? 'bg-orange-100 text-orange-800' : 
                                                          'bg-green-100 text-green-800'
                                                      }`}>
                                                          Há {c.daysSince} dias
                                                      </span>
                                                      <div className="text-xs text-gray-500">
                                                          {c.lastVisit ? format(parseISO(c.lastVisit), 'dd/MM/yyyy') : '-'}
                                                      </div>
                                                  </div>
                                              )}
                                          </td>
                                          <td className="px-4 py-3">
                                              {c.lastCampaign ? (
                                                  <div className="text-xs text-gray-600">
                                                      <div className="font-bold text-gray-700">{format(parseISO(c.lastCampaign), 'dd/MM/yyyy')}</div>
                                                      <span className="text-gray-400">Há {c.daysSinceCampaign} dias</span>
                                                  </div>
                                              ) : (
                                                  <span className="text-xs text-gray-400 italic">Nunca enviado</span>
                                              )}
                                          </td>
                                          <td className="px-4 py-3">
                                              <div className="text-sm text-gray-600">{c.email}</div>
                                              <div className="text-xs text-gray-400">{c.whatsapp}</div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              ) : (
                  !loadingRecall && (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <User size={48} className="mx-auto mb-2 opacity-20"/>
                        <p>Nenhum paciente encontrado com os critérios selecionados.</p>
                        <button onClick={() => { setRecallDays(''); setFilterNoCampaign(false); }} className="text-sm text-primary hover:underline mt-2">Limpar filtros</button>
                    </div>
                  )
              )}
              
              {loadingRecall && (
                  <div className="text-center py-12">
                      <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto"/>
                      <p className="text-gray-500 mt-2">Carregando lista de pacientes...</p>
                  </div>
              )}
          </div>
      )}

      {/* Success Modal */}
      {successModal.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm text-center transform transition-all scale-100">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                    <Check className="h-8 w-8 text-green-600" strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Sucesso!</h3>
                <p className="text-gray-600 mb-6">
                    Sua campanha foi enviada para <strong>{successModal.count}</strong> pacientes com sucesso.
                </p>
                <button 
                    onClick={() => setSuccessModal({ open: false, count: 0 })}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition shadow-md"
                >
                    Concluir
                </button>
            </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center text-gray-800 gap-2"><HelpCircle className="text-primary"/> Central de Mensagens</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-600">
                <p>Aqui você gerencia a comunicação automatizada e campanhas de marketing da clínica.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Histórico & Automações:</strong> Veja os e-mails enviados automaticamente pelo sistema (Lembretes de 24h, Aniversários, Boas-vindas e Agendas Diárias dos dentistas).</li>
                   <li><strong>Campanha Manual (Retorno):</strong> Utilize esta aba para encontrar pacientes que não visitam a clínica há um determinado tempo. Você pode filtrar por período, ver quem nunca recebeu campanhas e enviar e-mails em massa convidando para um check-up.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingPage;
