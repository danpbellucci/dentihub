
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Users, Building2, Calendar, Mic, Mail, Activity, 
  FileText, CalendarRange, Filter, RefreshCw,
  BarChart3, ArrowLeft, Server, Megaphone, PenTool, Instagram, Linkedin, MessageCircle, Copy, Check, Loader2, Sparkles, Image as ImageIcon, Zap, CreditCard,
  Target, Monitor, MousePointer, Download, LayoutTemplate, Palette, Globe, ChevronRight, AlertTriangle, Menu, X, Send, Search, CheckCircle
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import Toast, { ToastType } from './Toast';
import DOMPurify from 'dompurify';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
    <div className={`p-4 rounded-full mr-4 ${color.replace('text-', 'bg-').replace('600', '50').replace('700', '50')}`}>
      <Icon size={24} className={color} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium uppercase">{title}</p>
      <p className="text-2xl font-black text-gray-800">{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

// Tipo para armazenar dados agregados da célula
interface FunctionMetric {
    calls: number;
    emails: number;
}

const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Navigation State
  const [activeSection, setActiveSection] = useState<'dashboard' | 'marketing'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data Loading State
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // --- DASHBOARD STATES ---
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const [metrics, setMetrics] = useState({
    clinics: 0,
    patients: 0,
    dentists: 0,
    appointments: 0,
    aiRecords: 0,
    emails: 0,
    transactionsCount: 0,
    requests: 0
  });

  const [clinicsStats, setClinicsStats] = useState<any[]>([]);
  const [functionStats, setFunctionStats] = useState<{
      days: string[];
      functions: string[];
      matrix: Record<string, Record<string, FunctionMetric>>;
      totals: Record<string, FunctionMetric>;
  }>({ days: [], functions: [], matrix: {}, totals: {} });

  // --- MARKETING AGENT STATES ---
  const [marketingType, setMarketingType] = useState<'email' | 'content' | 'image' | 'ads'>('email');
  
  // Inputs
  const [targetAudience, setTargetAudience] = useState('Dentistas e Proprietários de Clínicas'); // Para Email
  const [emailGoal, setEmailGoal] = useState('Anunciar nova funcionalidade'); // Para Email
  
  const [contentPlatform, setContentPlatform] = useState('Instagram'); // Para Content
  const [contentTopic, setContentTopic] = useState(''); // Para Content
  
  const [imageDesc, setImageDesc] = useState(''); // Para Image
  const [imageStyle, setImageStyle] = useState('Fotorealista / Estúdio'); // Para Image
  
  const [adsProduct, setAdsProduct] = useState(''); // Para Ads
  const [adsObjective, setAdsObjective] = useState('Leads (Agendamentos)'); // Para Ads

  // Single Result State to avoid confusion
  const [aiResult, setAiResult] = useState<{ type: string; data: any } | null>(null);
  const [generating, setGenerating] = useState(false);

  // Email Blast State
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (activeSection === 'dashboard') {
        fetchMetrics();
    }
  }, [dateRange, activeSection]);

  const fetchMetrics = async () => {
    setLoading(true);
    
    const parseLocalDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const start = startOfDay(parseLocalDate(dateRange.start)).toISOString();
    const end = endOfDay(parseLocalDate(dateRange.end)).toISOString();

    try {
        // 1. Métricas de Negócio (Banco de Dados)
        const { count: clinicsCount } = await supabase.from('clinics').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        const { count: patientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        const { count: dentistsCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'dentist').gte('created_at', start).lte('created_at', end);
        const { count: appointmentsCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('start_time', start).lte('start_time', end);
        const { count: transactionsCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('date', start).lte('date', end);

        // 2. Métricas de Uso de Recursos (Logs das Edge Functions - Fonte da Verdade de Consumo)
        const { data: logs } = await supabase
            .from('edge_function_logs')
            .select('created_at, function_name, metadata')
            .gte('created_at', start)
            .lte('created_at', end);

        let aiUsageCount = 0;
        let requestsUsageCount = 0;
        let emailsUsageCount = 0;
        
        const matrix: Record<string, Record<string, FunctionMetric>> = {};
        const funcsSet = new Set<string>();
        const totals: Record<string, FunctionMetric> = {};

        if (logs) {
            logs.forEach(log => {
                const meta = log.metadata as any || {};
                const fn = log.function_name || 'unknown';
                const day = format(parseISO(log.created_at), 'yyyy-MM-dd');

                // -- Contabilização para os Cards (Totais) --
                
                // IA (Calls)
                if (fn === 'process-audio' || fn === 'generate-soap') {
                    aiUsageCount++;
                }
                
                // Requisições Públicas
                if (fn === 'create-appointment-request') {
                    requestsUsageCount++;
                }

                // E-mails (Volume Real baseado nos metadados)
                let emailsInThisCall = 0;
                
                if (['send-signup-code', 'send-password-reset', 'invite-employee', 'send-diagnostic'].includes(fn)) {
                    emailsInThisCall = 1;
                }
                else if (fn === 'send-reminders') {
                    emailsInThisCall = (meta.sent || 0);
                }
                else if (['send-daily-agenda', 'send-daily-finance', 'send-birthday-emails'].includes(fn)) {
                    emailsInThisCall = (meta.sent_count || meta.sent || 0);
                }
                else if (fn === 'send-emails') {
                    if (meta.results?.count) emailsInThisCall = meta.results.count;
                    else if (meta.count) emailsInThisCall = meta.count;
                    else emailsInThisCall = 1; // Fallback para unitário
                }
                else if (fn === 'send-system-campaigns' && meta.results) {
                     Object.values(meta.results).forEach((val: any) => {
                         if (typeof val === 'number') emailsInThisCall += val;
                     });
                } else if (fn === 'send-super-admin-daily-report') {
                    emailsInThisCall = 1;
                }

                emailsUsageCount += emailsInThisCall;

                // -- Contabilização para a Tabela de Estatísticas --
                funcsSet.add(fn);
                if (!matrix[day]) matrix[day] = {};
                if (!matrix[day][fn]) matrix[day][fn] = { calls: 0, emails: 0 };
                
                matrix[day][fn].calls++;
                matrix[day][fn].emails += emailsInThisCall;

                if (!totals[fn]) totals[fn] = { calls: 0, emails: 0 };
                totals[fn].calls++;
                totals[fn].emails += emailsInThisCall;
            });
        }

        setMetrics({
            clinics: clinicsCount || 0,
            patients: patientsCount || 0,
            dentists: dentistsCount || 0,
            appointments: appointmentsCount || 0,
            transactionsCount: transactionsCount || 0,
            // Métricas baseadas em Logs
            aiRecords: aiUsageCount,
            emails: emailsUsageCount,
            requests: requestsUsageCount
        });

        // 3. Stats de Clínicas
        const { data: clinicsData } = await supabase
            .from('clinics')
            .select('id, name, created_at, dentists(count), clients(count)')
            .order('created_at', { ascending: false }); 

        if (clinicsData) {
            const formattedClinics = clinicsData.map((c: any) => ({
                id: c.id,
                name: c.name || 'Sem nome',
                createdAt: c.created_at,
                dentists: c.dentists?.[0]?.count || 0,
                clients: c.clients?.[0]?.count || 0
            }));
            setClinicsStats(formattedClinics);
        }

        // 4. Finalizar Tabela de Funções
        const sortedDays = Object.keys(matrix).sort((a, b) => b.localeCompare(a));
        const sortedFuncs = Array.from(funcsSet).sort();

        setFunctionStats({ days: sortedDays, functions: sortedFuncs, matrix, totals });

    } catch (err) {
        console.error("Erro dashboard super admin:", err);
    } finally {
        setLoading(false);
    }
  };

  // --- GENERIC MARKETING HANDLER ---
  const handleMarketingGenerate = async () => {
      let prompt = '';
      let taskType = '';
      let contextData = {};

      setGenerating(true);
      setAiResult(null); // Clear previous result to show loading correctly

      if (marketingType === 'email') {
          if (!emailGoal) { setGenerating(false); return setToast({ message: "Defina o objetivo do e-mail.", type: 'warning' }); }
          taskType = 'social'; 
          prompt = `Escrever um e-mail marketing (Assunto + Corpo HTML) para ${targetAudience}. Objetivo: ${emailGoal}. Tom: Profissional e Persuasivo.`;
          contextData = { audience: targetAudience };
      }
      else if (marketingType === 'content') {
          if (!contentTopic) { setGenerating(false); return setToast({ message: "Defina o tópico.", type: 'warning' }); }
          taskType = 'social';
          prompt = `Criar post para ${contentPlatform} sobre: ${contentTopic}.`;
          contextData = { platform: contentPlatform };
      } 
      else if (marketingType === 'image') {
          if (!imageDesc) { setGenerating(false); return setToast({ message: "Descreva a imagem.", type: 'warning' }); }
          taskType = 'image_prompt';
          prompt = `Criar prompt de imagem: ${imageDesc}. Estilo: ${imageStyle}.`;
          contextData = { style: imageStyle };
      } 
      else if (marketingType === 'ads') {
          if (!adsProduct) { setGenerating(false); return setToast({ message: "Defina o produto/serviço.", type: 'warning' }); }
          taskType = 'ads_strategy'; // Atualizado para usar o novo schema robusto
          prompt = `Criar estratégia de tráfego pago (Google Ads e Meta Ads) para: ${adsProduct}. Objetivo: ${adsObjective}. Gere palavras-chave, títulos otimizados para Google (30 chars) e Meta, e descrições persuasivas.`;
          contextData = { objective: adsObjective, product: adsProduct };
      }

      try {
          const { data, error } = await supabase.functions.invoke('generate-campaign-content', {
              body: { prompt, taskType, contextData }
          });

          if (error) throw error;
          if (data && data.error) {
              setAiResult({ type: 'error', data: { message: data.error, raw: data.raw_response } });
              setToast({ message: "A IA retornou um erro.", type: 'error' });
          } else if (data) {
              setAiResult({ type: marketingType, data });
              setToast({ message: "Conteúdo gerado com sucesso!", type: 'success' });
          }

      } catch (err: any) {
          console.error(err);
          setAiResult({ type: 'error', data: { message: err.message } });
          setToast({ message: "Erro ao gerar: " + err.message, type: 'error' });
      } finally {
          setGenerating(false);
      }
  };

  const handleSendCampaign = async () => {
      if (selectedRoles.length === 0) {
          setToast({ message: "Selecione pelo menos um perfil para envio.", type: 'warning' });
          return;
      }
      if (!aiResult?.data?.content || !aiResult?.data?.title) {
          setToast({ message: "Conteúdo do e-mail não disponível.", type: 'error' });
          return;
      }

      setSendingEmail(true);
      try {
          // 1. Buscar destinatários com base nas roles selecionadas
          const { data: recipients, error: fetchError } = await supabase
              .from('user_profiles')
              .select('email, role')
              .in('role', selectedRoles);

          if (fetchError) throw fetchError;
          if (!recipients || recipients.length === 0) {
              setToast({ message: "Nenhum usuário encontrado com os perfis selecionados.", type: 'warning' });
              setSendingEmail(false);
              return;
          }

          // Filtra emails únicos
          const uniqueRecipients = Array.from(new Set(recipients.map(r => r.email).filter(Boolean))).map(email => ({ email }));

          // 2. Chamar função de envio de e-mail
          const { data: sendData, error: sendError } = await supabase.functions.invoke('send-emails', {
              body: {
                  type: 'marketing_campaign',
                  recipients: uniqueRecipients,
                  subject: aiResult.data.title,
                  htmlContent: aiResult.data.content
              }
          });

          if (sendError) throw sendError;
          if (sendData && sendData.error) throw new Error(sendData.error);

          setToast({ message: `Campanha enviada para ${uniqueRecipients.length} usuários com sucesso!`, type: 'success' });
          setSelectedRoles([]);

      } catch (err: any) {
          console.error("Erro envio campanha:", err);
          setToast({ message: "Erro ao enviar: " + err.message, type: 'error' });
      } finally {
          setSendingEmail(false);
      }
  };

  const toggleRole = (role: string) => {
      setSelectedRoles(prev => 
          prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
      );
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setToast({ message: "Copiado!", type: 'success' });
  };

  const downloadGoogleAdsCSV = () => {
      if (!aiResult || aiResult.type !== 'ads' || !aiResult.data) return;
      const generatedAds = aiResult.data;

      const csvRows = [];
      csvRows.push("Campaign,Ad Group,Keyword,Criterion Type,Headline 1,Headline 2,Headline 3,Description 1,Description 2,Final URL");

      const campaignName = (generatedAds.campaign_name || 'Campanha').replace(/,/g, '');
      const adGroupName = "Grupo de Anúncios 1";
      const finalUrl = "https://suaclinica.com.br"; 

      generatedAds.keywords?.forEach((kw: string) => {
          csvRows.push(`${campaignName},${adGroupName},${kw.replace(/,/g, '')},Broad,,,,,,`);
      });

      const h1 = generatedAds.google_ads?.headlines?.[0]?.replace(/,/g, '') || '';
      const h2 = generatedAds.google_ads?.headlines?.[1]?.replace(/,/g, '') || '';
      const h3 = generatedAds.google_ads?.headlines?.[2]?.replace(/,/g, '') || '';
      const d1 = generatedAds.google_ads?.descriptions?.[0]?.replace(/,/g, '') || '';
      const d2 = generatedAds.google_ads?.descriptions?.[1]?.replace(/,/g, '') || '';

      csvRows.push(`${campaignName},${adGroupName},,,${h1},${h2},${h3},${d1},${d2},${finalUrl}`);

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${campaignName}_setup.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ message: "CSV gerado!", type: 'success' });
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* --- OVERLAY PARA MOBILE --- */}
      {sidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* --- LEFT SIDEBAR (RESPONSIVA) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex-shrink-0 flex flex-col border-r border-gray-800
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                    <Activity className="text-red-600" /> GOD MODE
                </h1>
                <p className="text-xs text-gray-500 mt-1">Super Admin Dashboard</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white md:hidden">
                  <X size={24} />
              </button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <button 
                  onClick={() => { setActiveSection('dashboard'); setSidebarOpen(false); }}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeSection === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                  <BarChart3 size={18} className="mr-3"/> Visão Geral
              </button>
              
              <button 
                  onClick={() => { setActiveSection('marketing'); setSidebarOpen(false); }}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeSection === 'marketing' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                  <Sparkles size={18} className="mr-3"/> Agente de Marketing
              </button>

              <div className="pt-4 mt-4 border-t border-gray-800">
                  <button 
                      onClick={() => { navigate('/super-admin/leads'); setSidebarOpen(false); }}
                      className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                  >
                      <Users size={18} className="mr-3"/> Gestão de Leads
                  </button>
                  <button 
                      onClick={() => { navigate('/super-admin/subscriptions'); setSidebarOpen(false); }}
                      className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                  >
                      <CreditCard size={18} className="mr-3"/> Assinaturas
                  </button>
              </div>
          </nav>

          <div className="p-4 border-t border-gray-800">
              <button onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-center px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:text-white hover:border-gray-500 transition text-xs font-bold">
                  <ArrowLeft size={14} className="mr-2"/> Voltar à Clínica
              </button>
          </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col w-full relative">
        
        {/* Mobile Header Toggle */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Activity className="text-red-600" size={20} /> God Mode
            </h2>
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-1">
                <Menu size={24} />
            </button>
        </div>

        {/* ... (VIEW: DASHBOARD permanece igual) ... */}
        {activeSection === 'dashboard' && (
            // ... (Código do Dashboard mantido por brevidade, já que não foi pedido alteração nele) ...
            <div className="p-4 sm:p-8 space-y-8 animate-fade-in w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Visão Geral do Sistema</h2>
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200 w-full sm:w-auto overflow-x-auto">
                        <CalendarRange size={16} className="text-gray-400 ml-2 flex-shrink-0" />
                        <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="border-none text-sm text-gray-600 outline-none bg-transparent"/>
                        <span className="text-gray-300">-</span>
                        <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="border-none text-sm text-gray-600 outline-none bg-transparent"/>
                        <button onClick={fetchMetrics} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-500 transition"><RefreshCw size={14}/></button>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard title="Novas Clínicas" value={metrics.clinics} icon={Building2} color="text-indigo-600" />
                    <MetricCard title="Transações (Volume)" value={metrics.transactionsCount} icon={FileText} color="text-green-600" subtext="Registros financeiros" />
                    <MetricCard title="Agendamentos" value={metrics.appointments} icon={Calendar} color="text-blue-600" />
                    <MetricCard title="Pacientes Ativos" value={metrics.patients} icon={Users} color="text-cyan-600" />
                </div>
                {/* ... (Resto do dashboard) ... */}
            </div>
        )}

        {/* --- VIEW: MARKETING AGENT --- */}
        {activeSection === 'marketing' && (
            <div className="p-4 sm:p-8 h-full flex flex-col animate-fade-in w-full">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-2xl font-bold text-gray-800">Agente de Marketing</h2>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                    
                    {/* INPUT PANEL */}
                    <div className="w-full lg:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-y-auto">
                        
                        <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
                            <button onClick={() => setMarketingType('email')} className={`py-2 text-xs font-bold rounded-md transition ${marketingType === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>E-mail Mkt</button>
                            <button onClick={() => setMarketingType('content')} className={`py-2 text-xs font-bold rounded-md transition ${marketingType === 'content' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Conteúdos</button>
                            <button onClick={() => setMarketingType('image')} className={`py-2 text-xs font-bold rounded-md transition ${marketingType === 'image' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Prompt Imagens</button>
                            <button onClick={() => setMarketingType('ads')} className={`py-2 text-xs font-bold rounded-md transition ${marketingType === 'ads' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Especialista Ads</button>
                        </div>

                        <div className="flex-1 space-y-4">
                            {marketingType === 'email' && (
                                <>
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 mb-2">
                                        Crie templates de e-mail profissionais para campanhas em massa.
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Público Alvo</label>
                                        <input type="text" className="w-full border rounded-lg p-2.5 text-sm" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Ex: Dentistas, Pacientes Inativos..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Objetivo do E-mail</label>
                                        <textarea className="w-full border rounded-lg p-3 text-sm h-32 resize-none" value={emailGoal} onChange={e => setEmailGoal(e.target.value)} placeholder="Ex: Anunciar desconto de natal..." />
                                    </div>
                                </>
                            )}

                            {marketingType === 'content' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Plataforma</label>
                                        <select className="w-full border rounded-lg p-2.5 text-sm bg-white" value={contentPlatform} onChange={e => setContentPlatform(e.target.value)}>
                                            <option>Instagram</option><option>LinkedIn</option><option>Blog</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tópico</label>
                                        <textarea className="w-full border rounded-lg p-3 text-sm h-32 resize-none" value={contentTopic} onChange={e => setContentTopic(e.target.value)} placeholder="Ex: Importância do fio dental..." />
                                    </div>
                                </>
                            )}

                            {marketingType === 'image' && (
                                <>
                                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-xs text-yellow-800 mb-2">
                                        Gera prompts otimizados para Midjourney ou DALL-E.
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Descrição</label>
                                        <textarea className="w-full border rounded-lg p-3 text-sm h-32 resize-none" value={imageDesc} onChange={e => setImageDesc(e.target.value)} placeholder="Ex: Dentista sorrindo..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Estilo</label>
                                        <select className="w-full border rounded-lg p-2.5 text-sm bg-white" value={imageStyle} onChange={e => setImageStyle(e.target.value)}>
                                            <option>Fotorealista / Estúdio</option><option>Cinematográfico</option><option>3D Pixar Style</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {marketingType === 'ads' && (
                                <>
                                    <div className="bg-green-50 p-3 rounded border border-green-200 text-xs text-green-800 mb-2">
                                        Gera estrutura completa para campanhas de alta conversão.
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Produto / Serviço</label>
                                        <input type="text" className="w-full border rounded-lg p-2.5 text-sm" value={adsProduct} onChange={e => setAdsProduct(e.target.value)} placeholder="Ex: Implante, Clareamento" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Objetivo</label>
                                        <select className="w-full border rounded-lg p-2.5 text-sm bg-white" value={adsObjective} onChange={e => setAdsObjective(e.target.value)}>
                                            <option>Leads (Agendamentos)</option><option>Tráfego (Site)</option><option>Reconhecimento</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        <button onClick={handleMarketingGenerate} disabled={generating} className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition flex items-center justify-center disabled:opacity-50 mt-6 shadow-md">
                            {generating ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" size={18}/>}
                            {marketingType === 'ads' ? 'Gerar Dados para Google/Meta Ads' : 'Gerar Conteúdo'}
                        </button>
                    </div>

                    {/* RESULT PANEL */}
                    <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Resultado Gerado</h3>
                            {aiResult && <button onClick={() => setAiResult(null)} className="text-xs text-gray-500 hover:text-red-500">Limpar</button>}
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50 custom-scrollbar">
                            {!aiResult ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Sparkles size={48} className="mb-4 opacity-20" />
                                    <p className="text-center text-sm">Configure o agente ao lado e clique em "Gerar Conteúdo".</p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    
                                    {/* ERRO GENÉRICO */}
                                    {aiResult.type === 'error' && (
                                        <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-700">
                                            <h3 className="font-bold flex items-center mb-2"><AlertTriangle className="mr-2"/> Erro ao gerar</h3>
                                            <p className="text-sm mb-4">{aiResult.data.message}</p>
                                            {aiResult.data.raw && (
                                                <details className="mt-2">
                                                    <summary className="text-xs cursor-pointer opacity-75">Ver resposta bruta</summary>
                                                    <pre className="text-xs bg-white p-3 rounded mt-2 border border-red-100 overflow-auto max-h-40">{aiResult.data.raw}</pre>
                                                </details>
                                            )}
                                        </div>
                                    )}

                                    {/* RENDER: SOCIAL / EMAIL */}
                                    {['social', 'email'].includes(aiResult.type) && aiResult.data.title && (
                                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative group">
                                            <h3 className="text-lg font-bold text-gray-800 mb-4">{aiResult.data.title}</h3>
                                            {/* HTML Sanitized via DOMPurify */}
                                            <div 
                                              className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm bg-gray-50 p-4 rounded-lg border border-gray-100" 
                                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aiResult.data.content) }}
                                            ></div>
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <p className="text-blue-600 text-sm font-medium">{aiResult.data.hashtags}</p>
                                            </div>
                                            <button onClick={() => copyToClipboard(aiResult.data.content)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-md hover:text-purple-700 transition"><Copy size={16} /></button>

                                            {/* SEND EMAIL BUTTON */}
                                            {marketingType === 'email' && (
                                                <div className="mt-6 pt-6 border-t border-gray-100">
                                                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center"><Send size={16} className="mr-2 text-primary"/> Enviar Campanha</h4>
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {['administrator', 'dentist', 'employee'].map(role => (
                                                            <button 
                                                                key={role}
                                                                onClick={() => toggleRole(role)}
                                                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                                                                    selectedRoles.includes(role) 
                                                                    ? 'bg-purple-100 text-purple-700 border-purple-300 font-bold' 
                                                                    : 'bg-white text-gray-500 border-gray-300 hover:border-purple-300'
                                                                }`}
                                                            >
                                                                {role === 'administrator' ? 'Administradores' : role === 'dentist' ? 'Dentistas' : 'Funcionários'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button 
                                                        onClick={handleSendCampaign}
                                                        disabled={sendingEmail || selectedRoles.length === 0}
                                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-bold text-sm shadow hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center"
                                                    >
                                                        {sendingEmail ? <Loader2 className="animate-spin mr-2" size={16}/> : <Send className="mr-2" size={16}/>}
                                                        Disparar E-mail
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* RENDER: ADS */}
                                    {aiResult.type === 'ads' && aiResult.data.campaign_name && (
                                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative">
                                            <div className="flex justify-between items-start mb-6">
                                                <h3 className="text-xl font-bold text-gray-800 flex items-center"><Target className="text-red-500 mr-2"/> Estratégia: {aiResult.data.campaign_name || 'Nova Campanha'}</h3>
                                                <button onClick={downloadGoogleAdsCSV} className="bg-gray-100 text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded text-xs font-bold flex items-center transition"><Download size={14} className="mr-1"/> Baixar CSV</button>
                                            </div>
                                            
                                            <div className="mb-6">
                                                <h4 className="text-sm font-bold text-gray-500 uppercase mb-2 flex items-center"><Users size={14} className="mr-2"/> Público Alvo</h4>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{aiResult.data.target_audience || 'Não especificado'}</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* GOOGLE ADS */}
                                                <div className="border border-blue-100 rounded-xl overflow-hidden">
                                                    <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-center text-blue-700 font-bold text-sm"><Monitor size={16} className="mr-2"/> Google Ads (Search)</div>
                                                    <div className="p-4 space-y-4">
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Palavras-Chave</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {aiResult.data.keywords?.map((k: string, i: number) => (
                                                                    <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">{k}</span>
                                                                )) || <span className="text-xs text-gray-400">Sem keywords</span>}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Títulos (30 chars)</p>
                                                            <ul className="list-none text-sm text-gray-700 space-y-1">
                                                                {aiResult.data.google_ads?.headlines?.map((h: string, i: number) => <li key={i} className="bg-blue-50/50 px-2 py-1 rounded border border-blue-100 text-blue-800 text-xs flex items-center"><CheckCircle size={10} className="mr-1"/> {h}</li>) || <li>Sem títulos</li>}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Descrições (90 chars)</p>
                                                            <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                                                                {aiResult.data.google_ads?.descriptions?.map((d: string, i: number) => <li key={i}>{d}</li>) || <li>Sem descrições</li>}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* META ADS */}
                                                <div className="border border-indigo-100 rounded-xl overflow-hidden">
                                                    <div className="bg-indigo-50 p-3 border-b border-indigo-100 flex items-center text-indigo-700 font-bold text-sm"><MousePointer size={16} className="mr-2"/> Meta Ads (FB/IG)</div>
                                                    <div className="p-4 space-y-4">
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Texto Principal (Copy)</p>
                                                            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-100">{aiResult.data.meta_ads?.primary_text || 'Sem texto gerado'}</p>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div className="flex-1">
                                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Título do Card</p>
                                                                <p className="text-sm font-bold text-gray-800">{aiResult.data.meta_ads?.headline || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">CTA</p>
                                                                <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-xs font-bold border border-indigo-200">{aiResult.data.meta_ads?.call_to_action || 'Saiba Mais'}</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Sugestão de Imagem</p>
                                                            <p className="text-xs text-gray-500 italic border-l-2 border-indigo-200 pl-2">{aiResult.data.meta_ads?.image_suggestion || 'Sem sugestão'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* RENDER: IMAGE PROMPTS */}
                                    {aiResult.type === 'image' && aiResult.data.midjourney_prompt && (
                                        <>
                                            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 shadow-sm relative group">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="text-xs font-bold text-green-400 uppercase">Midjourney Prompt</h4>
                                                    <button onClick={() => copyToClipboard(aiResult.data.midjourney_prompt)} className="text-xs text-gray-400 hover:text-white flex items-center"><Copy size={12} className="mr-1"/> Copiar</button>
                                                </div>
                                                <code className="text-sm text-gray-300 font-mono block bg-black/30 p-3 rounded">{aiResult.data.midjourney_prompt}</code>
                                            </div>
                                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative group">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="text-xs font-bold text-blue-600 uppercase">DALL-E 3 Prompt</h4>
                                                    <button onClick={() => copyToClipboard(aiResult.data.dalle_prompt)} className="text-xs text-gray-400 hover:text-blue-600 flex items-center"><Copy size={12} className="mr-1"/> Copiar</button>
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed">{aiResult.data.dalle_prompt}</p>
                                            </div>
                                        </>
                                    )}

                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default SuperAdminPage;
