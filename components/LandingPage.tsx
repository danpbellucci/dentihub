
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';
import { 
  Calendar, Users, DollarSign, CheckCircle, ShieldCheck, Zap, Search, Mic, 
  Smartphone, Tablet, Monitor, LayoutDashboard, BellRing,
  UserCheck, MessageSquare, Mail, Gift, Menu, X, Check, Loader2,
  TrendingUp, TrendingDown, Filter, ArrowRight, Lock, Image as ImageIcon,
  ChevronLeft, ChevronRight, Plus, Folder, Brain, Clock, MoreHorizontal, FileText, Trash2,
  BookOpen, Settings, HelpCircle, AlertTriangle
} from 'lucide-react';
import Toast, { ToastType } from './Toast';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMockup, setActiveMockup] = useState('Visão Geral');
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>(
      typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'
  );
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadStatus, setLeadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mockupMobileMenuOpen, setMockupMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 768 && device !== 'mobile') setDevice('mobile');
        if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !localStorage.getItem('denti_lead_popup_shown')) {
          setShowLeadModal(true);
          localStorage.setItem('denti_lead_popup_shown', 'true');
        }
      },
      { threshold: 0.1 }
    );

    const plansEndElement = document.getElementById('plans-end-trigger');
    if (plansEndElement) {
      observer.observe(plansEndElement);
    }

    // --- LÓGICA DE UNSUBSCRIBE ---
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    const emailParam = params.get('email');

    if (action === 'unsubscribe' && emailParam) {
        handleUnsubscribe(emailParam);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (plansEndElement) observer.unobserve(plansEndElement);
    };
  }, [device, location]);

  const handleUnsubscribe = async (email: string) => {
      try {
          const { error } = await supabase.functions.invoke('manage-leads', {
              body: { type: 'unsubscribe', email }
          });
          if (error) throw error;
          setToast({ message: "Você foi descadastrado da nossa lista de e-mails com sucesso.", type: 'success' });
          window.history.replaceState({}, document.title, "/");
      } catch (err) {
          console.error(err);
          setToast({ message: "Erro ao processar descadastro.", type: 'error' });
      }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail) return;

    setLeadStatus('loading');
    try {
      // 1. Salva no Banco de Dados
      const { error } = await supabase.from('leads').insert({ email: leadEmail });
      if (error) throw error;

      // 2. Chama Edge Function
      supabase.functions.invoke('manage-leads', {
          body: { type: 'welcome_lead', email: leadEmail }
      }).catch(console.error);

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

  const scrollToPlans = () => {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
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
    { label: 'Solicitações', icon: BellRing, badge: 2 },
    { label: 'Guia Prático', icon: BookOpen },
    { label: 'Configurações', icon: Settings },
  ];

  const SparklesIcon = ({ size = 20 }: { size?: number }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.39 9.39L22 12L14.39 14.61L12 22L9.61 14.61L2 12L9.61 9.39L12 2Z" />
      </svg>
  );

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white overflow-x-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 hidden md:block">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      {/* HEADER */}
      <header className="fixed w-full top-0 z-50 border-b border-white/5 bg-gray-950/90 backdrop-blur-md supports-[backdrop-filter]:bg-gray-950/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-white font-bold text-2xl cursor-pointer hover:opacity-80 transition" onClick={() => navigate('/')}>
              <Logo className="w-8 h-8" />
              <span className="tracking-tight">
                Denti<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hub</span>
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium text-gray-300 hover:text-white transition">Recursos</button>
              <button onClick={scrollToPlans} className="text-sm font-medium text-gray-300 hover:text-white transition">Preços</button>
              <button onClick={() => navigate('/entenda')} className="text-sm font-medium text-gray-300 hover:text-white transition">Como Funciona</button>
              
              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                <button onClick={() => navigate('/encontrar-clinica')} className="text-sm font-medium text-gray-300 hover:text-white transition flex items-center gap-2">
                    <Search size={16}/> Buscar Clínica
                </button>
                <button onClick={() => goToAuth('login')} className="text-sm font-bold text-white hover:text-purple-400 transition">Entrar</button>
                <button onClick={() => goToAuth('signup')} className="bg-white text-gray-900 px-5 py-2 rounded-full font-bold hover:bg-gray-100 transition shadow-[0_0_20px_rgba(255,255,255,0.3)] text-sm">
                    Começar Grátis
                </button>
              </div>
            </div>

            <div className="md:hidden flex items-center gap-4">
                <button onClick={() => goToAuth('login')} className="text-sm font-bold text-white hover:text-purple-400 transition">Entrar</button>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-300 hover:text-white p-1">
                    {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 w-full bg-gray-950 border-b border-white/10 shadow-2xl animate-fade-in-down">
                <div className="flex flex-col p-4 space-y-4">
                    <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5">Recursos</button>
                    <button onClick={scrollToPlans} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5">Preços</button>
                    <button onClick={() => { navigate('/entenda'); setMobileMenuOpen(false); }} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5">Como Funciona</button>
                    <button onClick={() => { navigate('/encontrar-clinica'); setMobileMenuOpen(false); }} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5 flex items-center gap-2"><Search size={16}/> Buscar Clínica</button>
                    <button onClick={() => { goToAuth('signup'); setMobileMenuOpen(false); }} className="bg-white text-gray-900 py-3 rounded-lg font-bold text-center mt-2 shadow-lg">Começar Grátis</button>
                </div>
            </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm text-purple-300 font-medium text-sm mb-8 animate-fade-in-up hover:bg-white/10 transition cursor-default">
            <SparklesIcon /> <span className="text-gray-200">Novo:</span> Prontuário com IA Generativa
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight mb-8 leading-tight max-w-5xl mx-auto drop-shadow-2xl will-change-transform">
            O Sistema Operacional <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient-x">
              do Futuro para Dentistas
            </span>
          </h1>
          
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400 mb-12 leading-relaxed">
            Abandone o papel e os sistemas do passado. Experimente a gestão com inteligência artificial, 
            agendamento online e marketing automático em uma interface que você vai amar usar.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
            <button onClick={() => goToAuth('signup')} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-500 transition shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 group">
              Criar Conta Gratuita <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => document.getElementById('ai-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition flex items-center justify-center gap-2 backdrop-blur-sm">
              <Mic size={20} className="text-purple-400"/> Ver a IA em ação
            </button>
          </div>

          {/* MOCKUP INTERATIVO */}
          <div className="relative mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-up delay-200 flex flex-col items-center">
            
            <div className="flex items-center justify-center gap-4 mb-8 p-1.5 bg-gray-900/80 backdrop-blur rounded-full border border-white/10 shadow-xl w-fit">
                <button onClick={() => setDevice('mobile')} className={`p-2 rounded-full transition ${device === 'mobile' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Smartphone size={18} /></button>
                <button onClick={() => setDevice('tablet')} className={`p-2 rounded-full transition ${device === 'tablet' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Tablet size={18} /></button>
                <button onClick={() => setDevice('desktop')} className={`p-2 rounded-full transition ${device === 'desktop' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Monitor size={18} /></button>
            </div>

            <div className={`transition-all duration-700 ease-in-out relative bg-gray-950 shadow-2xl overflow-hidden group border border-white/10
                    ${device === 'desktop' ? 'w-full max-w-5xl rounded-xl h-[600px] hover:shadow-[0_0_50px_rgba(124,58,237,0.2)]' : ''}
                    ${device === 'tablet' ? 'w-[500px] h-[700px] rounded-[2rem] border-[8px] border-gray-800 ring-1 ring-white/10' : ''}
                    ${device === 'mobile' ? 'w-[320px] h-[650px] rounded-[3rem] border-[8px] border-gray-800 ring-1 ring-white/10' : ''}
                `}>
                
                {device === 'desktop' && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-950 border-b border-white/5">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                        </div>
                        <div className="mx-auto bg-gray-900 border border-white/5 rounded-md px-3 py-1 text-[10px] text-gray-500 font-mono w-full max-w-xs text-center flex items-center justify-center gap-1">
                            <Lock size={10} /> dentihub.com.br/dashboard
                        </div>
                    </div>
                )}

                <div className={`flex bg-gray-950 h-full relative text-left ${device === 'mobile' ? 'flex-col' : 'flex-row'}`}>
                    {/* Mockup Sidebar */}
                    <div className={`bg-gray-950 border-r border-white/5 flex-shrink-0 z-20 flex flex-col ${device === 'mobile' ? 'hidden' : 'w-56'}`}>
                        <div className="flex items-center gap-2 text-white font-bold p-4 border-b border-white/5">
                            <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-1 rounded"><Logo className="w-4 h-4 text-white" /></div> 
                            <span className="text-sm">DentiHub</span>
                        </div>
                        <div className="p-2 space-y-1 mt-2">
                            {mockupMenu.map(item => (
                                <button key={item.label} onClick={() => setActiveMockup(item.label)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${activeMockup === item.label ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                    <div className="relative">
                                        <item.icon size={16}/>
                                        {item.badge && <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full"></span>}
                                    </div>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div className="mt-auto p-4 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white">AS</div>
                                <div><p className="text-xs text-white font-bold">Dr. André Silva</p><p className="text-[10px] text-gray-500">Admin</p></div>
                            </div>
                        </div>
                    </div>

                    {/* Mockup Content Area */}
                    <div className="flex-1 bg-gray-950 overflow-y-auto custom-scrollbar relative flex flex-col">
                        
                        {/* Header Mobile dentro do Mockup */}
                        {device === 'mobile' && (
                            <div className="bg-gray-900 border-b border-white/5 p-4 flex items-center justify-between sticky top-0 z-30 shrink-0">
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-1 rounded"><Logo className="w-4 h-4 text-white" /></div>
                                    <span className="text-sm">DentiHub</span>
                                </div>
                                <button onClick={() => setMockupMobileMenuOpen(true)} className="text-gray-400 hover:text-white">
                                    <Menu size={24} />
                                </button>
                            </div>
                        )}

                        <div className="p-6">
                            {activeMockup === 'Visão Geral' && (
                                <div className="space-y-6 animate-fade-in">
                                    <h2 className="text-xl font-bold text-white mb-4">Visão Geral</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-2"><div className="p-2 bg-blue-500/10 rounded-lg"><Users size={20} className="text-blue-500"/></div></div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Pacientes</p>
                                            <p className="text-2xl font-black text-white">128</p>
                                        </div>
                                        <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-2"><div className="p-2 bg-green-500/10 rounded-lg"><Calendar size={20} className="text-green-500"/></div></div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Agendados Hoje</p>
                                            <p className="text-2xl font-black text-white">8</p>
                                        </div>
                                        <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-2"><div className="p-2 bg-yellow-500/10 rounded-lg"><DollarSign size={20} className="text-yellow-500"/></div></div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Receita (Mês)</p>
                                            <p className="text-2xl font-black text-white">R$ 15.450,00</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-900/60 border border-white/5 rounded-xl p-4 h-64">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-white text-sm flex items-center"><Clock size={16} className="mr-2 text-primary"/> Próximos Agendamentos</h3>
                                            <span className="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-400">Rolar para ver mais</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-center bg-gray-800 border border-white/10 rounded px-2 py-1"><p className="text-[9px] text-gray-400 uppercase">HOJE</p><p className="text-sm font-black text-white">14</p></div>
                                                    <div><p className="font-bold text-white text-sm">Mariana Souza</p><div className="flex items-center gap-2"><span className="text-[10px] font-mono text-gray-300 bg-gray-700/50 px-1 rounded">14:00</span><span className="text-[10px] text-gray-500">Limpeza</span></div></div>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-center bg-gray-800 border border-white/10 rounded px-2 py-1"><p className="text-[9px] text-gray-400 uppercase">HOJE</p><p className="text-sm font-black text-white">14</p></div>
                                                    <div><p className="font-bold text-white text-sm">Carlos Pereira</p><div className="flex items-center gap-2"><span className="text-[10px] font-mono text-gray-300 bg-gray-700/50 px-1 rounded">15:30</span><span className="text-[10px] text-gray-500">Avaliação</span></div></div>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {activeMockup === 'Agenda' && (
                                <div className="space-y-4 animate-fade-in h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <h2 className="text-lg font-bold text-white">Agenda</h2>
                                        <button className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center shadow-lg shadow-blue-900/20">
                                            <Plus size={14} className="mr-1"/> Novo
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-900 p-2 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-2 text-gray-400"><ChevronLeft size={16}/><span className="text-white font-bold text-sm">Outubro 2026</span><ChevronRight size={16}/></div>
                                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Hoje</span>
                                    </div>
                                    <div className="flex-1 bg-gray-900/50 border border-white/5 rounded-lg overflow-hidden flex flex-col">
                                        <div className="grid grid-cols-4 bg-gray-800/50 p-2 text-[10px] font-bold text-gray-500 uppercase">
                                            <div>Horário</div>
                                            <div className="col-span-2">Paciente</div>
                                            <div className="text-right">Status</div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                            {[
                                                { time: '09:00', name: 'João Silva', proc: 'Avaliação', status: 'Confirmado', color: 'text-green-400' },
                                                { time: '10:00', name: 'Maria Souza', proc: 'Limpeza', status: 'Agendado', color: 'text-blue-400' },
                                                { time: '11:00', name: 'Pedro Santos', proc: 'Canal', status: 'Em andamento', color: 'text-yellow-400' },
                                                { time: '14:00', name: 'Ana Costa', proc: 'Clareamento', status: 'Agendado', color: 'text-blue-400' },
                                            ].map((item, i) => (
                                                <div key={i} className="grid grid-cols-4 items-center bg-gray-800/30 p-2 rounded border border-white/5 hover:bg-gray-800 transition">
                                                    <div className="font-mono text-xs text-gray-300">{item.time}</div>
                                                    <div className="col-span-2">
                                                        <div className="text-xs font-bold text-white">{item.name}</div>
                                                        <div className="text-[10px] text-gray-500">{item.proc}</div>
                                                    </div>
                                                    <div className={`text-[10px] font-bold text-right ${item.color}`}>{item.status}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeMockup === 'Pacientes' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-bold text-white">Pacientes</h2>
                                        <button className="bg-primary text-white text-xs px-3 py-1.5 rounded font-bold flex items-center"><Plus size={14} className="mr-1"/> Novo</button>
                                    </div>
                                    <div className="bg-gray-900 border border-white/5 p-2 rounded-lg flex items-center text-gray-400 text-sm">
                                        <Search size={16} className="mr-2 ml-1"/> <span className="opacity-50">Buscar por nome ou CPF...</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="bg-gray-900/60 border border-white/5 p-3 rounded-lg flex justify-between items-center group hover:border-white/10 transition">
                                            <div>
                                                <p className="font-bold text-white text-sm">Mariana Souza</p>
                                                <p className="text-[10px] text-gray-500">(11) 99999-0000 | 123.456.789-00</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-1.5 bg-gray-800 rounded border border-white/5 text-gray-400 hover:text-purple-400"><FileText size={14}/></button>
                                                <button className="p-1.5 bg-gray-800 rounded border border-white/5 text-gray-400 hover:text-yellow-400"><Folder size={14}/></button>
                                            </div>
                                        </div>
                                        <div className="bg-gray-900/60 border border-white/5 p-3 rounded-lg flex justify-between items-center group hover:border-white/10 transition">
                                            <div>
                                                <p className="font-bold text-white text-sm">Carlos Pereira</p>
                                                <p className="text-[10px] text-gray-500">(11) 98888-1111 | 987.654.321-99</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-1.5 bg-gray-800 rounded border border-white/5 text-gray-400 hover:text-purple-400"><FileText size={14}/></button>
                                                <button className="p-1.5 bg-gray-800 rounded border border-white/5 text-gray-400 hover:text-yellow-400"><Folder size={14}/></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeMockup === 'Dentistas' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-bold text-white">Dentistas</h2>
                                        <button className="bg-primary text-white text-xs px-3 py-1.5 rounded font-bold flex items-center"><Plus size={14} className="mr-1"/> Novo</button>
                                    </div>
                                    <div className="bg-gray-900 border border-white/5 p-2 rounded-lg flex items-center text-gray-400 text-sm">
                                        <Search size={16} className="mr-2 ml-1"/> <span className="opacity-50">Buscar por nome...</span>
                                    </div>
                                    <div className="bg-gray-900/60 border border-white/5 p-4 rounded-lg relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-400 border border-white/10">F</div>
                                            <div><p className="text-sm font-bold text-white">Dra. Fernanda</p><p className="text-[10px] text-gray-500">CRO: 12345</p></div>
                                        </div>
                                        <div className="flex gap-1 mb-3"><span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-white/10">ORTODONTIA</span></div>
                                        <div className="flex justify-end gap-2 border-t border-white/5 pt-2">
                                            <button className="text-[10px] font-bold text-blue-400 hover:bg-blue-500/10 px-2 py-1 rounded">Editar</button>
                                            <button className="text-[10px] font-bold text-red-400 hover:bg-red-500/10 px-2 py-1 rounded">Excluir</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeMockup === 'Prontuário IA' && (
                                <div className="space-y-6 animate-fade-in h-full flex flex-col items-center justify-center text-center">
                                    <div className="w-full bg-blue-900/20 border border-blue-500/20 p-3 rounded-lg text-left mb-auto w-full">
                                        <p className="text-xs text-blue-300 font-bold flex items-center"><Zap size={12} className="mr-1"/> Plano Gratuito</p>
                                        <p className="text-[10px] text-blue-400">Restam 3 usos no plano Gratuito. Duração máx: 5 minutos.</p>
                                    </div>
                                    
                                    <div className="w-full max-w-sm space-y-3">
                                        <div className="bg-gray-800 border border-gray-700 p-2 rounded text-left text-xs text-gray-300">Paciente: <strong>Mariana Souza</strong></div>
                                        <div className="bg-gray-800 border border-gray-700 p-2 rounded text-left text-xs text-gray-300">Dentista: <strong>Dr. André Silva</strong></div>
                                    </div>

                                    <div className="my-8 relative group cursor-pointer">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition"></div>
                                        <div className="relative w-20 h-20 bg-gray-800 border-2 border-dashed border-gray-600 rounded-full flex items-center justify-center text-gray-400 group-hover:border-primary group-hover:text-primary transition">
                                            <Mic size={32} />
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500">Clique para gravar a evolução clínica</p>
                                </div>
                            )}

                            {activeMockup === 'Mensageria' && (
                                <div className="space-y-4 animate-fade-in">
                                    <h2 className="text-xl font-bold text-white mb-4">Central de Mensagens</h2>
                                    <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-bold text-blue-300 flex items-center"><Zap size={12} className="mr-1 text-yellow-400"/> Envios Automáticos</p>
                                            <p className="text-[10px] text-blue-400">Verificação diária da agenda ativa.</p>
                                        </div>
                                        <span className="text-[9px] bg-green-900/30 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">Ativo</span>
                                    </div>
                                    <div className="bg-gray-900/60 border border-white/5 rounded-xl overflow-hidden">
                                        <div className="px-3 py-2 bg-gray-800/50 text-[10px] font-bold text-gray-500 uppercase">Últimos Envios</div>
                                        <div className="divide-y divide-white/5">
                                            {[
                                                { to: 'João Santos', type: 'Lembrete (24h)', time: '15:00', status: 'Enviado' },
                                                { to: 'Ana Costa', type: 'Lembrete (24h)', time: '14:00', status: 'Enviado' },
                                                { to: 'Dr. André Silva', type: 'Agenda Diária', time: '08:00', status: 'Enviado' },
                                            ].map((msg, i) => (
                                                <div key={i} className="p-3 flex justify-between items-center text-xs">
                                                    <div><p className="text-white font-bold">{msg.to}</p><p className="text-gray-500">{msg.type}</p></div>
                                                    <div className="text-right"><span className="text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-500/20 flex items-center text-[9px] font-bold"><Check size={8} className="mr-1"/> {msg.status}</span><p className="text-[9px] text-gray-600 mt-1">{msg.time}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeMockup === 'Financeiro' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-bold text-white">Fluxo de Caixa</h2>
                                        <button className="bg-primary text-white text-xs px-3 py-1.5 rounded font-bold flex items-center"><Plus size={14} className="mr-1"/> Transação</button>
                                    </div>
                                    <div className="bg-gray-900/60 border border-green-500/30 p-4 rounded-xl">
                                        <p className="text-xs text-green-400 uppercase font-bold">Saldo (Período)</p>
                                        <p className="text-2xl font-black text-green-500">R$ +4.200,00</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center p-3 bg-gray-800/40 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-green-500/10 rounded text-green-500"><TrendingUp size={14}/></div>
                                                <div><p className="text-xs font-bold text-white">Consulta Particular</p><p className="text-[10px] text-gray-500">15/10/2026</p></div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-green-500">R$ 250,00</p>
                                                <span className="text-[9px] bg-green-900/30 text-green-400 px-1.5 rounded border border-green-500/20">RECEBIDO</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-800/40 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-red-500/10 rounded text-red-500"><TrendingDown size={14}/></div>
                                                <div><p className="text-xs font-bold text-white">Aluguel Sala</p><p className="text-[10px] text-gray-500">10/10/2026</p></div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-red-500">R$ 1.500,00</p>
                                                <span className="text-[9px] bg-red-900/30 text-red-400 px-1.5 rounded border border-red-500/20">PAGO</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeMockup === 'Solicitações' && (
                                <div className="space-y-4 animate-fade-in">
                                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">Solicitações <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">2</span></h2>
                                    <div className="bg-gray-900/60 border border-white/5 rounded-xl overflow-hidden">
                                        <div className="p-4 border-b border-white/5 flex flex-col gap-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-white font-bold text-sm">Lucas Martins <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded ml-2">Novo Paciente</span></p>
                                                    <p className="text-gray-400 text-xs mt-1">Quer agendar: <strong>Avaliação</strong></p>
                                                </div>
                                                <div className="bg-blue-900/20 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/20 flex items-center">
                                                    <Clock size={12} className="mr-1"/> Amanhã 15:00
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button className="flex-1 bg-green-600/20 text-green-400 border border-green-500/20 py-1.5 rounded text-xs font-bold hover:bg-green-600/30 transition">Aceitar</button>
                                                <button className="flex-1 bg-red-600/20 text-red-400 border border-red-500/20 py-1.5 rounded text-xs font-bold hover:bg-red-600/30 transition">Recusar</button>
                                            </div>
                                        </div>
                                        <div className="p-4 flex flex-col gap-2 opacity-60">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-white font-bold text-sm">Ana Costa</p>
                                                    <p className="text-gray-400 text-xs mt-1">Quer agendar: <strong>Limpeza</strong></p>
                                                </div>
                                                <div className="bg-blue-900/20 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/20 flex items-center">
                                                    <Clock size={12} className="mr-1"/> 20/10 09:00
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeMockup === 'Guia Prático' && (
                                <div className="space-y-4 animate-fade-in">
                                    <h2 className="text-xl font-bold text-white mb-4">Guia Prático</h2>
                                    <div className="space-y-3">
                                        <div className="bg-gray-800/50 border border-white/5 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-800 transition">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Calendar size={16}/></div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">Como configurar a Agenda?</p>
                                                    <p className="text-[10px] text-gray-500">3 passos simples</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-500"/>
                                        </div>
                                        <div className="bg-gray-800/50 border border-white/5 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-800 transition">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Mic size={16}/></div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">Usando a IA no Prontuário</p>
                                                    <p className="text-[10px] text-gray-500">Tutorial rápido</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-500"/>
                                        </div>
                                    </div>
                                    <div className="mt-4 bg-blue-900/20 border border-blue-500/20 p-4 rounded-lg text-center">
                                        <p className="text-xs text-blue-300 font-bold mb-2">Precisa de ajuda?</p>
                                        <button className="bg-blue-600 text-white text-xs px-4 py-2 rounded font-bold hover:bg-blue-500 transition">Falar com Suporte</button>
                                    </div>
                                </div>
                            )}

                            {activeMockup === 'Configurações' && (
                                <div className="space-y-6 animate-fade-in">
                                    <h2 className="text-xl font-bold text-white mb-4">Configurações</h2>
                                    <div className="bg-gray-900/60 border border-white/5 p-4 rounded-xl">
                                        <div className="flex gap-4 border-b border-white/5 pb-4 mb-4 overflow-x-auto">
                                            <button className="text-xs font-bold text-primary border-b-2 border-primary pb-1">Perfil da Clínica</button>
                                            <button className="text-xs font-bold text-gray-500 hover:text-white pb-1">Equipe</button>
                                            <button className="text-xs font-bold text-gray-500 hover:text-white pb-1">Planos</button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Nome da Clínica</label>
                                                <input type="text" value="Clínica Odonto Vida" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" readOnly/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Endereço</label>
                                                <input type="text" value="Av. Paulista, 1000 - SP" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" readOnly/>
                                            </div>
                                            <button className="w-full bg-primary text-white py-2 rounded text-sm font-bold mt-2">Salvar Alterações</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Mobile Menu Overlay Mockup */}
                        {device === 'mobile' && mockupMobileMenuOpen && (
                           <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur flex flex-col p-4 animate-fade-in">
                              <div className="flex justify-between items-center mb-6">
                                  <span className="text-white font-bold text-lg">Menu</span>
                                  <button onClick={() => setMockupMobileMenuOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                              </div>
                              <div className="space-y-2 overflow-y-auto">
                                  {mockupMenu.map(item => (
                                      <button 
                                          key={item.label} 
                                          onClick={() => { setActiveMockup(item.label); setMockupMobileMenuOpen(false); }} 
                                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeMockup === item.label ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}`}
                                      >
                                          <div className="relative">
                                              <item.icon size={18}/>
                                              {item.badge && <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full"></span>}
                                          </div>
                                          {item.label}
                                      </button>
                                  ))}
                              </div>
                           </div>
                        )}

                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO DEMO SECTION */}
      <section id="ai-section" className="py-32 relative z-10 border-t border-white/5 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase mb-6 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                        <Brain size={14} /> Diferencial Competitivo
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight text-white">
                        Prontuário com <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Inteligência Artificial</span>
                    </h2>
                    <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                        Esqueça a digitação interminável após cada consulta. Com o DentiHub, você apenas <strong>fala o que fez</strong> e nossa IA transcreve, organiza e estrutura o resumo clínico automaticamente.
                    </p>
                    
                    <ul className="space-y-4 mb-10">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-green-500/20 rounded text-green-400 border border-green-500/20"><Check size={16}/></div>
                            <div>
                                <strong className="block text-white">Transcrição de Voz para Texto</strong>
                                <span className="text-sm text-gray-500">Não tire as luvas. Apenas dite e o sistema escreve.</span>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-green-500/20 rounded text-green-400 border border-green-500/20"><Check size={16}/></div>
                            <div>
                                <strong className="block text-white">Formato SOAP Automático</strong>
                                <span className="text-sm text-gray-500">A IA organiza em Subjetivo, Objetivo, Avaliação e Plano.</span>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-green-500/20 rounded text-green-400 border border-green-500/20"><Check size={16}/></div>
                            <div>
                                <strong className="block text-white">Histórico Seguro</strong>
                                <span className="text-sm text-gray-500">Tudo salvo na nuvem com data e hora.</span>
                            </div>
                        </li>
                    </ul>

                    <button onClick={() => goToAuth('signup')} className="bg-white text-gray-900 px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition shadow-lg shadow-white/10">
                        Quero testar a IA
                    </button>
                </div>

                {/* AI Visual */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                        
                        {/* Fake Audio Wave */}
                        <div className="flex items-center justify-center gap-1 h-12 mb-8 mt-2">
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-pulse" style={{ height: Math.random() * 40 + 10 + 'px', animationDuration: Math.random() * 0.5 + 0.5 + 's' }}></div>
                            ))}
                        </div>

                        {/* SOAP Preview */}
                        <div className="space-y-3 font-mono text-sm">
                            <div className="p-4 bg-gray-800/50 rounded-lg border border-white/5 hover:border-purple-500/30 transition">
                                <span className="text-purple-400 font-bold block mb-1">S (Subjetivo)</span>
                                <span className="text-gray-400">Paciente relatou sensibilidade no dente 26 ao tomar água gelada.</span>
                            </div>
                            <div className="p-4 bg-gray-800/50 rounded-lg border border-white/5 hover:border-purple-500/30 transition">
                                <span className="text-purple-400 font-bold block mb-1">O (Objetivo)</span>
                                <span className="text-gray-400">Exame clínico revelou retração gengival. Sem cáries visíveis.</span>
                            </div>
                            <div className="p-4 bg-gray-800/50 rounded-lg border border-white/5 hover:border-purple-500/30 transition">
                                <span className="text-purple-400 font-bold block mb-1">A (Avaliação)</span>
                                <span className="text-gray-400">Hipersensibilidade dentinária.</span>
                            </div>
                            <div className="p-4 bg-gray-800/50 rounded-lg border border-white/5 hover:border-purple-500/30 transition">
                                <span className="text-purple-400 font-bold block mb-1">P (Plano)</span>
                                <span className="text-gray-400">Aplicação de dessensibilizante e orientação de escovação.</span>
                            </div>
                        </div>

                        <div className="absolute bottom-4 right-4 text-purple-500/10 pointer-events-none">
                            <SparklesIcon size={120} />
                        </div>
                    </div>
                </div>
            </div>

            {/* VIDEO DEMO SECTION */}
            <div className="mt-16 max-w-4xl mx-auto">
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative bg-gray-900 group">
                    <div className="absolute inset-0 bg-purple-600/20 blur-3xl opacity-20 group-hover:opacity-30 transition duration-1000 pointer-events-none"></div>
                    <iframe 
                        className="w-full h-full relative z-10"
                        src="https://www.youtube.com/embed/hQmUia6y7vg?rel=0" 
                        title="DentiHub AI Demo"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                </div>
                <p className="text-center text-gray-500 text-sm mt-4">Veja a Inteligência Artificial criando um prontuário em tempo real.</p>
            </div>
        </div>
      </section>

      {/* REST OF SECTIONS (Features, Pricing, Footer) - KEPT IDENTICAL */}
      <section className="py-24 relative z-10" id="plans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">Planos Transparentes</h2>
            <p className="mt-4 text-gray-400">Comece grátis e cresça conforme sua clínica expande.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-gray-900/40 backdrop-blur rounded-2xl border border-white/5 p-8 relative flex flex-col hover:border-white/20 transition-colors">
              <h3 className="text-lg font-bold text-white">Gratuito</h3>
              <p className="text-4xl font-black mt-4 mb-6 text-white">R$ 0 <span className="text-base font-normal text-gray-500">/mês</span></p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-gray-400"><CheckCircle size={18} className="text-gray-600 mr-2" /> 1 Dentista</li>
                <li className="flex items-center text-gray-400"><CheckCircle size={18} className="text-gray-600 mr-2" /> Até 30 Pacientes</li>
                <li className="flex items-center text-gray-400"><CheckCircle size={18} className="text-gray-600 mr-2" /> Prontuário IA (3 usos totais)</li>
                <li className="flex items-center text-gray-400"><CheckCircle size={18} className="text-gray-600 mr-2" /> Agenda & Financeiro</li>
              </ul>
              <button onClick={() => goToAuth('signup')} className="w-full py-3 rounded-lg border border-white/20 text-white font-bold hover:bg-white/5 transition">Começar Grátis</button>
            </div>

            {/* Starter */}
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-blue-500/50 p-8 relative flex flex-col transform md:-translate-y-4 shadow-[0_0_30px_rgba(37,99,235,0.15)]">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">MAIS POPULAR</div>
              <h3 className="text-lg font-bold text-blue-400">Starter</h3>
              <p className="text-4xl font-black mt-4 mb-6 text-white">R$ 100 <span className="text-base font-normal text-gray-500">/mês</span></p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-blue-500 mr-2" /> Até 3 Dentistas</li>
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-blue-500 mr-2" /> Até 100 Pacientes</li>
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-blue-500 mr-2" /> Prontuário IA (5 usos/dia por dentista)</li>
              </ul>
              <button onClick={() => goToAuth('signup')} className="w-full py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-900/20">Assinar Agora</button>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-white/10 p-8 relative flex flex-col text-white">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Zap size={16} className="text-yellow-400 fill-yellow-400"/> Pro</h3>
              <p className="text-4xl font-black mt-4 mb-6">R$ 300 <span className="text-base font-normal text-gray-400">/mês</span></p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-green-400 mr-2" /> Até 5 Dentistas</li>
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-green-400 mr-2" /> Pacientes Ilimitados</li>
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-green-400 mr-2" /> Prontuário IA (10 usos/dia por dentista)</li>
              </ul>
              <button onClick={() => goToAuth('signup')} className="w-full py-3 rounded-lg bg-white text-gray-900 font-bold hover:bg-gray-100 transition">Assinar Pro</button>
            </div>
          </div>
        </div>
        
        <div id="plans-end-trigger" className="h-1 w-full pointer-events-none opacity-0"></div>
      </section>

      <footer className="bg-gray-950 py-12 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 text-white font-bold text-xl mb-4">
            <Logo className="w-6 h-6" />
            <span>Denti<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hub</span></span>
          </div>
          <p className="text-gray-500 text-sm mb-2">© {new Date().getFullYear()} DentiHub. Todos os direitos reservados.</p>
          <p className="text-gray-500 text-sm">Contato: <a href="mailto:contato@dentihub.com.br" className="hover:text-white transition-colors">contato@dentihub.com.br</a></p>
        </div>
      </footer>

      {/* LEAD CAPTURE MODAL */}
      {showLeadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative transform transition-all scale-100 animate-fade-in-up border border-white/10">
            <button onClick={closeLeadModal} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
              <X size={24} />
            </button>
            
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Gift size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Ofertas Exclusivas!</h3>
              <p className="text-blue-100 text-sm">Cadastre-se para receber novidades, dicas de gestão e promoções especiais do DentiHub.</p>
            </div>

            <div className="p-8">
              {leadStatus === 'success' ? (
                <div className="text-center py-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-500/20 mb-4">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Inscrição Confirmada!</h4>
                  <p className="text-gray-400 text-sm mt-2">Verifique seu e-mail para mais detalhes.</p>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">Seu melhor e-mail</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-500" />
                      </div>
                      <input 
                        type="email" 
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-500"
                        placeholder="doutor@exemplo.com"
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={leadStatus === 'loading'}
                    className="w-full bg-white text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-100 transition shadow-lg shadow-white/10 flex items-center justify-center"
                  >
                    {leadStatus === 'loading' ? <Loader2 className="animate-spin" size={20} /> : 'Quero receber novidades'}
                  </button>
                  
                  <p className="text-xs text-gray-500 text-center mt-4">
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
