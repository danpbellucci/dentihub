
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  Users, Calendar, DollarSign, Activity, Filter, 
  Clock, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown,
  ArrowRight
} from 'lucide-react';
import { useDashboard } from './DashboardLayout';
import { Dentist, Appointment } from '../types';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardMetrics {
  patientsCount: number;
  appointmentsToday: number;
  balanceMonth: number;
  incomeWeek: number;
  expenseWeek: number;
  incomeNext: number;
  expenseNext: number;
}

const DashboardHome: React.FC = () => {
  const { userProfile } = useDashboard() || {};
  const [metrics, setMetrics] = useState<DashboardMetrics>({ 
    patientsCount: 0, 
    appointmentsToday: 0, 
    balanceMonth: 0,
    incomeWeek: 0,
    expenseWeek: 0,
    incomeNext: 0,
    expenseNext: 0
  });
  const [nextAppointments, setNextAppointments] = useState<any[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [filterDentistId, setFilterDentistId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.clinic_id) {
      fetchData(userProfile.clinic_id);
    }
  }, [userProfile?.clinic_id, filterDentistId]);

  const fetchData = async (clinicId: string) => {
    setLoading(true);
    try {
      // 1. Fetch Dentists for filter
      if (dentists.length === 0) {
        const { data: dentistsData } = await supabase
          .from('dentists')
          .select('id, name, color')
          .eq('clinic_id', clinicId);
        setDentists((dentistsData as Dentist[]) || []);
      }

      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 }).toISOString(); // Sunday start
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 }).toISOString();

      // 2. Metrics Queries
      // A. Patients
      const { count: patientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId);
      
      // B. Appointments Today (Excluding Cancelled)
      let appointmentsQuery = supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
        .neq('status', 'cancelled');

      if (filterDentistId) appointmentsQuery = appointmentsQuery.eq('dentist_id', filterDentistId);
      const { count: appointmentsToday } = await appointmentsQuery;

      // C. Financials (Month Balance)
      let transactionsQuery = supabase
        .from('transactions')
        .select('amount, type, date, status')
        .eq('clinic_id', clinicId)
        .gte('date', monthStart)
        .lte('date', monthEnd);
      
      const { data: transactionsMonth } = await transactionsQuery;

      let incomeMonth = 0;
      let expenseMonth = 0;

      transactionsMonth?.forEach(t => {
          if (t.type === 'income') incomeMonth += Number(t.amount);
          else expenseMonth += Number(t.amount);
      });

      // D. Financials (Week Breakdown)
      // Transactions (Completed or Manual Pending)
      const { data: transactionsWeek } = await supabase
        .from('transactions')
        .select('amount, type, status')
        .eq('clinic_id', clinicId)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      let incWeek = 0;
      let expWeek = 0;
      let incNext = 0; // A receber (pendente)
      let expNext = 0; // A pagar (pendente)

      transactionsWeek?.forEach(t => {
          if (t.type === 'income') {
              if (t.status === 'completed') incWeek += Number(t.amount);
              else incNext += Number(t.amount);
          } else {
              if (t.status === 'completed') expWeek += Number(t.amount);
              else expNext += Number(t.amount);
          }
      });

      // Appointments (Pending Income from Schedule)
      const { data: appointmentsWeek } = await supabase
        .from('appointments')
        .select('amount')
        .eq('clinic_id', clinicId)
        .gte('start_time', weekStart)
        .lte('start_time', weekEnd)
        .neq('status', 'cancelled')
        .eq('payment_status', 'pending');

      if (appointmentsWeek) {
          appointmentsWeek.forEach(a => {
              incNext += Number(a.amount || 0);
          });
      }

      // E. Next Appointments List
      let nextApptsQuery = supabase
        .from('appointments')
        .select('*, client:clients(name), dentist:dentists(name, color)')
        .eq('clinic_id', clinicId)
        .gte('start_time', now.toISOString()) // From now onwards
        .neq('status', 'cancelled') // NO CANCELLED
        .order('start_time', { ascending: true })
        .limit(6);

      if (filterDentistId) nextApptsQuery = nextApptsQuery.eq('dentist_id', filterDentistId);
      const { data: nextApptsData } = await nextApptsQuery;

      setMetrics({
        patientsCount: patientsCount || 0,
        appointmentsToday: appointmentsToday || 0,
        balanceMonth: incomeMonth - expenseMonth,
        incomeWeek: incWeek,
        expenseWeek: expWeek,
        incomeNext: incNext,
        expenseNext: expNext
      });

      setNextAppointments(nextApptsData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
        </div>
        
        {/* Filter */}
        <div className="w-full sm:w-auto bg-gray-900 p-1 rounded-lg border border-white/10 flex items-center shadow-sm">
          <Filter size={16} className="text-gray-500 ml-2 mr-2" />
          <select 
            value={filterDentistId}
            onChange={(e) => setFilterDentistId(e.target.value)}
            className="bg-transparent text-white text-sm outline-none py-1 pr-4 cursor-pointer appearance-none"
          >
            <option value="" className="text-gray-900">Todos os Dentistas</option>
            {dentists.map(d => (
              <option key={d.id} value={d.id} className="text-gray-900">{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Pacientes</p>
              <h3 className="text-3xl font-black text-white mt-1">{loading ? '...' : metrics.patientsCount}</h3>
            </div>
          </div>
          <Users size={100} className="absolute -right-6 -bottom-6 text-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-green-500/20 rounded-lg text-green-400 group-hover:scale-110 transition-transform">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Agendados Hoje</p>
              <h3 className="text-3xl font-black text-white mt-1">{loading ? '...' : metrics.appointmentsToday}</h3>
            </div>
          </div>
          <Calendar size={100} className="absolute -right-6 -bottom-6 text-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
            <div className={`p-3 rounded-lg group-hover:scale-110 transition-transform ${metrics.balanceMonth >= 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Saldo (Mês)</p>
              <h3 className={`text-3xl font-black mt-1 ${metrics.balanceMonth >= 0 ? 'text-white' : 'text-red-400'}`}>
                {loading ? '...' : metrics.balanceMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
          </div>
          <DollarSign size={100} className="absolute -right-6 -bottom-6 text-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Next Appointments */}
        <div className="lg:col-span-2 bg-gray-900/60 backdrop-blur-md rounded-xl border border-white/5 shadow-lg flex flex-col h-full">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-gray-800/20">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Clock size={18} className="text-gray-400"/> Próximos Agendamentos
                </h3>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded border border-white/5 cursor-default">
                    {loading ? '...' : nextAppointments.length} na fila
                </span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar min-h-[300px]">
                {loading ? (
                    <div className="flex justify-center items-center h-full text-gray-500">Carregando...</div>
                ) : nextAppointments.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-full text-gray-500">
                        <Calendar size={48} className="mb-3 opacity-20"/>
                        <p>Sem agendamentos futuros.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {nextAppointments.map((appt) => (
                            <div key={appt.id} className="flex items-center p-3 bg-gray-800/40 rounded-lg border border-white/5 hover:bg-gray-800/80 transition group">
                                <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-900 rounded-lg border border-white/10 mr-4">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">{format(parseISO(appt.start_time), 'MMM', {locale: ptBR})}</span>
                                    <span className="text-lg font-black text-white leading-none">{format(parseISO(appt.start_time), 'dd')}</span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-sm truncate">{appt.client?.name}</h4>
                                    <div className="flex items-center text-xs text-gray-400 mt-1">
                                        <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 font-mono mr-2 border border-white/10">
                                            {format(parseISO(appt.start_time), 'HH:mm')}
                                        </span>
                                        <span className="truncate">{appt.service_name}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: appt.dentist?.color || '#ccc' }} title={appt.dentist?.name}></div>
                                </div>
                            </div>
                        ))}
                        <div className="text-center pt-2">
                            <button className="text-xs text-gray-500 hover:text-white transition">Rolar para ver mais</button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Right: Financial Stats */}
        <div className="flex flex-col gap-6">
            {/* Entradas */}
            <div className="bg-gray-900/60 backdrop-blur-md rounded-xl border border-white/5 shadow-lg p-5 relative overflow-hidden flex-1">
                <div className="absolute right-0 top-0 p-4 opacity-5"><TrendingUp size={80} className="text-green-500"/></div>
                
                <h3 className="font-bold text-white flex items-center gap-2 text-sm mb-4">
                    <span className="p-1.5 bg-green-500/20 rounded-lg text-green-400"><ArrowUpCircle size={16}/></span> 
                    Entradas (Semana)
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-green-900/10 rounded-lg border border-green-500/20">
                        <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Realizado</p>
                        <p className="text-lg font-black text-white truncate">
                            {loading ? '...' : metrics.incomeWeek.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-white/5">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">A Receber</p>
                        <p className="text-lg font-black text-gray-300 truncate">
                            {loading ? '...' : metrics.incomeNext.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Saídas */}
            <div className="bg-gray-900/60 backdrop-blur-md rounded-xl border border-white/5 shadow-lg p-5 relative overflow-hidden flex-1">
                <div className="absolute right-0 top-0 p-4 opacity-5"><TrendingDown size={80} className="text-red-500"/></div>
                
                <h3 className="font-bold text-white flex items-center gap-2 text-sm mb-4">
                    <span className="p-1.5 bg-red-500/20 rounded-lg text-red-400"><ArrowDownCircle size={16}/></span> 
                    Saídas (Semana)
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-red-900/10 rounded-lg border border-red-500/20">
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Pago</p>
                        <p className="text-lg font-black text-white truncate">
                            {loading ? '...' : metrics.expenseWeek.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-white/5">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">A Pagar</p>
                        <p className="text-lg font-black text-gray-300 truncate">
                            {loading ? '...' : metrics.expenseNext.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardHome;
