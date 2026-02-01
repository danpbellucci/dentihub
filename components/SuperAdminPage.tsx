
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Users, Building2, Calendar, Mic, Mail, Activity, 
  FileText, CalendarRange, Filter, RefreshCw,
  BarChart3, ArrowLeft, Server, Megaphone, PenTool, Instagram, Linkedin, MessageCircle, Copy, Check, Loader2, Sparkles, Image as ImageIcon, Zap
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import Toast, { ToastType } from './Toast';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'social-copy'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [testingCampaigns, setTestingCampaigns] = useState(false);
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

  // --- SOCIAL COPY STATES ---
  const [copyPlatform, setCopyPlatform] = useState('Instagram');
  const [copyTopic, setCopyTopic] = useState('');
  const [copyTone, setCopyTone] = useState('Profissional e Educativo');
  const [generatedCopy, setGeneratedCopy] = useState<any>(null);
  const [generatingCopy, setGeneratingCopy] = useState(false);

  useEffect(() => {
    if (activeTab === 'dashboard') {
        fetchMetrics();
    }
  }, [dateRange, activeTab]);

  const fetchMetrics = async () => {
    setLoading(true);
    
    const parseLocalDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const start = startOfDay(parseLocalDate(dateRange.start)).toISOString();
    const end = endOfDay(parseLocalDate(dateRange.end)).toISOString();

    try {
        // --- 1. CARDS DE MÉTRICAS GERAIS ---
        const { count: clinicsCount } = await supabase.from('clinics').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        const { count: patientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        const { count: dentistsCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'dentist').gte('created_at', start).lte('created_at', end);
        const { count: appointmentsCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('start_time', start).lte('start_time', end);
        const { count: aiCount } = await supabase.from('clinical_records').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        const { count: emailsCount } = await supabase.from('communications').select('*', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', start).lte('sent_at', end);
        const { count: requestsCount } = await supabase.from('rate_limit_logs').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        
        const { count: transactionsCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('date', start).lte('date', end);

        setMetrics({
            clinics: clinicsCount || 0,
            patients: patientsCount || 0,
            dentists: dentistsCount || 0,
            appointments: appointmentsCount || 0,
            aiRecords: aiCount || 0,
            emails: emailsCount || 0,
            transactionsCount: transactionsCount || 0,
            requests: requestsCount || 0
        });

        // --- 2. LISTA DE CLÍNICAS ---
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

        // --- 3. MATRIZ DE EXECUÇÃO DE EDGE FUNCTIONS ---
        const { data: logs } = await supabase
            .from('edge_function_logs')
            .select('created_at, function_name, metadata')
            .gte('created_at', start)
            .lte('created_at', end);

        if (logs) {
            const matrix: Record<string, Record<string, FunctionMetric>> = {};
            const funcsSet = new Set<string>();
            const totals: Record<string, FunctionMetric> = {};

            logs.forEach(log => {
                const day = format(parseISO(log.created_at), 'yyyy-MM-dd');
                const fn = log.function_name || 'unknown';
                
                let emailsInThisCall = 0;
                if (log.metadata) {
                    const meta = log.metadata as any;
                    if (typeof meta.count === 'number') emailsInThisCall = meta.count;
                    else if (typeof meta.sent === 'number') emailsInThisCall = meta.sent;
                    else if (typeof meta.sent_count === 'number') emailsInThisCall = meta.sent_count;
                }

                funcsSet.add(fn);
                
                if (!matrix[day]) matrix[day] = {};
                if (!matrix[day][fn]) matrix[day][fn] = { calls: 0, emails: 0 };
                
                matrix[day][fn].calls++;
                matrix[day][fn].emails += emailsInThisCall;

                if (!totals[fn]) totals[fn] = { calls: 0, emails: 0 };
                totals[fn].calls++;
                totals[fn].emails += emailsInThisCall;
            });

            const sortedDays = Object.keys(matrix).sort((a, b) => b.localeCompare(a));
            const sortedFuncs = Array.from(funcsSet).sort();

            setFunctionStats({ days: sortedDays, functions: sortedFuncs, matrix, totals });
        } else {
            setFunctionStats({ days: [], functions: [], matrix: {}, totals: {} });
        }

    } catch (err) {
        console.error("Erro dashboard super admin:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleTestSystemCampaigns = async () => {
      setTestingCampaigns(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !user.email) throw new Error("Usuário não identificado.");

          const { data, error } = await supabase.functions.invoke('send-system-campaigns', {
              body: { 
                  testMode: true,
                  targetEmail: user.email 
              }
          });

          if (error) throw error;
          if (data && data.error) throw new Error(data.error);

          setToast({ 
              message: `Teste enviado! Verifique a caixa de entrada de ${user.email}.`, 
              type: 'success' 
          });

      } catch (err: any) {
          console.error(err);
          setToast({ message: "Erro ao testar campanhas: " + err.message, type: 'error' });
      } finally {
          setTestingCampaigns(false);
      }
  };

  const handleGenerateCopy = async () => {
      if (!copyTopic.trim()) {
          setToast({ message: "Digite um tópico para o post.", type: 'warning' });
          return;
      }

      setGeneratingCopy(true);
      setGeneratedCopy(null);

      const prompt = `Crie um post para ${copyPlatform}.
      Tópico: ${copyTopic}.
      Tom de voz: ${copyTone}.
      Público: Dentistas que querem modernizar a clínica.`;

      try {
          const { data, error } = await supabase.functions.invoke('generate-campaign-content', {
              body: { 
                  prompt: prompt,
                  contentType: 'social'
              }
          });

          if (error) throw error;
          if (data && data.error) throw new Error(data.error);

          setGeneratedCopy(data);
          setToast({ message: "Copy gerada com sucesso!", type: 'success' });

      } catch (err: any) {
          console.error(err);
          setToast({ message: "Erro ao gerar copy: " + err.message, type: 'error' });
      } finally {
          setGeneratingCopy(false);
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setToast({ message: "Copiado para área de transferência!", type: 'success' });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate('/dashboard')} 
                    className="p-2 bg-white border border-gray-200 rounded-full text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"
                    title="Voltar ao Dashboard"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                        <Activity className="text-red-600" /> GOD MODE
                    </h1>
                    <p className="text-gray-500 mt-1">Monitoramento e Ferramentas Globais.</p>
                </div>
            </div>
            
            {/* TABS NAVIGATION */}
            <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm mt-4 md:mt-0 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <BarChart3 size={16} /> Visão Geral
                </button>
                <button 
                    onClick={() => setActiveTab('social-copy')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'social-copy' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <PenTool size={16} /> Gerador de Copy
                </button>
                <button 
                    onClick={() => navigate('/super-admin/leads')}
                    className="px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition whitespace-nowrap text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                >
                    <Users size={16} /> Gestão de Leads
                </button>
            </div>
        </div>

        {/* --- TAB: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
                
                {/* DATE FILTER & ACTIONS */}
                <div className="flex justify-end gap-4 flex-wrap">
                    <button 
                        onClick={handleTestSystemCampaigns} 
                        disabled={testingCampaigns}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-600 transition flex items-center shadow-md disabled:opacity-50"
                        title="Envia todos os e-mails de sistema para o seu e-mail"
                    >
                        {testingCampaigns ? <Loader2 className="animate-spin mr-2" size={18}/> : <Zap size={18} className="mr-2"/>}
                        Testar Campanhas (Enviar para mim)
                    </button>

                    <button 
                        onClick={() => navigate('/super-admin/campaigns')} 
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition flex items-center shadow-md"
                    >
                        <Megaphone size={18} className="mr-2"/> Marketing AI (E-mail)
                    </button>

                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 px-2">
                            <CalendarRange size={18} className="text-gray-400" />
                        </div>
                        <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="border rounded px-2 py-1 text-sm outline-none focus:border-primary"/>
                        <span className="text-gray-400">-</span>
                        <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="border rounded px-2 py-1 text-sm outline-none focus:border-primary"/>
                        <button onClick={fetchMetrics} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Atualizar">
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard title="Novas Clínicas" value={metrics.clinics} icon={Building2} color="text-indigo-600" />
                    <MetricCard title="Transações (Volume)" value={metrics.transactionsCount} icon={FileText} color="text-green-600" subtext="Registros financeiros criados" />
                    <MetricCard title="Agendamentos" value={metrics.appointments} icon={Calendar} color="text-blue-600" />
                    <MetricCard title="Pacientes Ativos" value={metrics.patients} icon={Users} color="text-cyan-600" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Card de Detalhes Operacionais */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Filter size={18} className="text-gray-500"/> Uso de Recursos</h3>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-4">
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                <div className="flex items-center gap-3 mb-2"><Mic className="text-purple-600" size={20} /><span className="text-sm font-bold text-purple-900">Prontuários IA</span></div>
                                <p className="text-2xl font-black text-purple-700">{metrics.aiRecords}</p>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                                <div className="flex items-center gap-3 mb-2"><Mail className="text-orange-600" size={20} /><span className="text-sm font-bold text-orange-900">E-mails Enviados</span></div>
                                <p className="text-2xl font-black text-orange-700">{metrics.emails}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3 mb-2"><Server className="text-gray-600" size={20} /><span className="text-sm font-bold text-gray-900">Req. Públicas</span></div>
                                <p className="text-2xl font-black text-gray-700">{metrics.requests}</p>
                            </div>
                            <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                                <div className="flex items-center gap-3 mb-2"><Users className="text-pink-600" size={20} /><span className="text-sm font-bold text-pink-900">Novos Dentistas</span></div>
                                <p className="text-2xl font-black text-pink-700">{metrics.dentists}</p>
                            </div>
                        </div>
                    </div>

                    {/* TABELA DE CLÍNICAS */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[400px]">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Building2 size={18} className="text-gray-500"/> Performance por Clínica</h3>
                            <span className="text-xs text-gray-500">Total: {clinicsStats.length}</span>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Clínica</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Dentistas</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Pacientes</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Criado em</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {clinicsStats.map((clinic) => (
                                        <tr key={clinic.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3">
                                                <p className="text-sm font-bold text-gray-800">{clinic.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{clinic.id.split('-')[0]}...</p>
                                            </td>
                                            <td className="px-6 py-3 text-center text-sm font-medium text-blue-600 bg-blue-50/30">
                                                {clinic.dentists}
                                            </td>
                                            <td className="px-6 py-3 text-center text-sm font-medium text-green-600 bg-green-50/30">
                                                {clinic.clients}
                                            </td>
                                            <td className="px-6 py-3 text-right text-xs text-gray-500">
                                                {format(parseISO(clinic.createdAt), 'dd/MM/yy')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* TABELA DE EXECUÇÃO DE FUNÇÕES (MATRIZ) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-900 text-white flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><BarChart3 size={18} className="text-gray-400"/> Uso de Edge Functions (Diário)</h3>
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">Quantidade de chamadas {`(+ Envios)`}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase border-r border-gray-200 w-32 bg-gray-50">Data</th>
                                    {functionStats.functions.map(fn => (
                                        <th key={fn} className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center min-w-[120px]">
                                            {fn.replace(/-/g, ' ')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {functionStats.days.length === 0 ? (
                                    <tr><td colSpan={functionStats.functions.length + 1} className="px-6 py-8 text-center text-gray-500">Nenhum log encontrado neste período.</td></tr>
                                ) : (
                                    functionStats.days.map((day) => (
                                        <tr key={day} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-700 border-r border-gray-100 whitespace-nowrap bg-gray-50/50">
                                                {format(parseISO(day), "dd/MM/yyyy")}
                                            </td>
                                            {functionStats.functions.map(fn => {
                                                const data = functionStats.matrix[day]?.[fn];
                                                const calls = data?.calls || 0;
                                                const emails = data?.emails || 0;
                                                
                                                return (
                                                    <td key={`${day}-${fn}`} className={`px-6 py-3 text-center align-top ${calls > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                                        {calls > 0 ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-bold text-base">{calls}</span>
                                                                {emails > 0 && (
                                                                    <span className="text-[10px] text-green-600 bg-green-50 px-1.5 rounded-md font-bold mt-1">
                                                                        +{emails} envios
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold text-gray-800 border-t border-gray-200">
                                <tr>
                                    <td className="px-6 py-3 text-xs uppercase border-r border-gray-200">Total</td>
                                    {functionStats.functions.map(fn => {
                                        const totalCalls = functionStats.totals[fn]?.calls || 0;
                                        const totalEmails = functionStats.totals[fn]?.emails || 0;
                                        return (
                                            <td key={`total-${fn}`} className="px-6 py-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-blue-700 text-lg">{totalCalls}</span>
                                                    {totalEmails > 0 && (
                                                        <span className="text-xs text-green-700 font-normal">
                                                            ({totalEmails} e-mails)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* --- TAB: SOCIAL COPY --- */}
        {activeTab === 'social-copy' && (
            <div className="flex flex-col lg:flex-row gap-6 animate-fade-in-up h-[calc(100vh-200px)]">
                
                {/* CONFIGURATION PANEL */}
                <div className="w-full lg:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Sparkles className="text-purple-600 mr-2" size={20}/> Configurar Post
                    </h2>
                    
                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Plataforma</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setCopyPlatform('Instagram')}
                                    className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center transition-all ${copyPlatform === 'Instagram' ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    <Instagram size={20} className="mb-1"/>
                                    <span className="text-xs font-bold">Instagram</span>
                                </button>
                                <button 
                                    onClick={() => setCopyPlatform('LinkedIn')}
                                    className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center transition-all ${copyPlatform === 'LinkedIn' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    <Linkedin size={20} className="mb-1"/>
                                    <span className="text-xs font-bold">LinkedIn</span>
                                </button>
                                <button 
                                    onClick={() => setCopyPlatform('WhatsApp')}
                                    className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center transition-all ${copyPlatform === 'WhatsApp' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    <MessageCircle size={20} className="mb-1"/>
                                    <span className="text-xs font-bold">WhatsApp</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tom de Voz</label>
                            <select 
                                value={copyTone} 
                                onChange={(e) => setCopyTone(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                            >
                                <option>Profissional e Educativo</option>
                                <option>Descontraído e Divertido</option>
                                <option>Urgente e Promocional</option>
                                <option>Empático e Acolhedor</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tópico / Ideia</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none h-32"
                                placeholder="Ex: Dicas para quem tem medo de dentista, promoção de clareamento, ou novidade no sistema..."
                                value={copyTopic}
                                onChange={(e) => setCopyTopic(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerateCopy}
                        disabled={generatingCopy || !copyTopic}
                        className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition flex items-center justify-center disabled:opacity-50 mt-6 shadow-md"
                    >
                        {generatingCopy ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" size={18}/>}
                        {generatingCopy ? 'Criando Mágica...' : 'Gerar Copy'}
                    </button>
                </div>

                {/* RESULT PANEL */}
                <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Resultado Gerado</h3>
                        {generatedCopy && (
                            <div className="flex gap-2">
                                <button onClick={() => setGeneratedCopy(null)} className="text-xs text-gray-500 hover:text-red-500">Limpar</button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                        {!generatedCopy ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <PenTool size={48} className="mb-4 opacity-20" />
                                <p className="text-center text-sm">Configure o post ao lado e clique em "Gerar Copy".<br/>O resultado aparecerá aqui.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                
                                {/* CAPTION */}
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Legenda</h4>
                                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">{generatedCopy.caption}</p>
                                    <button 
                                        onClick={() => copyToClipboard(generatedCopy.caption)}
                                        className="absolute top-2 right-2 p-2 bg-gray-100 rounded-md hover:bg-purple-100 hover:text-purple-700 text-gray-500 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Copiar Legenda"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>

                                {/* HASHTAGS */}
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Hashtags</h4>
                                    <p className="text-blue-600 text-sm font-medium">{generatedCopy.hashtags}</p>
                                    <button 
                                        onClick={() => copyToClipboard(generatedCopy.hashtags)}
                                        className="absolute top-2 right-2 p-2 bg-gray-100 rounded-md hover:bg-blue-100 hover:text-blue-700 text-gray-500 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Copiar Hashtags"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>

                                {/* VISUAL SUGGESTION */}
                                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100 shadow-sm flex items-start gap-4">
                                    <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600 mt-1">
                                        <ImageIcon size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-purple-800 uppercase mb-1">Ideia Visual</h4>
                                        <p className="text-sm text-purple-900">{generatedCopy.image_idea}</p>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default SuperAdminPage;
