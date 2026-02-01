
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useOutletContext } from 'react-router-dom';
import { UserProfile } from '../types';
import { 
  Building2, UserPlus, Users, Smile, X, CheckCircle2, Lock, ArrowRight, Check, 
  Calendar, DollarSign, Loader2, Link as LinkIcon, Clock, Copy, TrendingUp, TrendingDown,
  Wallet
} from 'lucide-react';
import { ClinicOnboardingForm, DentistOnboardingForm, ClientOnboardingForm } from './OnboardingForms';
import Toast, { ToastType } from './Toast';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isSameMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OnboardingStep {
    id: string;
    title: string;
    desc: string;
    icon: any;
    done: boolean;
}

const DashboardHome: React.FC = () => {
    const { userProfile } = useOutletContext<{ userProfile: UserProfile | null }>();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{
        clients: number;
        appointmentsToday: number;
        revenueMonth: number;
        recentAppointments: any[];
        weeklyForecast: { 
            incomeRealized: number; 
            incomePending: number; 
            expenseRealized: number; 
            expensePending: number; 
            hasAccess: boolean;
        };
    }>({
        clients: 0,
        appointmentsToday: 0,
        revenueMonth: 0,
        recentAppointments: [],
        weeklyForecast: { 
            incomeRealized: 0, 
            incomePending: 0, 
            expenseRealized: 0, 
            expensePending: 0, 
            hasAccess: false 
        }
    });
    
    // Onboarding State
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [activeOnboardingModal, setActiveOnboardingModal] = useState<'clinic' | 'dentist' | 'client' | null>(null);
    
    // Removido o passo 'link' da lista de checklist
    const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([
        { id: 'clinic', title: 'Dados da Clínica', desc: 'Configure nome e endereço', icon: Building2, done: false },
        { id: 'dentists', title: 'Cadastrar Dentista', desc: 'Adicione profissionais', icon: UserPlus, done: false },
        { id: 'patients', title: 'Cadastrar Paciente', desc: 'Adicione seu primeiro paciente', icon: Users, done: false },
    ]);

    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [clinicSlug, setClinicSlug] = useState<string>('');

    useEffect(() => {
        if (userProfile?.clinic_id) {
            loadStats();
        }
    }, [userProfile]);

    const loadStats = async () => {
        if (!userProfile?.clinic_id) return;
        const clinicId = userProfile.clinic_id;

        try {
            // 1. Onboarding Checks
            const { data: clinic } = await supabase.from('clinics').select('*').eq('id', clinicId).single();
            const { count: dentistCount } = await supabase.from('dentists').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId);
            const { count: clientCount } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId);

            const isClinicDone = !!(clinic && clinic.address && clinic.city);
            const isDentistsDone = (dentistCount || 0) > 0;
            const isPatientsDone = (clientCount || 0) > 0;

            if (clinic?.slug) setClinicSlug(clinic.slug);

            setOnboardingSteps(prev => prev.map(step => {
                if (step.id === 'clinic') return { ...step, done: isClinicDone };
                if (step.id === 'dentists') return { ...step, done: isDentistsDone };
                if (step.id === 'patients') return { ...step, done: isPatientsDone };
                return step;
            }));

            if ((!isClinicDone || !isDentistsDone || !isPatientsDone) && loading) {
                setShowOnboarding(true);
            }

            // --- LÓGICA DE FILTRO POR DENTISTA ---
            let filterDentistId = null;
            if (userProfile.role === 'dentist') {
                const { data: myDentistProfile } = await supabase
                    .from('dentists')
                    .select('id')
                    .eq('email', userProfile.email)
                    .eq('clinic_id', clinicId)
                    .maybeSingle();
                
                if (myDentistProfile) {
                    filterDentistId = myDentistProfile.id;
                }
            }

            // 2. Stats Gerais
            const today = new Date().toISOString().split('T')[0];
            
            // Appointments Today
            let apptQuery = supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .gte('start_time', `${today}T00:00:00`)
                .lte('start_time', `${today}T23:59:59`)
                .neq('status', 'cancelled');
            
            if (filterDentistId) {
                apptQuery = apptQuery.eq('dentist_id', filterDentistId);
            }

            const { count: apptTodayCount } = await apptQuery;

            // 3. Financial Data & Permissions
            let revenue = 0;
            let weeklyForecastData = { 
                incomeRealized: 0, 
                incomePending: 0, 
                expenseRealized: 0, 
                expensePending: 0, 
                hasAccess: false 
            };

            // Verificar permissão de acesso ao financeiro
            let hasFinanceAccess = false;
            if (userProfile.role === 'administrator') {
                hasFinanceAccess = true;
            } else {
                const { data: perm } = await supabase
                    .from('role_permissions')
                    .select('is_allowed')
                    .eq('clinic_id', clinicId)
                    .eq('role', userProfile.role)
                    .eq('module', 'finance')
                    .maybeSingle();
                
                if (perm && perm.is_allowed) hasFinanceAccess = true;
            }

            if (hasFinanceAccess) {
                // A. Receita do Mês Atual (Card Topo - Apenas realizado)
                const startOfCurrentMonth = startOfMonth(new Date());
                const endOfCurrentMonth = endOfMonth(new Date());

                const { data: monthTransactions } = await supabase
                    .from('transactions')
                    .select('amount, type, status')
                    .eq('clinic_id', clinicId)
                    .gte('date', startOfCurrentMonth.toISOString())
                    .lte('date', endOfCurrentMonth.toISOString());

                revenue = monthTransactions?.filter(t => 
                    t.type === 'income' && 
                    t.status === 'completed'
                ).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

                // B. Previsão Semanal Detalhada
                const startWeek = startOfWeek(new Date(), { weekStartsOn: 0 }).toISOString();
                const endWeek = endOfWeek(new Date(), { weekStartsOn: 0 }).toISOString();

                // B1. Agendamentos Pendentes (Entradas Futuras - Pendentes)
                const { data: pendingAppts } = await supabase
                    .from('appointments')
                    .select('amount')
                    .eq('clinic_id', clinicId)
                    .gte('start_time', startWeek)
                    .lte('start_time', endWeek)
                    .eq('payment_status', 'pending')
                    .neq('status', 'cancelled');
                
                const incomePendingFromAppts = pendingAppts?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

                // B2. Transações da Semana (Todas)
                const { data: weekTrans } = await supabase
                    .from('transactions')
                    .select('amount, type, status')
                    .eq('clinic_id', clinicId)
                    .gte('date', startWeek)
                    .lte('date', endWeek);

                const incomeRealized = weekTrans?.filter(t => t.type === 'income' && t.status === 'completed').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
                const incomePendingTrans = weekTrans?.filter(t => t.type === 'income' && t.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
                
                const expenseRealized = weekTrans?.filter(t => t.type === 'expense' && t.status === 'completed').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
                const expensePending = weekTrans?.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

                weeklyForecastData = {
                    incomeRealized,
                    incomePending: incomePendingTrans + incomePendingFromAppts,
                    expenseRealized,
                    expensePending,
                    hasAccess: true
                };
            }

            // 4. Recent Appointments
            let recentApptsQuery = supabase
                .from('appointments')
                .select('*, client:clients(name), dentist:dentists(name, color)')
                .eq('clinic_id', clinicId)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(5);

            if (filterDentistId) {
                recentApptsQuery = recentApptsQuery.eq('dentist_id', filterDentistId);
            }

            const { data: recentAppts } = await recentApptsQuery;

            setStats({
                clients: clientCount || 0,
                appointmentsToday: apptTodayCount || 0,
                revenueMonth: revenue,
                recentAppointments: recentAppts || [],
                weeklyForecast: weeklyForecastData
            });

        } catch (error) {
            console.error("Error loading stats", error);
        } finally {
            setLoading(false);
        }
    };

    const handleModalSuccess = () => {
        setActiveOnboardingModal(null);
        setToast({ message: "Dados salvos com sucesso!", type: 'success' });
        loadStats(); 
    };

    const handleStepClick = (step: OnboardingStep, isLocked: boolean) => {
        if (isLocked) return;
        if (step.id === 'clinic') setActiveOnboardingModal('clinic');
        if (step.id === 'dentists') setActiveOnboardingModal('dentist');
        if (step.id === 'patients') setActiveOnboardingModal('client');
    };

    const copyLink = () => {
        const link = `${window.location.origin}/#/${clinicSlug || userProfile?.clinic_id}`;
        navigator.clipboard.writeText(link);
        setToast({ message: "Link copiado para a área de transferência!", type: 'success' });
    };

    const closeOnboarding = () => {
        setShowOnboarding(false);
    };

    const completedSteps = onboardingSteps.filter(s => s.done).length;
    const progress = (completedSteps / onboardingSteps.length) * 100;
    
    const isClinicDone = onboardingSteps.find(s => s.id === 'clinic')?.done;
    const isDentistsDone = onboardingSteps.find(s => s.id === 'dentists')?.done;
    const isPatientsDone = onboardingSteps.find(s => s.id === 'patients')?.done;

    if (loading) {
        return (
          <div className="flex h-96 w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="text-gray-500 font-medium">Carregando dados...</span>
            </div>
          </div>
        );
    }

    return (
        <div className="space-y-6 relative pb-10">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* Onboarding Modal */}
            {showOnboarding && userProfile?.role === 'administrator' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row relative h-[600px] md:h-auto">
                        {/* ... (Onboarding Modal content remains the same) ... */}
                        {/* Nested Form Modal */}
                        {activeOnboardingModal && userProfile?.clinic_id && (
                            <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-fade-in">
                                <div className="flex justify-between items-center p-4 border-b">
                                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                        {activeOnboardingModal === 'clinic' && <><Building2 className="text-primary"/> Perfil da Clínica</>}
                                        {activeOnboardingModal === 'dentist' && <><UserPlus className="text-primary"/> Novo Dentista</>}
                                        {activeOnboardingModal === 'client' && <><Users className="text-primary"/> Novo Paciente</>}
                                    </h3>
                                    <button onClick={() => setActiveOnboardingModal(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                                    {activeOnboardingModal === 'clinic' && (
                                        <ClinicOnboardingForm clinicId={userProfile.clinic_id} onSuccess={handleModalSuccess} onCancel={() => setActiveOnboardingModal(null)} />
                                    )}
                                    {activeOnboardingModal === 'dentist' && (
                                        <DentistOnboardingForm clinicId={userProfile.clinic_id} onSuccess={handleModalSuccess} onCancel={() => setActiveOnboardingModal(null)} />
                                    )}
                                    {activeOnboardingModal === 'client' && (
                                        <ClientOnboardingForm clinicId={userProfile.clinic_id} onSuccess={handleModalSuccess} onCancel={() => setActiveOnboardingModal(null)} />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Left Side */}
                        <div className="bg-primary p-8 text-white md:w-1/3 flex flex-col justify-between relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-6 backdrop-blur-md">
                                    <Smile size={28} className="text-white"/>
                                </div>
                                <h2 className="text-2xl font-black mb-2 leading-tight">Bem-vindo ao DentiHub!</h2>
                                <p className="text-blue-100 text-sm mb-6">Vamos configurar sua clínica para o sucesso em 3 passos rápidos.</p>
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                                    <span>Progresso</span>
                                    <span>{completedSteps}/{onboardingSteps.length}</span>
                                </div>
                                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        </div>

                        {/* Right Side */}
                        <div className="p-8 md:w-2/3 bg-white relative overflow-y-auto">
                            <button onClick={closeOnboarding} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>

                            <h3 className="text-lg font-bold text-gray-800 mb-6">Passos Iniciais</h3>
                            
                            <div className="space-y-3 mb-6">
                                {onboardingSteps.map((step) => {
                                    return (
                                        <div 
                                            key={step.id} 
                                            onClick={() => handleStepClick(step, false)}
                                            className={`group flex items-center p-3 rounded-xl border transition-all ${
                                                step.done 
                                                    ? 'bg-green-50 border-green-100 cursor-pointer' 
                                                    : 'bg-white border-gray-100 hover:border-primary hover:shadow-md cursor-pointer'
                                            }`}
                                        >
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-4 transition-colors ${
                                                step.done ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-primary'
                                            }`}>
                                                {step.done ? <CheckCircle2 size={20} /> : <step.icon size={20} />}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className={`font-bold text-sm ${step.done ? 'text-green-800' : 'text-gray-800'}`}>{step.title}</h4>
                                                <p className="text-xs text-gray-500">{step.desc}</p>
                                            </div>
                                            {!step.done && <ArrowRight size={16} className="text-gray-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                                <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                                    <LinkIcon size={16} /> Link de Agendamento
                                </h4>
                                <p className="text-xs text-blue-700 mb-3">
                                    Compartilhe este link para que seus pacientes solicitem agendamentos online.
                                </p>
                                <div className="flex gap-2">
                                    <input 
                                        readOnly 
                                        value={`${window.location.origin}/#/${clinicSlug || userProfile?.clinic_id}`}
                                        className="flex-1 text-xs border border-blue-200 rounded px-2 py-1.5 text-gray-600 bg-white focus:outline-none"
                                    />
                                    <button 
                                        onClick={copyLink}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center"
                                    >
                                        <Copy size={12} className="mr-1"/> Copiar
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                {isClinicDone && isDentistsDone && isPatientsDone ? (
                                    <button onClick={closeOnboarding} className="bg-green-600 text-white hover:bg-green-700 text-sm font-bold px-6 py-2 rounded transition shadow-md flex items-center">
                                        <Check size={16} className="mr-2" /> Encerrar
                                    </button>
                                ) : (
                                    <button onClick={closeOnboarding} className="text-gray-500 hover:text-gray-700 text-sm font-bold px-4 py-2 hover:bg-gray-50 rounded transition">
                                        Pular por enquanto
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Content */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Visão Geral</h1>
                {!showOnboarding && completedSteps < 3 && userProfile?.role === 'administrator' && (
                    <button onClick={() => setShowOnboarding(true)} className="text-sm text-primary font-bold hover:underline flex items-center">
                        <CheckCircle2 size={16} className="mr-1"/> Continuar Configuração
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-4 bg-blue-50 text-primary rounded-full mr-4">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase">Pacientes</p>
                        <p className="text-2xl font-black text-gray-800">{stats.clients}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-4 bg-green-50 text-green-600 rounded-full mr-4">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase">Agendados Hoje</p>
                        <p className="text-2xl font-black text-gray-800">{stats.appointmentsToday}</p>
                    </div>
                </div>
                <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center ${!stats.weeklyForecast.hasAccess ? 'opacity-50' : ''}`}>
                    <div className="p-4 bg-yellow-50 text-yellow-600 rounded-full mr-4">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase">Receita (Mês)</p>
                        <p className="text-2xl font-black text-gray-800">
                            {!stats.weeklyForecast.hasAccess
                                ? '---' 
                                : `R$ ${stats.revenueMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Recent Appointments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                    <Clock size={18} className="mr-2 text-primary"/> Próximos Agendamentos
                </h3>
                {stats.recentAppointments.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Nenhum agendamento futuro encontrado.</p>
                ) : (
                    <div className="space-y-3">
                        {stats.recentAppointments.map((appt: any) => (
                            <div key={appt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="text-center bg-white border rounded px-3 py-1">
                                        <p className="text-xs text-gray-500 font-bold uppercase">{format(parseISO(appt.start_time), 'MMM', { locale: ptBR })}</p>
                                        <p className="text-lg font-black text-gray-800 leading-none">{format(parseISO(appt.start_time), 'dd')}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{appt.client?.name}</p>
                                        <p className="text-xs text-gray-500">{format(parseISO(appt.start_time), 'HH:mm')} - {appt.service_name}</p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-2">
                                    <span className="text-xs bg-white border px-2 py-1 rounded text-gray-600 flex items-center">
                                        <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: appt.dentist?.color || '#ccc' }}></div>
                                        {appt.dentist?.name}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Weekly Forecast (Finance Access Only) */}
            {stats.weeklyForecast.hasAccess && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                    {/* ENTRADAS */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <TrendingUp size={20} className="text-green-600" /> Fluxo Semanal (Entradas)
                            </h3>
                            <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded">Esta Semana</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                <p className="text-xs text-green-800 font-bold uppercase mb-1">Realizado</p>
                                <p className="text-lg font-black text-green-700">
                                    R$ {stats.weeklyForecast.incomeRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 opacity-80">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">A Receber (Previsto)</p>
                                <p className="text-lg font-black text-gray-600">
                                    R$ {stats.weeklyForecast.incomePending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SAÍDAS */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <TrendingDown size={20} className="text-red-600" /> Fluxo Semanal (Saídas)
                            </h3>
                            <span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded">Esta Semana</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                <p className="text-xs text-red-800 font-bold uppercase mb-1">Pago (Realizado)</p>
                                <p className="text-lg font-black text-red-700">
                                    R$ {stats.weeklyForecast.expenseRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 opacity-80">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">A Pagar (Previsto)</p>
                                <p className="text-lg font-black text-gray-600">
                                    R$ {stats.weeklyForecast.expensePending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardHome;
