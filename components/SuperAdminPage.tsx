import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Users, Building2, Calendar, Mic, Activity, 
  FileText, CalendarRange, RefreshCw,
  BarChart3, ArrowLeft, Sparkles, CreditCard,
  Monitor, Menu, X, HeartPulse, AlertTriangle, CheckCircle, TrendingUp,
  Megaphone, Trash2, Send, AlertOctagon, UserX, Clock, Tag, Copy, Mail
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInHours } from 'date-fns';
import Toast, { ToastType } from './Toast';

// ... (MetricCard e HealthIndicator mantidos iguais) ...
const MetricCard: React.FC<{title: string, value: string, icon: any, color: string, trend?: string, subtext?: string}> = ({ title, value, icon: Icon, color, trend, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center relative overflow-hidden">
    <div className={`p-4 rounded-full mr-4 ${color.replace('text-', 'bg-').replace('600', '50').replace('500', '50')}`}>
      <Icon size={24} className={color} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium uppercase">{title}</p>
      <p className="text-2xl font-black text-gray-800">{value}</p>
      {trend && <p className="text-xs text-green-500 font-bold mt-1 flex items-center"><TrendingUp size={10} className="mr-1"/> {trend}</p>}
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

const HealthIndicator: React.FC<{ label: string; date: string | null }> = ({ label, date }) => {
    if (!date) return <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200 text-gray-400 text-sm"><span>{label}</span> <span>Nunca</span></div>;
    const diff = differenceInHours(new Date(), parseISO(date));
    const isCritical = diff > 24;
    const isWarning = diff > 4 && diff <= 24;
    return (
        <div className={`flex justify-between items-center p-3 rounded border text-sm font-medium ${isCritical ? 'bg-red-50 border-red-200 text-red-700' : isWarning ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <span className="flex items-center gap-2">{isCritical ? <AlertTriangle size={14}/> : <CheckCircle size={14}/>}{label}</span>
            <span>Há {diff}h</span>
        </div>
    );
};

const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // New States
  const [activeTab, setActiveTab] = useState<'overview' | 'churn' | 'broadcast' | 'remotion' | 'marketing'>('overview');
  const [atRiskClinics, setAtRiskClinics] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [remotionPrompt, setRemotionPrompt] = useState(`Crie um vídeo tutorial de 60 segundos mostrando:
1. Abertura com logo animado.
2. Transição para o Dashboard.
3. Destaque para o Prontuário com IA.
4. Encerramento com CTA para o plano Pro.`);
  const [generatedRemotionCode, setGeneratedRemotionCode] = useState('');
  const [isGeneratingRemotion, setIsGeneratingRemotion] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderComplete, setRenderComplete] = useState(false);
  
  // State atualizado para incluir datas
  const [newAnnouncement, setNewAnnouncement] = useState({ 
      title: '', 
      message: '', 
      type: 'info',
      start_at: '',
      expires_at: ''
  });

  // --- DASHBOARD STATES ---
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [metrics, setMetrics] = useState({ clinics: 0, transactionsCount: 0, appointments: 0, aiRecords: 0 });

  useEffect(() => {
    if (activeTab === 'overview') fetchData();
    if (activeTab === 'churn') fetchChurnData();
    if (activeTab === 'broadcast') fetchAnnouncements();
    if (activeTab === 'marketing') fetchUsers();
  }, [dateRange, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: healthData, error: healthError } = await supabase.rpc('get_system_health');
        if (healthError) throw healthError;
        if (healthData && healthData.length > 0) setSystemHealth(healthData[0]);

        const start = startOfDay(parseISO(dateRange.start)).toISOString();
        const end = endOfDay(parseISO(dateRange.end)).toISOString();
        const { count: appts } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        const { count: trans } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('date', start).lte('date', end);
        const { count: recs } = await supabase.from('clinical_records').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);

        setMetrics({ clinics: 0, transactionsCount: trans || 0, appointments: appts || 0, aiRecords: recs || 0 });
    } catch (err: any) { console.error(err); setToast({ message: "Erro ao carregar dados.", type: 'error' }); } finally { setLoading(false); }
  };

  const fetchChurnData = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase.rpc('get_at_risk_clinics');
          if (error) throw error;
          setAtRiskClinics(data || []);
      } catch (err: any) { setToast({ message: "Erro churn: " + err.message, type: 'error' }); } finally { setLoading(false); }
  };

  const fetchAnnouncements = async () => {
      const { data } = await supabase.from('system_announcements').select('*').order('created_at', { ascending: false });
      setAnnouncements(data || []);
  };

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('id, email, role, clinic_id, clinics(name)')
            .order('email');
          if (error) throw error;
          setUsers(data || []);
      } catch (err: any) {
          setToast({ message: "Erro ao carregar usuários: " + err.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleSendBulkEmail = async () => {
      if (selectedUsers.length === 0) {
          setToast({ message: "Selecione pelo menos um usuário.", type: 'warning' });
          return;
      }

      setIsSendingEmails(true);
      try {
          const recipients = users
            .filter(u => selectedUsers.includes(u.id))
            .map(u => ({ email: u.email, name: 'Doutor(a)' }));

          const { data, error } = await supabase.functions.invoke('send-emails', {
              body: {
                  type: selectedTemplate,
                  recipients,
                  clinicName: 'DentiHub'
              }
          });

          if (error) throw error;
          setToast({ message: `E-mails enviados com sucesso para ${recipients.length} usuários!`, type: 'success' });
          setSelectedUsers([]);
      } catch (err: any) {
          setToast({ message: "Erro ao enviar e-mails: " + err.message, type: 'error' });
      } finally {
          setIsSendingEmails(false);
      }
  };

  const handlePostAnnouncement = async () => {
      if(!newAnnouncement.title || !newAnnouncement.message) {
          setToast({ message: "Preencha título e mensagem.", type: 'warning' });
          return;
      }
      
      try {
          const payload = {
              title: newAnnouncement.title,
              message: newAnnouncement.message,
              type: newAnnouncement.type,
              start_at: newAnnouncement.start_at ? new Date(newAnnouncement.start_at).toISOString() : new Date().toISOString(),
              expires_at: newAnnouncement.expires_at ? new Date(newAnnouncement.expires_at).toISOString() : null
          };

          const { error } = await supabase.from('system_announcements').insert(payload);
          if (error) throw error;
          
          setToast({ message: "Aviso publicado!", type: 'success' });
          setNewAnnouncement({ title: '', message: '', type: 'info', start_at: '', expires_at: '' });
          fetchAnnouncements();
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
      await supabase.from('system_announcements').delete().eq('id', id);
      fetchAnnouncements();
  };

  const handleGenerateRemotionCode = async () => {
    if (!remotionPrompt.trim()) {
        setToast({ message: "Por favor, insira um script para o vídeo.", type: 'warning' });
        return;
    }

    setIsGeneratingRemotion(true);
    try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: `Você é um especialista em Remotion (remotion.dev). 
            Gere um código React completo para um vídeo do Remotion baseado no seguinte script: "${remotionPrompt}".
            
            Regras:
            1. Use componentes funcionais e hooks do React.
            2. Use a biblioteca 'remotion' e 'lucide-react' para ícones. 
            3. ATENÇÃO: Use apenas nomes de ícones VÁLIDOS do Lucide (ex: LayoutDashboard, Users, Calendar, DollarSign, Brain, Settings). NÃO invente nomes como 'Sidebar'.
            4. O código deve ser um componente React principal (ex: export const RemotionVideo = () => { ... }) que retorna um <AbsoluteFill>.
            5. Defina todos os sub-componentes (como Sidebar, Header, etc) DENTRO do mesmo arquivo, ANTES do componente principal.
            6. IMPORTANTE: NÃO inclua a tag <Composition>.
            7. Retorne APENAS o código dentro de um bloco de código markdown.`,
        });

        const codeMatch = response.text?.match(/```(?:tsx|jsx|javascript|typescript)?\s*([\s\S]*?)```/);
        const code = codeMatch ? codeMatch[1] : response.text;
        
        setGeneratedRemotionCode(code || '');
        setToast({ message: "Código Remotion gerado com sucesso!", type: 'success' });
    } catch (err: any) {
        console.error(err);
        setToast({ message: "Erro ao gerar código: " + err.message, type: 'error' });
    } finally {
        setIsGeneratingRemotion(false);
    }
  };

  const handleStartRender = () => {
    if (!generatedRemotionCode) return;
    
    setIsRendering(true);
    setRenderProgress(0);
    setRenderComplete(false);

    const interval = setInterval(() => {
        setRenderProgress(prev => {
            if (prev >= 100) {
                clearInterval(interval);
                setIsRendering(false);
                setRenderComplete(true);
                setToast({ message: "Renderização concluída (Simulação)!", type: 'success' });
                return 100;
            }
            return prev + Math.random() * 15;
        });
    }, 400);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex-shrink-0 flex flex-col border-r border-gray-800 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div><h1 className="text-xl font-black text-white flex items-center gap-2"><Activity className="text-red-600" /> GOD MODE</h1><p className="text-xs text-gray-500 mt-1">Centro de Comando</p></div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white md:hidden"><X size={24} /></button>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <button onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><BarChart3 size={18} className="mr-3"/> Visão Geral</button>
              <button onClick={() => { setActiveTab('churn'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'churn' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><UserX size={18} className="mr-3"/> Radar de Churn</button>
              <button onClick={() => { setActiveTab('broadcast'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'broadcast' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><Megaphone size={18} className="mr-3"/> Comunicados</button>
              <button onClick={() => { setActiveTab('marketing'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'marketing' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><Mail size={18} className="mr-3"/> E-mail Marketing</button>
              <button onClick={() => { setActiveTab('remotion'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'remotion' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><Monitor size={18} className="mr-3"/> Remotion</button>
              
              <div className="pt-4 mt-4 border-t border-gray-800">
                  <button onClick={() => { navigate('/super-admin/campaigns'); }} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><Sparkles size={18} className="mr-3"/> Marketing Studio</button>
                  <button onClick={() => { navigate('/super-admin/ads'); }} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><Monitor size={18} className="mr-3"/> Google Ads</button>
                  <button onClick={() => { navigate('/super-admin/leads'); }} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><Users size={18} className="mr-3"/> Gestão de Leads</button>
                  <button onClick={() => { navigate('/super-admin/subscriptions'); }} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><CreditCard size={18} className="mr-3"/> Assinaturas</button>
                  <button onClick={() => { navigate('/super-admin/plans'); }} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><Tag size={18} className="mr-3"/> Preços e Planos</button>
              </div>
          </nav>
          <div className="p-4 border-t border-gray-800"><button onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-center px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:text-white hover:border-gray-500 transition text-xs font-bold"><ArrowLeft size={14} className="mr-2"/> Voltar à Clínica</button></div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col w-full relative">
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><Activity className="text-red-600" size={20} /> God Mode</h2>
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-1"><Menu size={24} /></button>
        </div>

        <div className="p-4 sm:p-8 space-y-8 animate-fade-in w-full">
            
            {activeTab === 'overview' && (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-800">Saúde do Sistema</h2>
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200 w-full sm:w-auto overflow-x-auto">
                            <CalendarRange size={16} className="text-gray-400 ml-2 flex-shrink-0" />
                            <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="border-none text-sm text-gray-600 outline-none bg-transparent"/>
                            <span className="text-gray-300">-</span>
                            <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="border-none text-sm text-gray-600 outline-none bg-transparent"/>
                            <button onClick={fetchData} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-500 transition"><RefreshCw size={14}/></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard title="MRR Estimado" value={systemHealth?.mrr_estimate ? `R$ ${systemHealth.mrr_estimate.toLocaleString('pt-BR')}` : 'R$ 0'} icon={CreditCard} color="text-green-600" subtext="Baseado em assinaturas ativas"/>
                        <MetricCard title="Clínicas Ativas" value={(systemHealth?.active_clinics || 0).toString()} icon={Building2} color="text-indigo-600" trend={`+${systemHealth?.new_clinics_month || 0} este mês`}/>
                        <MetricCard title="Volume (Filtro)" value={metrics.transactionsCount.toString()} icon={FileText} color="text-blue-600" subtext="Lançamentos Financeiros" />
                        <MetricCard title="Uso de IA" value={metrics.aiRecords.toString()} icon={Mic} color="text-purple-600" subtext="Prontuários Gerados"/>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><HeartPulse className="text-red-500"/> Sinais Vitais (Última Atividade)</h3>
                            <div className="space-y-3">
                                <HealthIndicator label="Novo Agendamento" date={systemHealth?.last_appointment_at} />
                                <HealthIndicator label="Novo Paciente" date={systemHealth?.last_patient_at} />
                                <HealthIndicator label="Uso de IA (Prontuário)" date={systemHealth?.last_record_at} />
                                <HealthIndicator label="Login de Usuário" date={systemHealth?.last_login_at} />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="text-orange-500"/> Monitoramento de Erros</h3>
                            <div className="flex items-center justify-center h-40">
                                {systemHealth?.errors_today > 0 ? (
                                    <div className="text-center"><span className="text-4xl font-black text-red-500">{systemHealth.errors_today}</span><p className="text-gray-500 font-medium">Erros críticos hoje</p><p className="text-xs text-red-400 mt-2">Verifique os logs das Edge Functions.</p></div>
                                ) : (
                                    <div className="text-center"><CheckCircle size={48} className="text-green-500 mx-auto mb-2"/><p className="text-gray-800 font-bold">Sistema Estável</p><p className="text-sm text-gray-500">Nenhum erro registrado hoje.</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'churn' && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><AlertOctagon className="text-red-500"/> Radar de Risco (Churn)</h2>
                    <p className="text-gray-600">Clínicas sem atividade há mais de 7 dias ou sem uso de agendamento recente.</p>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-4">Clínica</th>
                                    <th className="px-6 py-4">Dias Inativo</th>
                                    <th className="px-6 py-4">Contato</th>
                                    <th className="px-6 py-4">Plano</th>
                                    <th className="px-6 py-4">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {atRiskClinics.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma clínica em risco no momento. 👏</td></tr> : 
                                atRiskClinics.map((clinic, idx) => (
                                    <tr key={clinic.clinic_id || idx} className="hover:bg-red-50 transition">
                                        <td className="px-6 py-4 font-bold text-gray-800">{clinic.clinic_name}</td>
                                        <td className="px-6 py-4"><span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold text-xs">{clinic.days_inactive} dias</span></td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-600">{clinic.owner_email}</div>
                                            <div className="text-xs text-gray-500">{clinic.owner_phone}</div>
                                        </td>
                                        <td className="px-6 py-4 uppercase text-xs font-bold text-gray-500">{clinic.subscription_tier}</td>
                                        <td className="px-6 py-4">
                                            <a href={`https://wa.me/55${clinic.owner_phone?.replace(/\D/g, '')}?text=Olá, vi que faz um tempinho que não acessa o DentiHub. Precisa de ajuda?`} target="_blank" className="text-green-600 font-bold text-xs hover:underline bg-green-50 px-2 py-1 rounded">WhatsApp</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'broadcast' && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Megaphone className="text-blue-500"/> Comunicados Globais</h2>
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">Novo Aviso</h3>
                        <div className="grid gap-4">
                            <input className="w-full border rounded p-2 text-sm" placeholder="Título" value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} />
                            <textarea className="w-full border rounded p-2 text-sm h-24" placeholder="Mensagem" value={newAnnouncement.message} onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Início da Exibição</label>
                                    <input type="datetime-local" className="w-full border rounded p-2 text-sm" value={newAnnouncement.start_at} onChange={e => setNewAnnouncement({...newAnnouncement, start_at: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Fim da Exibição (Expira em)</label>
                                    <input type="datetime-local" className="w-full border rounded p-2 text-sm" value={newAnnouncement.expires_at} onChange={e => setNewAnnouncement({...newAnnouncement, expires_at: e.target.value})} />
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-2">
                                <select className="border rounded p-2 text-sm w-48" value={newAnnouncement.type} onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value})}>
                                    <option value="info">Informação (Azul)</option>
                                    <option value="warning">Alerta (Amarelo)</option>
                                    <option value="success">Sucesso (Verde)</option>
                                    <option value="error">Erro (Vermelho)</option>
                                </select>
                                <button onClick={handlePostAnnouncement} className="bg-primary text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-600 transition flex items-center"><Send size={16} className="mr-2"/> Publicar</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {announcements.map(ann => {
                            const now = new Date();
                            const start = ann.start_at ? parseISO(ann.start_at) : null;
                            const end = ann.expires_at ? parseISO(ann.expires_at) : null;
                            const isActive = (!start || start <= now) && (!end || end > now);

                            return (
                                <div key={ann.id} className={`bg-white p-4 rounded-xl shadow-sm border ${isActive ? 'border-green-300' : 'border-gray-200 opacity-60'} flex justify-between items-center relative overflow-hidden`}>
                                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>}
                                    <div className="pl-2">
                                        <h4 className="font-bold text-gray-800 flex items-center">
                                            {ann.title} 
                                            <span className={`text-[10px] uppercase px-2 py-0.5 rounded ml-2 ${ann.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : ann.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{ann.type}</span>
                                            {isActive ? <span className="text-[10px] text-green-600 font-bold ml-2 flex items-center"><Clock size={10} className="mr-1"/> No Ar</span> : <span className="text-[10px] text-gray-400 font-bold ml-2">Inativo / Agendado</span>}
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1">{ann.message}</p>
                                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                            <span>Início: {ann.start_at ? format(parseISO(ann.start_at), "dd/MM/yyyy HH:mm") : 'Imediato'}</span>
                                            <span>Fim: {ann.expires_at ? format(parseISO(ann.expires_at), "dd/MM/yyyy HH:mm") : 'Nunca'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'marketing' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Mail className="text-blue-500"/> E-mail Marketing</h2>
                            <p className="text-gray-600">Envie e-mails em massa para os usuários da plataforma.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-700 mb-4">Configuração do Disparo</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Template do E-mail</label>
                                        <select 
                                            value={selectedTemplate} 
                                            onChange={(e) => setSelectedTemplate(e.target.value)}
                                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            <option value="welcome">Boas-vindas (Novo Template)</option>
                                            <option value="recall">Recall (Retorno de Pacientes)</option>
                                            <option value="subscription_success">Assinatura Concluída</option>
                                            <option value="feedback_request">Pedido de Feedback</option>
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1 italic">O template selecionado será enviado para todos os usuários marcados.</p>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Resumo</span>
                                            <span className="text-xs font-black text-primary">{selectedUsers.length} selecionados</span>
                                        </div>
                                        <button 
                                            onClick={handleSendBulkEmail}
                                            disabled={isSendingEmails || selectedUsers.length === 0}
                                            className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                                        >
                                            {isSendingEmails ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                                            {isSendingEmails ? 'Enviando...' : 'Disparar E-mails'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                <h4 className="text-blue-700 font-bold text-xs mb-2 flex items-center gap-2">
                                    <Sparkles size={14} /> Dica de Uso
                                </h4>
                                <p className="text-xs text-blue-600 leading-relaxed">
                                    Use o template de <strong>Boas-vindas</strong> para educar usuários antigos sobre as novas funcionalidades do sistema.
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[600px]">
                            <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <h3 className="text-sm font-bold text-gray-700">Lista de Usuários</h3>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <input 
                                        type="text" 
                                        placeholder="Buscar e-mail ou clínica..." 
                                        value={searchUser}
                                        onChange={(e) => setSearchUser(e.target.value)}
                                        className="text-xs border rounded-lg px-3 py-2 w-full sm:w-48 outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button 
                                        onClick={() => {
                                            if (selectedUsers.length === users.length) setSelectedUsers([]);
                                            else setSelectedUsers(users.map(u => u.id));
                                        }}
                                        className="text-[10px] font-bold text-primary hover:underline whitespace-nowrap"
                                    >
                                        {selectedUsers.length === users.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold sticky top-0 z-10 border-b">
                                        <tr>
                                            <th className="px-6 py-3 w-10"></th>
                                            <th className="px-6 py-3">E-mail</th>
                                            <th className="px-6 py-3">Clínica</th>
                                            <th className="px-6 py-3">Perfil</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs">
                                        {users.filter(u => 
                                            u.email.toLowerCase().includes(searchUser.toLowerCase()) || 
                                            (u.clinics?.name || '').toLowerCase().includes(searchUser.toLowerCase())
                                        ).map((user) => (
                                            <tr 
                                                key={user.id} 
                                                className={`hover:bg-blue-50 transition cursor-pointer ${selectedUsers.includes(user.id) ? 'bg-blue-50/50' : ''}`}
                                                onClick={() => {
                                                    if (selectedUsers.includes(user.id)) setSelectedUsers(prev => prev.filter(id => id !== user.id));
                                                    else setSelectedUsers(prev => [...prev, user.id]);
                                                }}
                                            >
                                                <td className="px-6 py-3">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedUsers.includes(user.id)}
                                                        onChange={() => {}} // Handled by row click
                                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                </td>
                                                <td className="px-6 py-3 font-medium text-gray-800">{user.email}</td>
                                                <td className="px-6 py-3 text-gray-500">{user.clinics?.name || 'N/A'}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.role === 'administrator' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </main>
    </div>
  );
};

export default SuperAdminPage;