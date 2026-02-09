
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Users, Building2, Calendar, Mic, Activity, 
  FileText, CalendarRange, RefreshCw,
  BarChart3, ArrowLeft, Sparkles, CreditCard,
  Monitor, Menu, X
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

              {/* NOVO BOTÃO ADS */}
              <button 
                  onClick={() => { navigate('/super-admin/ads'); setSidebarOpen(false); }}
                  className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              >
                  <Monitor size={18} className="mr-3"/> Campanhas Ads
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

      {/* ... (RESTANTE DO CONTEÚDO MANTIDO IGUAL) ... */}
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

        {/* ... (VIEW: DASHBOARD) ... */}
        {activeSection === 'dashboard' && (
            <div className="p-4 sm:p-8 space-y-8 animate-fade-in w-full">
                {/* ... (Conteúdo do dashboard) ... */}
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
            </div>
        )}

        {/* ... (VIEW: MARKETING AGENT) ... */}
        {activeSection === 'marketing' && (
            <div className="p-4 sm:p-8 h-full flex flex-col animate-fade-in w-full">
                {/* ... (Conteúdo do Agente de Marketing Original mantido) ... */}
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-2xl font-bold text-gray-800">Agente de Marketing</h2>
                </div>
                {/* ... Resto da UI do Agente ... */}
            </div>
        )}

      </main>
    </div>
  );
};

export default SuperAdminPage;
