import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Smile, Calendar, Users, DollarSign, CheckCircle, ShieldCheck, Zap, Search, Mic, 
  BookOpen, Smartphone, Tablet, Monitor, LayoutDashboard, Bell, 
  UserCheck, MessageSquare, Settings, Trash2, Mail, Gift, CreditCard, Menu, X, Check, Loader2,
  TrendingUp, TrendingDown, Filter, ChevronLeft, ChevronRight, Plus, Download, Upload,
  Edit2, FileText, Activity, Clock, BellRing, Lock, Send, Folder
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeMockup, setActiveMockup] = useState('Visão Geral');
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- LÓGICA DO POP-UP DE LEADS ---
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadStatus, setLeadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !localStorage.getItem('denti_lead_popup_shown')) {
          setShowLeadModal(true);
          localStorage.setItem('denti_lead_popup_shown', 'true');
        }
      },
      { threshold: 0.3 }
    );

    const plansElement = document.getElementById('plans');
    if (plansElement) {
      observer.observe(plansElement);
    }

    return () => {
      if (plansElement) observer.unobserve(plansElement);
    };
  }, []);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail) return;

    setLeadStatus('loading');
    try {
      const { error } = await supabase.from('leads').insert({ email: leadEmail });
      if (error) throw error;
      setLeadStatus('success');
      setTimeout(() => setShowLeadModal(false), 3000);
    } catch (err) {
      console.error(err);
      setLeadStatus('error');
    }
  };

  const closeLeadModal = () => {
    setShowLeadModal(false);
  };
  // ----------------------------------

  const scrollToPlans = () => {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  };

  const goToAuth = (view: 'login' | 'signup' = 'login') => {
    navigate('/auth', { state: { view } });
  };

  const mockupMenu = [
    { label: 'Visão Geral', icon: LayoutDashboard },
    { label: 'Agenda', icon: Calendar },
    { label: 'Pacientes', icon: Users },
    { label: 'Dentistas', icon: UserCheck },
    { label: 'Prontuário IA', icon: Mic },
    { label: 'Mensageria', icon: MessageSquare },
    { label: 'Financeiro', icon: DollarSign },
    { label: 'Solicitações', icon: Bell },
    { label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 relative">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-primary font-bold text-2xl cursor-pointer" onClick={() => navigate('/')}>
              <Smile size={32} />
              <span>DentiHub</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={scrollToPlans} 
                className="text-gray-600 font-medium hover:text-primary transition flex items-center text-sm sm:text-base mr-2"
              >
                <CreditCard size={18} className="mr-1 hidden sm:inline" />
                <span>Planos</span>
              </button>
              <button 
                onClick={() => navigate('/entenda')} 
                className="text-gray-600 font-medium hover:text-primary transition flex items-center text-sm sm:text-base mr-2"
              >
                <BookOpen size={18} className="mr-1 hidden sm:inline" />
                <span>Entenda</span>
              </button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <button 
                onClick={() => navigate('/encontrar-clinica')} 
                className="text-gray-600 font-medium hover:text-primary transition flex items-center text-sm sm:text-base mr-2"
              >
                <Search size={18} className="mr-1" />
                <span className="hidden sm:inline">Encontre uma clínica</span>
                <span className="sm:hidden">Buscar</span>
              </button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <button 
                onClick={() => goToAuth('login')} 
                className="text-gray-600 font-medium hover:text-primary transition text-sm sm:text-base"
              >
                Entrar
              </button>
              <button 
                onClick={() => goToAuth('signup')} 
                className="bg-primary text-white px-4 py-2 sm:px-5 sm:py-2 rounded-full font-bold hover:bg-sky-600 transition shadow-lg shadow-primary/20 text-sm sm:text-base hidden sm:block"
              >
                Criar Conta
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-primary font-bold text-sm mb-6 border border-blue-100 animate-fade-in-up">
            🚀 Gestão Simplificada para Dentistas
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6 leading-tight">
            Seu consultório organizado <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              em um único lugar.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600 mb-8">
            Agenda inteligente, prontuário eletrônico com IA e controle financeiro. <br className="hidden md:block" />
            Acesse de qualquer lugar pelo <strong>celular, tablet ou computador</strong>.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <button 
              onClick={() => goToAuth('signup')} 
              className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-sky-600 transition shadow-xl shadow-primary/30 flex items-center justify-center gap-2"
            >
              Começar Grátis
              <Zap size={20} />
            </button>
            <p className="mt-2 sm:mt-0 sm:ml-4 flex items-center justify-center text-sm text-gray-500">
              <ShieldCheck size={16} className="mr-1 text-green-500" />
              Comece sem cartão de crédito
            </p>
          </div>

          {/* SYSTEM MOCKUP CONTAINER */}
          <div className="mt-16 relative mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-up delay-200 flex justify-center">
            
            {/* The Frame Wrapper */}
            <div 
                className={`transition-all duration-700 ease-in-out relative bg-white shadow-2xl overflow-hidden
                    ${device === 'desktop' ? 'w-full max-w-5xl rounded-xl ring-1 ring-gray-900/10' : ''}
                    ${device === 'tablet' ? 'w-[500px] h-[700px] rounded-[2rem] border-[12px] border-gray-800' : ''}
                    ${device === 'mobile' ? 'w-[300px] h-[600px] rounded-[3rem] border-[10px] border-gray-800' : ''}
                `}
            >
                {/* Device Camera/Notch Logic */}
                {device !== 'desktop' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-gray-800 rounded-b-xl z-20"></div>
                )}

                {/* Desktop Header */}
                {device === 'desktop' && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                        <div className="mx-auto bg-gray-200/50 rounded-md px-3 py-1 text-[10px] text-gray-400 font-mono w-full max-w-xs text-center flex items-center justify-center gap-1">
                            <ShieldCheck size={10} /> dentihub.com.br/dashboard
                        </div>
                    </div>
                )}

                {/* Mockup Body Content */}
                <div className={`flex bg-white h-full relative text-left ${device === 'mobile' ? 'flex-col' : 'flex-row'}`}>
                    
                    {/* SIDEBAR MOCKUP */}
                    <div className={`
                        bg-white flex flex-col overflow-y-auto flex-shrink-0 transition-all duration-300 z-50
                        ${device === 'mobile' 
                            ? `absolute top-0 left-0 h-full w-64 shadow-2xl transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}` 
                            : `border-r border-gray-100 relative translate-x-0 ${device === 'tablet' ? 'w-16 items-center p-2' : 'w-56 p-4'}`
                        }
                    `}>
                        <div className={`flex items-center gap-2 text-primary font-bold mb-6 ${device === 'mobile' ? 'p-4 justify-between' : 'sm:mb-8'} ${device === 'tablet' ? 'justify-center mb-4' : ''}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white flex-shrink-0"><Smile size={18}/></div>
                                <span className={device === 'tablet' ? 'hidden' : 'text-lg'}>DentiHub</span>
                            </div>
                            {device === 'mobile' && (
                                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                        <div className={`space-y-1 flex-1 ${device === 'mobile' ? 'px-4' : ''}`}>
                            {mockupMenu.map((item) => (
                                <button 
                                  key={item.label} 
                                  onClick={() => {
                                      setActiveMockup(item.label);
                                      if (device === 'mobile') setMobileMenuOpen(false);
                                  }}
                                  className={`
                                    rounded-lg text-sm font-medium flex items-center gap-3 transition-colors
                                    ${device === 'tablet' ? 'w-10 h-10 justify-center p-0' : 'w-full p-2.5 justify-start'}
                                    ${activeMockup === item.label ? 'bg-blue-50 text-primary' : 'text-gray-500 hover:bg-gray-50'}
                                  `}
                                >
                                    <item.icon size={18} />
                                    <span className={device === 'tablet' ? 'hidden' : ''}>{item.label}</span>
                                    {item.label === 'Solicitações' && device !== 'tablet' && (
                                        <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CONTENT MOCKUP */}
                    <div className={`flex-1 bg-gray-50 overflow-hidden relative overflow-y-auto custom-scrollbar flex flex-col ${device === 'mobile' ? 'pt-8' : 'p-8'}`}>
                        {device === 'mobile' && (
                            <div className="absolute top-0 left-0 w-full bg-white shadow-sm p-4 flex items-center justify-between z-30">
                                <div className="flex items-center text-primary font-bold"><Smile className="mr-2"/> DentiHub</div>
                                <button onClick={() => setMobileMenuOpen(true)} className="text-gray-500">
                                    <Menu size={24} />
                                </button>
                            </div>
                        )}

                        <div className={`${device === 'mobile' ? 'p-4' : ''} h-full`}>
                             
                             {/* Visão Geral */}
                             {activeMockup === 'Visão Geral' && (
                                 <div className="space-y-6">
                                     <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
                                            <p className="text-sm text-gray-500">Bom dia, Dr. André 👋</p>
                                        </div>
                                        <Bell className="text-gray-400" />
                                     </div>

                                     <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                                         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                                             <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={24} /></div>
                                             <div><div className="text-xs text-gray-500 font-medium uppercase">Pacientes</div><div className="text-2xl font-bold text-gray-800">1,248</div></div>
                                         </div>
                                         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                                             <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Calendar size={24} /></div>
                                             <div><div className="text-xs text-gray-500 font-medium uppercase">Agendados Hoje</div><div className="text-2xl font-bold text-gray-800">12</div></div>
                                         </div>
                                         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                                             <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><DollarSign size={24} /></div>
                                             <div><div className="text-xs text-gray-500 font-medium uppercase">Receita (Mês)</div><div className="text-2xl font-bold text-gray-800">R$ 15.420,00</div></div>
                                         </div>
                                     </div>
                                     
                                     {/* Próximos Agendamentos */}
                                     <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                         <h3 className="font-bold text-gray-800 mb-4 flex items-center"><Calendar size={18} className="mr-2 text-primary"/> Próximos Agendamentos</h3>
                                         <div className="space-y-3">
                                             {[
                                                 { time: '09:00', name: 'Ana Pereira', service: 'Limpeza', status: 'Confirmado', color: 'green' },
                                                 { time: '10:30', name: 'Carlos Mendes', service: 'Canal', status: 'Andamento', color: 'blue' },
                                                 { time: '14:00', name: 'Fernanda Lima', service: 'Avaliação', status: 'Aguardando', color: 'yellow' }
                                             ].map((appt, i) => (
                                                 <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                     <div className="flex items-center gap-4">
                                                         <div className="text-center bg-white border rounded px-2 py-1 min-w-[60px]">
                                                             <p className="text-sm font-bold text-gray-800">{appt.time}</p>
                                                         </div>
                                                         <div>
                                                             <p className="font-bold text-gray-800 text-sm">{appt.name}</p>
                                                             <p className="text-xs text-gray-500">{appt.service}</p>
                                                         </div>
                                                     </div>
                                                     <span className={`text-xs px-2 py-1 rounded-full font-bold bg-${appt.color}-100 text-${appt.color}-700`}>{appt.status}</span>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>

                                     {/* Fluxo Financeiro */}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                             <div className="flex justify-between items-center mb-4">
                                                 <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp size={20} className="text-green-600"/> Fluxo Semanal (Entradas)</h3>
                                                 <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-bold">Esta Semana</span>
                                             </div>
                                             <div className="flex gap-4">
                                                 <div className="flex-1 p-3 bg-green-50 rounded-lg border border-green-100 text-center">
                                                     <p className="text-xs text-green-800 font-bold uppercase">Realizado</p>
                                                     <p className="text-lg font-black text-green-700">R$ 4.250,00</p>
                                                 </div>
                                                 <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-100 text-center opacity-80">
                                                     <p className="text-xs text-gray-500 font-bold uppercase">A Receber</p>
                                                     <p className="text-lg font-black text-gray-600">R$ 1.500,00</p>
                                                 </div>
                                             </div>
                                         </div>
                                         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                             <div className="flex justify-between items-center mb-4">
                                                 <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingDown size={20} className="text-red-600"/> Fluxo Semanal (Saídas)</h3>
                                                 <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded font-bold">Esta Semana</span>
                                             </div>
                                             <div className="flex gap-4">
                                                 <div className="flex-1 p-3 bg-red-50 rounded-lg border border-red-100 text-center">
                                                     <p className="text-xs text-red-800 font-bold uppercase">Pago</p>
                                                     <p className="text-lg font-black text-red-700">R$ 1.850,00</p>
                                                 </div>
                                                 <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-100 text-center opacity-80">
                                                     <p className="text-xs text-gray-500 font-bold uppercase">A Pagar</p>
                                                     <p className="text-lg font-black text-gray-600">R$ 2.400,00</p>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {/* Agenda Mock Content */}
                             {activeMockup === 'Agenda' && (
                                 <div className="h-full flex flex-col">
                                     <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-800">Agenda</h2>
                                            <p className="text-sm text-gray-500">Gerencie agenda da sua clínica.</p>
                                        </div>
                                        <Bell className="text-gray-400" />
                                     </div>

                                     <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-wrap items-center gap-3">
                                         <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg border">
                                             <button className="p-1.5 hover:bg-white rounded-md text-gray-500"><ChevronLeft size={16}/></button>
                                             <span className="text-sm font-bold text-gray-700 px-2">Outubro 2025</span>
                                             <button className="p-1.5 hover:bg-white rounded-md text-gray-500"><ChevronRight size={16}/></button>
                                         </div>
                                         <button className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-md">Hoje</button>
                                         <div className="flex-1"></div>
                                         <button className="bg-primary text-white text-sm font-bold px-3 py-2 rounded-lg flex items-center"><Plus size={16} className="mr-1"/> Novo Agendamento</button>
                                     </div>

                                     <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
                                         <div className="p-4 border-b border-gray-100 flex gap-2 overflow-x-auto">
                                             <div className="flex items-center text-xs text-gray-500 font-bold mb-2 w-full"><Filter size={14} className="mr-1"/> Filtros Avançados:</div>
                                         </div>
                                         <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                                                    <tr>
                                                        <th className="px-4 py-3">Data</th>
                                                        <th className="px-4 py-3">Horário</th>
                                                        <th className="px-4 py-3">Paciente</th>
                                                        <th className="px-4 py-3">Dentista</th>
                                                        <th className="px-4 py-3">Status</th>
                                                        <th className="px-4 py-3">Pagamento</th>
                                                        <th className="px-4 py-3 text-right">Valor (R$)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {[
                                                        { date: '10/10', time: '08:30', name: 'Mariana Oliveira', service: 'Consulta Geral', dentist: 'Dr. Lucas', status: 'AGENDADO', pay: 'PENDENTE', val: '0' },
                                                        { date: '10/10', time: '09:30', name: 'Ricardo Souza', service: 'Limpeza', dentist: 'Dr. Lucas', status: 'AGENDADO', pay: 'PENDENTE', val: '0' },
                                                        { date: '11/10', time: '08:30', name: 'Amanda Nunes', service: 'Avaliação', dentist: 'Dr. Lucas', status: 'AGENDADO', pay: 'PENDENTE', val: '0' },
                                                        { date: '11/10', time: '09:30', name: 'Carlos Silva', service: 'Canal', dentist: 'Dr. Lucas', status: 'AGENDADO', pay: 'PENDENTE', val: '350' },
                                                    ].map((row, i) => (
                                                        <tr key={i} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 font-bold text-gray-700">{row.date}</td>
                                                            <td className="px-4 py-3 text-gray-500">{row.time}</td>
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-gray-800">{row.name}</div>
                                                                <div className="text-xs text-gray-400">{row.service}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400"></div>{row.dentist}</td>
                                                            <td className="px-4 py-3"><span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">{row.status}</span></td>
                                                            <td className="px-4 py-3"><span className="text-[10px] font-bold bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-100">{row.pay}</span></td>
                                                            <td className="px-4 py-3 text-right font-bold text-gray-700">{row.val}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {/* Default Placeholder for other tabs */}
                             {activeMockup !== 'Visão Geral' && activeMockup !== 'Agenda' && (
                                 <div className="flex items-center justify-center h-full text-gray-300 flex-col">
                                     <Settings size={48} className="mb-4 opacity-20"/>
                                     <p className="text-sm">Conteúdo demonstrativo de {activeMockup}</p>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Device Icons Selector */}
          <div className="flex items-center justify-center gap-8 mt-12">
              <button onClick={() => setDevice('mobile')} className={`flex flex-col items-center gap-2 transition duration-300 group ${device === 'mobile' ? 'text-primary scale-110' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Smartphone size={32} strokeWidth={device === 'mobile' ? 2 : 1.5} className="transition-all" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Celular</span>
              </button>
              <div className="w-px h-8 bg-gray-200"></div>
              <button onClick={() => setDevice('tablet')} className={`flex flex-col items-center gap-2 transition duration-300 group ${device === 'tablet' ? 'text-primary scale-110' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Tablet size={32} strokeWidth={device === 'tablet' ? 2 : 1.5} className="transition-all" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Tablet</span>
              </button>
              <div className="w-px h-8 bg-gray-200"></div>
              <button onClick={() => setDevice('desktop')} className={`flex flex-col items-center gap-2 transition duration-300 group ${device === 'desktop' ? 'text-primary scale-110' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Monitor size={32} strokeWidth={device === 'desktop' ? 2 : 1.5} className="transition-all" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Computador</span>
              </button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Tudo o que você precisa</h2>
            <p className="mt-4 text-gray-600">Funcionalidades essenciais para o dia a dia da sua clínica.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition group">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform"><Calendar size={32} /></div>
              <h3 className="text-xl font-bold mb-3">Agenda Inteligente</h3>
              <p className="text-gray-600">Visualize seus compromissos, bloqueie horários e receba solicitações de agendamento online.</p>
            </div>
            
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition group">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform"><Mic size={32} /></div>
              <h3 className="text-xl font-bold mb-3">Prontuário com IA</h3>
              <p className="text-gray-600">Grave o áudio da consulta e deixe nossa IA transcrever e gerar o resumo clínico automaticamente.</p>
            </div>

            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition group">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform"><DollarSign size={32} /></div>
              <h3 className="text-xl font-bold mb-3">Gestão Financeira</h3>
              <p className="text-gray-600">Controle receitas e despesas, fluxo de caixa e emissão de recibos de forma simples.</p>
            </div>

            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition group">
              <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 mb-6 group-hover:scale-110 transition-transform"><BellRing size={32} /></div>
              <h3 className="text-xl font-bold mb-3">Lembretes Automáticos</h3>
              <p className="text-gray-600">Reduza faltas com lembretes automáticos enviados por e-mail 24h antes da consulta.</p>
            </div>

            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition group">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center text-red-600 mb-6 group-hover:scale-110 transition-transform"><Send size={32} /></div>
              <h3 className="text-xl font-bold mb-3">Marketing de Retorno</h3>
              <p className="text-gray-600">Identifique pacientes inativos e envie campanhas de e-mail em massa para trazê-los de volta.</p>
            </div>

            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition group">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform"><Lock size={32} /></div>
              <h3 className="text-xl font-bold mb-3">Gestão e Acessos</h3>
              <p className="text-gray-600">Gerencie pacientes, dentistas e defina exatamente o que cada usuário pode acessar no sistema.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 bg-gray-50" id="plans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Planos Transparentes</h2>
            <p className="mt-4 text-gray-600">Cresça no seu ritmo. Comece pequeno, sonhe grande.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 relative flex flex-col hover:border-primary transition-colors">
              <h3 className="text-lg font-bold text-gray-900">Gratuito</h3>
              <p className="text-4xl font-black mt-4 mb-6">R$ 0 <span className="text-base font-normal text-gray-500">/mês</span></p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-gray-600"><CheckCircle size={18} className="text-green-500 mr-2" /> Até 1 Dentista</li>
                <li className="flex items-center text-gray-600"><CheckCircle size={18} className="text-green-500 mr-2" /> Até 30 Pacientes</li>
                <li className="flex items-center text-gray-600"><CheckCircle size={18} className="text-green-500 mr-2" /> Prontuário IA (3 usos)</li>
              </ul>
              <button onClick={() => goToAuth('signup')} className="w-full py-3 rounded-lg border-2 border-primary text-primary font-bold hover:bg-blue-50 transition">Começar Grátis</button>
            </div>

            {/* Starter */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-primary p-8 relative flex flex-col transform md:-translate-y-4">
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">MAIS POPULAR</div>
              <h3 className="text-lg font-bold text-primary">Starter</h3>
              <p className="text-4xl font-black mt-4 mb-6">R$ 100 <span className="text-base font-normal text-gray-500">/mês</span></p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-gray-600"><CheckCircle size={18} className="text-green-500 mr-2" /> Até 3 Dentistas</li>
                <li className="flex items-center text-gray-600"><CheckCircle size={18} className="text-green-500 mr-2" /> Até 100 Pacientes</li>
                <li className="flex items-center text-gray-600"><CheckCircle size={18} className="text-green-500 mr-2" /> Prontuário IA (5 usos/dia)</li>
              </ul>
              <button onClick={() => goToAuth('signup')} className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-sky-600 transition shadow-lg">Assinar Agora</button>
            </div>

            {/* Pro */}
            <div className="bg-gray-900 rounded-2xl shadow-sm p-8 relative flex flex-col text-white">
              <h3 className="text-lg font-bold text-white">Pro</h3>
              <p className="text-4xl font-black mt-4 mb-6">R$ 300 <span className="text-base font-normal text-gray-400">/mês</span></p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-green-400 mr-2" /> Dentistas Ilimitados</li>
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-green-400 mr-2" /> Pacientes Ilimitados</li>
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-green-400 mr-2" /> Prontuário IA Ilimitado</li>
                <li className="flex items-center text-gray-300"><Folder size={18} className="text-green-400 mr-2" /> Arquivos (100MB/paciente)</li>
              </ul>
              <button onClick={() => goToAuth('signup')} className="w-full py-3 rounded-lg bg-white text-gray-900 font-bold hover:bg-gray-100 transition">Assinar Pro</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 text-primary font-bold text-xl mb-4">
            <Smile size={24} />
            <span>DentiHub</span>
          </div>
          <p className="text-gray-500 text-sm mb-2">© {new Date().getFullYear()} DentiHub. Todos os direitos reservados.</p>
          <p className="text-gray-500 text-sm">Contato: <a href="mailto:contato@dentihub.com.br" className="hover:text-primary transition-colors">contato@dentihub.com.br</a></p>
        </div>
      </footer>

      {/* LEAD CAPTURE MODAL */}
      {showLeadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative transform transition-all scale-100 animate-fade-in-up">
            <button onClick={closeLeadModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
              <X size={24} />
            </button>
            
            <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white text-center">
              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Gift size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Ofertas Exclusivas!</h3>
              <p className="text-blue-100 text-sm">Cadastre-se para receber novidades, dicas de gestão e promoções especiais do DentiHub.</p>
            </div>

            <div className="p-8">
              {leadStatus === 'success' ? (
                <div className="text-center py-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">Inscrição Confirmada!</h4>
                  <p className="text-gray-500 text-sm mt-2">Obrigado por se juntar a nós.</p>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Seu melhor e-mail</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input 
                        type="email" 
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="doutor@exemplo.com"
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={leadStatus === 'loading'}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-sky-600 transition shadow-lg shadow-primary/20 flex items-center justify-center"
                  >
                    {leadStatus === 'loading' ? <Loader2 className="animate-spin" size={20} /> : 'Quero receber novidades'}
                  </button>
                  
                  <p className="text-xs text-gray-400 text-center mt-4">
                    Respeitamos sua privacidade. Cancele a qualquer momento.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;