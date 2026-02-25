import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Users, Building2, Calendar, Mic, Activity, 
  FileText, CalendarRange, RefreshCw,
  BarChart3, ArrowLeft, Sparkles, CreditCard,
  Monitor, Menu, X, HeartPulse, AlertTriangle, CheckCircle, TrendingUp,
  Megaphone, Trash2, Send, AlertOctagon, UserX, Clock, Tag, Copy
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
  const [activeTab, setActiveTab] = useState<'overview' | 'churn' | 'broadcast' | 'remotion'>('overview');
  const [atRiskClinics, setAtRiskClinics] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
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

            {activeTab === 'remotion' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Monitor className="text-purple-500"/> Remotion Studio</h2>
                            <p className="text-gray-600">Crie vídeos tutoriais programáticos para o DentiHub usando React.</p>
                        </div>
                        <a 
                            href="https://github.com/remotion-dev/remotion/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition"
                        >
                            <Monitor size={16} /> Ver no GitHub
                        </a>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-700 mb-4">Configuração do Vídeo</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">Resolução</label>
                                        <select className="w-full border rounded p-2 text-sm">
                                            <option>1080p (1920x1080)</option>
                                            <option>720p (1280x720)</option>
                                            <option>Vertical (1080x1920)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">FPS</label>
                                        <select className="w-full border rounded p-2 text-sm">
                                            <option>30 FPS</option>
                                            <option>60 FPS</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Script do Vídeo (Prompt para IA)</label>
                                    <textarea 
                                        className="w-full border rounded p-2 text-sm h-32 font-mono focus:ring-2 focus:ring-purple-500 outline-none transition" 
                                        placeholder="Descreva o que deve acontecer no vídeo..."
                                        value={remotionPrompt}
                                        onChange={(e) => setRemotionPrompt(e.target.value)}
                                    />
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button 
                                        onClick={handleGenerateRemotionCode}
                                        disabled={isGeneratingRemotion}
                                        className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isGeneratingRemotion ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                        {isGeneratingRemotion ? 'Gerando...' : 'Gerar Código Remotion'}
                                    </button>
                                </div>
                            </div>

                            {generatedRemotionCode && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 overflow-hidden">
                                        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900/50">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Código Gerado (Remotion)</h3>
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(generatedRemotionCode);
                                                        setToast({ message: "Código copiado!", type: 'success' });
                                                    }}
                                                    className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                                                >
                                                    <Copy size={14} /> Copiar
                                                </button>
                                                <button 
                                                    onClick={handleStartRender}
                                                    disabled={isRendering}
                                                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-500 font-bold flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <Activity size={14} /> {isRendering ? 'Renderizando...' : 'Renderizar MP4'}
                                                </button>
                                            </div>
                                        </div>
                                        <pre className="p-6 text-xs text-gray-300 font-mono overflow-x-auto max-h-[300px] custom-scrollbar bg-black/30">
                                            <code>{generatedRemotionCode}</code>
                                        </pre>
                                    </div>

                                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg">
                                        <h4 className="text-blue-400 font-bold text-xs mb-2 flex items-center gap-2">
                                            <Monitor size={14} /> Como renderizar no seu PC:
                                        </h4>
                                        <code className="block bg-black/40 p-3 rounded text-[10px] text-blue-200 font-mono">
                                            npx remotion render src/index.tsx out/video.mp4
                                        </code>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-900 rounded-xl shadow-2xl p-4 aspect-video flex items-center justify-center relative group overflow-hidden border-4 border-gray-800">
                                {isRendering ? (
                                    <div className="w-full max-w-md text-center">
                                        <div className="flex justify-between text-xs text-purple-400 font-bold mb-2">
                                            <span>Renderizando Frames...</span>
                                            <span>{Math.round(renderProgress)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-300"
                                                style={{ width: `${renderProgress}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-4 animate-pulse">Processando camadas de vídeo e áudio via Cloud Workers...</p>
                                    </div>
                                ) : renderComplete ? (
                                    <div className="text-center animate-fade-in">
                                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                                            <CheckCircle size={40} className="text-green-400" />
                                        </div>
                                        <h3 className="text-white font-bold text-xl">Vídeo Pronto!</h3>
                                        <p className="text-gray-400 text-sm mt-2">A renderização foi concluída com sucesso.</p>
                                        <button className="mt-6 bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition flex items-center gap-2 mx-auto">
                                            <TrendingUp size={18} /> Baixar MP4
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                                            <Monitor size={32} className="text-purple-400" />
                                        </div>
                                        <p className="text-gray-400 font-bold">Preview do Vídeo</p>
                                        <p className="text-xs text-gray-600 mt-2">O player do Remotion será carregado aqui após a geração do código.</p>
                                    </div>
                                )}
                                
                                {!isRendering && !renderComplete && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <button onClick={handleStartRender} className="bg-white text-black p-4 rounded-full shadow-xl hover:scale-110 transition">
                                            <Activity size={32} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-700 mb-4">Recursos Disponíveis</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-md"><FileText size={16}/></div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">Templates de UI</p>
                                            <p className="text-[10px] text-gray-500">Componentes do DentiHub prontos para animar.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="p-2 bg-purple-100 text-purple-600 rounded-md"><Mic size={16}/></div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">Voiceover IA</p>
                                            <p className="text-[10px] text-gray-500">Narração automática integrada.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="p-2 bg-green-100 text-green-600 rounded-md"><Activity size={16}/></div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">Renderização Cloud</p>
                                            <p className="text-[10px] text-gray-500">Processamento via AWS Lambda.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-900/10 border border-purple-500/20 p-6 rounded-xl">
                                <h4 className="text-purple-700 font-bold text-sm mb-2 flex items-center gap-2">
                                    <Sparkles size={16} /> Dica de Especialista
                                </h4>
                                <p className="text-xs text-purple-600 leading-relaxed">
                                    Use o Remotion para criar vídeos de boas-vindas personalizados para cada nova clínica que assinar o plano Pro. Isso aumenta o engajamento e reduz o churn.
                                </p>
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