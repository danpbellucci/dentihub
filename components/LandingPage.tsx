
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';
import { 
  Calendar, Users, DollarSign, CheckCircle, ShieldCheck, Zap, Search, Mic, 
  Smartphone, Tablet, Monitor, LayoutDashboard, BellRing,
  UserCheck, MessageSquare, Mail, Gift, Menu, X, Check, Loader2,
  TrendingUp, TrendingDown, Filter, ArrowRight, ArrowDown, Lock, Image as ImageIcon,
  ChevronLeft, ChevronRight, Plus, Folder, Brain, Clock, MoreHorizontal, FileText, Trash2,
  BookOpen, Settings, HelpCircle, AlertTriangle, Box, Cloud, Edit2, ArrowUpCircle, ArrowDownCircle, CreditCard,
  ChevronDown, Upload, User, RefreshCw, Save
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

  const features = [
    {
      id: 'agenda',
      title: 'Agenda Inteligente',
      icon: Calendar,
      color: 'text-blue-400',
      bgGlow: 'bg-blue-500/20',
      border: 'border-blue-500/20',
      description: 'O coração da clínica, projetado para eliminar "buracos" e conflitos.',
      details: [
        'Link Público de Agendamento',
        'Central de Aprovação de Consultas',
        'Status Coloridos e Visuais',
        'Bloqueio de Horários e Férias'
      ]
    },
    {
      id: 'ai',
      title: 'Prontuário com IA',
      icon: Brain,
      color: 'text-purple-400',
      bgGlow: 'bg-purple-500/20',
      border: 'border-purple-500/20',
      description: 'A funcionalidade "Uau" que economiza horas de digitação.',
      details: [
        'Voz para Texto (Ditado)',
        'Resumo SOAP Automático',
        'Histórico Seguro na Nuvem',
        'Foco total no paciente'
      ]
    },
    {
      id: 'crm',
      title: 'Automação & CRM',
      icon: BellRing,
      color: 'text-orange-400',
      bgGlow: 'bg-orange-500/20',
      border: 'border-orange-500/20',
      description: 'Fidelização automática e redução drástica de No-Show.',
      details: [
        'Lembretes Automáticos (E-mail)',
        'Campanhas de Retorno (Recall)',
        'Confirmação com um clique',
        'Avisos de Aniversário'
      ]
    },
    {
      id: 'finance',
      title: 'Financeiro Simples',
      icon: DollarSign,
      color: 'text-green-400',
      bgGlow: 'bg-green-500/20',
      border: 'border-green-500/20',
      description: 'Controle total do fluxo de caixa sem precisar de contador.',
      details: [
        'Lançamento Automático via Agenda',
        'Contas a Pagar e Receber',
        'Previsão Diária no E-mail',
        'Relatórios de Receita'
      ]
    },
    {
      id: 'inventory',
      title: 'Controle de Estoque',
      icon: Box,
      color: 'text-cyan-400',
      bgGlow: 'bg-cyan-500/20',
      border: 'border-cyan-500/20',
      description: 'Gestão completa de materiais para evitar desperdícios e faltas.',
      details: [
        'Alertas de Estoque Baixo (E-mail)',
        'Itens Compartilhados ou por Dentista',
        'Ajuste Rápido de Quantidade',
        'Categorização Flexível'
      ]
    }
  ];

  useEffect(() => {
    // Optimized resize handler to avoid dependency loop
    const handleResize = () => {
        setDevice(prev => {
            const isMobile = window.innerWidth < 768;
            if (isMobile && prev !== 'mobile') return 'mobile';
            return prev;
        });
        
        if (window.innerWidth >= 768) {
            setMobileMenuOpen(false);
        }
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
  }, [location]); // Removed 'device' from dependencies

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
    { label: 'Estoque', icon: Box },
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
                    <button onClick={() => { setMobileMenuOpen(false); navigate('/entenda'); }} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5">Como Funciona</button>
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
            O <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Sistema Operacional <br />
            do Futuro</span> para Dentistas
          </h1>
          
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400 mb-12 leading-relaxed">
            Abandone o papel e os sistemas do passado. Experimente a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 font-bold">gestão com inteligência artificial</span>, 
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
                            
                            {/* ... (Conteúdo do Mockup permanece o mesmo) ... */}
                            {activeMockup === 'Visão Geral' && (
                                <div className="space-y-6 animate-fade-in">
                                    <h2 className="text-xl font-bold text-white mb-4">Visão Geral</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-2"><div className="p-2 bg-blue-500/10 rounded-lg"><Users size={20} className="text-blue-500"/></div></div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Pacientes</p>
                                            <p className="text-2xl font-black text-white">148</p>
                                        </div>
                                        <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-2"><div className="p-2 bg-green-500/10 rounded-lg"><Calendar size={20} className="text-green-500"/></div></div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Agendados Hoje</p>
                                            <p className="text-2xl font-black text-white">12</p>
                                        </div>
                                        <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-2"><div className="p-2 bg-yellow-500/10 rounded-lg"><DollarSign size={20} className="text-yellow-500"/></div></div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Receita (Mês)</p>
                                            <p className="text-2xl font-black text-white">R$ 18.590,00</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                                        <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 flex flex-col h-full overflow-hidden">
                                            <h3 className="font-bold text-white flex items-center gap-2 text-sm mb-4"><Clock size={16} className="text-gray-400"/> Próximos Agendamentos</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded">14:00</span>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">Mariana Costa</p>
                                                            <p className="text-xs text-gray-500">Avaliação Inicial</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded">15:00</span>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">Pedro Alves</p>
                                                            <p className="text-xs text-gray-500">Manutenção Ortodôntica</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                                </div>
                                                <div className="flex items-center justify-center pt-2">
                                                    <span className="text-xs text-primary cursor-pointer hover:underline">Ver todos</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex-1 bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                                                <div className="absolute right-0 top-0 p-4 opacity-5"><TrendingUp size={60} className="text-green-500"/></div>
                                                <h3 className="font-bold text-white flex items-center gap-2 text-sm mb-4"><span className="p-1 bg-green-500/20 rounded text-green-400"><ArrowRight size={14} className="-rotate-45"/></span> Entradas (Semana)</h3>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-3 bg-green-900/10 rounded-lg border border-green-500/20"><p className="text-[10px] text-green-400 font-bold uppercase">Realizado</p><p className="text-lg font-black text-white">R$ 4.200,00</p></div>
                                                    <div className="p-3 bg-gray-800/30 rounded-lg border border-white/5"><p className="text-[10px] text-gray-400 font-bold uppercase">A Receber</p><p className="text-lg font-black text-gray-300">R$ 1.850,00</p></div>
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                                                <div className="absolute right-0 top-0 p-4 opacity-5"><TrendingDown size={60} className="text-red-500"/></div>
                                                <h3 className="font-bold text-white flex items-center gap-2 text-sm mb-4"><span className="p-1 bg-red-500/20 rounded text-red-400"><ArrowRight size={14} className="rotate-45"/></span> Saídas (Semana)</h3>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-3 bg-red-900/10 rounded-lg border border-red-500/20"><p className="text-[10px] text-red-400 font-bold uppercase">Pago</p><p className="text-lg font-black text-white">R$ 1.250,00</p></div>
                                                    <div className="p-3 bg-gray-800/30 rounded-lg border border-white/5"><p className="text-[10px] text-gray-400 font-bold uppercase">A Pagar</p><p className="text-lg font-black text-gray-300">R$ 580,00</p></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* ... outros mockups mantidos ... */}
                            {activeMockup === 'Agenda' && (
                                <div className="space-y-4 animate-fade-in h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 bg-gray-900 border border-white/10 p-1 rounded-lg">
                                            <button className="p-1 text-gray-400 hover:text-white"><ChevronLeft size={16}/></button>
                                            <span className="text-sm font-bold text-white px-2">Fevereiro 2026</span>
                                            <button className="p-1 text-gray-400 hover:text-white"><ChevronRight size={16}/></button>
                                            <span className="text-[10px] font-bold text-gray-400 border-l border-white/10 pl-2 ml-1 cursor-pointer">Hoje</span>
                                        </div>
                                        <button className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center shadow-lg shadow-blue-900/20"><Plus size={14} className="mr-1"/> Novo Agendamento</button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                                        {['Todos Pacientes', 'Todos Dentistas', 'Financeiro (Todos)', 'Status (Todos)'].map((f, i) => (
                                            <div key={i} className="bg-gray-800 border border-white/10 rounded px-2 py-1.5 text-[10px] text-gray-300 flex justify-between items-center cursor-pointer hover:bg-gray-700">
                                                {f} <ChevronDown size={10} />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex-1 bg-gray-900/50 border border-white/5 rounded-lg overflow-hidden flex flex-col">
                                        <div className="grid grid-cols-7 bg-gray-800/50 p-2 text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                                            <div>Data</div><div>Horário</div><div className="col-span-1">Paciente</div><div className="col-span-1">Dentista</div><div className="text-center">Status</div><div className="text-center">Pagamento</div><div className="text-right">Ações</div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                                            {[
                                                { date: '06/02', time: '08:00 - 09:00', name: 'João Miguel', dentist: 'Dr. André', status: 'CONFIRMADO', pay: 'PAGO', val: '0', color: 'bg-blue-500', statusColor: 'text-green-400 bg-green-900/20 border-green-500/30', payColor: 'text-green-400 bg-green-900/20 border-green-500/30' },
                                                { date: '06/02', time: '09:00 - 10:00', name: 'Ana Clara', dentist: 'Dra. Juliana', status: 'AGENDADO', pay: 'PENDENTE', val: '0', color: 'bg-purple-500', statusColor: 'text-blue-400 bg-blue-900/20 border-blue-500/30', payColor: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30' },
                                                { date: '06/02', time: '10:00 - 11:30', name: 'Lucas Ferrari', sub: 'Canal', dentist: 'Dr. André', status: 'AGENDADO', pay: 'PENDENTE', val: '0', color: 'bg-blue-500', statusColor: 'text-blue-400 bg-blue-900/20 border-blue-500/30', payColor: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30' }
                                            ].map((item, i) => (
                                                <div key={i} className="grid grid-cols-7 items-center p-3 border-b border-white/5 hover:bg-gray-800/30 text-xs">
                                                    <div className="text-gray-300 font-bold">{item.date}</div>
                                                    <div className="text-gray-400">{item.time}</div>
                                                    <div>
                                                        <div className="font-bold text-white">{item.name}</div>
                                                        {item.sub && <div className="text-[10px] text-gray-500">{item.sub}</div>}
                                                    </div>
                                                    <div className="flex items-center text-gray-400"><div className={`w-1.5 h-1.5 rounded-full ${item.color} mr-1.5`}></div>{item.dentist}</div>
                                                    <div className="text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.statusColor}`}>{item.status}</span></div>
                                                    <div className="text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.payColor}`}>{item.pay}</span></div>
                                                    <div className="text-right text-gray-500 flex justify-end gap-2">
                                                        <Trash2 size={12} className="hover:text-red-400 cursor-pointer"/>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* ... Restante dos mockups ... */}
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
                                      <button key={item.label} onClick={() => { setActiveMockup(item.label); setMockupMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeMockup === item.label ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}`}>
                                          <div className="relative"><item.icon size={18}/>{item.badge && <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full"></span>}</div>
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
        {/* ... (Video Section Content) ... */}
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
                        <li className="flex items-start gap-3"><div className="mt-1 p-1 bg-green-500/20 rounded text-green-400 border border-green-500/20"><Check size={16}/></div><div><strong className="block text-white">Transcrição de Voz para Texto</strong><span className="text-sm text-gray-500">Não tire as luvas. Apenas dite e o sistema escreve.</span></div></li>
                        <li className="flex items-start gap-3"><div className="mt-1 p-1 bg-green-500/20 rounded text-green-400 border border-green-500/20"><Check size={16}/></div><div><strong className="block text-white">Formato SOAP Automático</strong><span className="text-sm text-gray-500">A IA organiza em Subjetivo, Objetivo, Avaliação e Plano.</span></div></li>
                        <li className="flex items-start gap-3"><div className="mt-1 p-1 bg-green-500/20 rounded text-green-400 border border-green-500/20"><Check size={16}/></div><div><strong className="block text-white">Histórico Seguro</strong><span className="text-sm text-gray-500">Tudo salvo na nuvem com data e hora.</span></div></li>
                    </ul>

                    <button onClick={() => goToAuth('signup')} className="bg-white text-gray-900 px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition shadow-lg shadow-white/10">
                        Quero testar a IA
                    </button>
                </div>

                {/* AI Visual */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                        {/* Audio Waveform */}
                        <div className="flex items-center justify-between mb-4 bg-gray-800/50 p-3 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                                    <Mic size={16} className="text-red-500" />
                                </div>
                                <div className="flex gap-1 h-4 items-center">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="w-1 bg-purple-500 rounded-full animate-bounce" style={{height: Math.random() * 16 + 4 + 'px', animationDelay: i * 0.1 + 's'}}></div>
                                    ))}
                                </div>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">00:14 / 00:45</span>
                        </div>

                        {/* Transcription */}
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Transcrição (Voz para Texto)</p>
                            <p className="text-gray-300 text-sm italic">"O paciente João chegou relatando uma dor aguda no dente 26, principalmente com água gelada. No exame clínico notei uma retração gengival severa e desgaste cervical. Vou aplicar um dessensibilizante agora e agendar uma restauração classe 5."</p>
                        </div>

                        {/* Arrow separator */}
                        <div className="flex justify-center mb-4"><ArrowDown size={20} className="text-purple-500/50" /></div>

                        {/* SOAP Result */}
                        <div className="space-y-2 font-mono text-xs">
                            <div className="p-2 bg-gray-800/30 rounded border border-purple-500/20"><span className="text-purple-400 font-bold">S:</span> <span className="text-gray-400">Dor aguda no dente 26 com estímulos térmicos (frio).</span></div>
                            <div className="p-2 bg-gray-800/30 rounded border border-purple-500/20"><span className="text-purple-400 font-bold">O:</span> <span className="text-gray-400">Retração gengival severa e desgaste cervical no 26.</span></div>
                            <div className="p-2 bg-gray-800/30 rounded border border-purple-500/20"><span className="text-purple-400 font-bold">A:</span> <span className="text-gray-400">Hipersensibilidade dentinária / Lesão cervical não cariosa.</span></div>
                            <div className="p-2 bg-gray-800/30 rounded border border-purple-500/20"><span className="text-purple-400 font-bold">P:</span> <span className="text-gray-400">Aplicação de dessensibilizante (imediato); Restaur. Classe V (agendada).</span></div>
                        </div>
                        
                        <div className="absolute bottom-4 right-4 text-purple-500/10 pointer-events-none"><SparklesIcon size={120} /></div>
                    </div>
                </div>
            </div>

            {/* VIDEO DEMO SECTION */}
            <div className="mt-16 max-w-4xl mx-auto">
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative bg-gray-900 group">
                    <div className="absolute inset-0 bg-purple-600/20 blur-3xl opacity-20 group-hover:opacity-30 transition duration-1000 pointer-events-none"></div>
                    <iframe className="w-full h-full relative z-10" src="https://www.youtube.com/embed/hQmUia6y7vg?rel=0" title="DentiHub AI Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
                <p className="text-center text-gray-500 text-sm mt-4">Veja a Inteligência Artificial criando um prontuário em tempo real.</p>
            </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 relative z-10 bg-gray-950">
        {/* ... (Features Content) ... */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-white">Recursos que transformam</h2>
                <p className="mt-4 text-gray-400">Tudo o que sua clínica precisa em um só lugar.</p>
            </div>

            <div className="space-y-24">
            {features.map((feature, index) => (
                <div key={feature.id} className={`flex flex-col md:flex-row gap-12 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                
                <div className="flex-1 w-full">
                    <div className={`rounded-3xl p-8 bg-gray-900/40 backdrop-blur border border-white/5 relative overflow-hidden group hover:border-white/10 transition duration-500`}>
                        <div className={`absolute top-0 right-0 p-8 opacity-20 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition duration-700 blur-2xl`}>
                            <feature.icon size={200} className={feature.color} />
                        </div>
                        <div className="relative z-10">
                            <div className={`w-16 h-16 ${feature.bgGlow} rounded-2xl flex items-center justify-center mb-6 border ${feature.border}`}>
                                <feature.icon size={32} className={feature.color} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                            <p className="text-gray-400 font-medium">{feature.description}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full">
                    <h3 className="text-2xl font-bold text-white mb-6">Principais Recursos</h3>
                    <ul className="space-y-4">
                    {feature.details.map((detail, i) => (
                        <li key={i} className="flex items-start">
                        <div className={`mt-1 mr-3 p-0.5 rounded-full bg-gray-800 border ${feature.border}`}>
                            <CheckCircle className={`w-4 h-4 ${feature.color}`} />
                        </div>
                        <span className="text-gray-300 text-lg">{detail}</span>
                        </li>
                    ))}
                    </ul>
                </div>

                </div>
            ))}
            </div>

            {/* Technical & Security Section */}
            <div className="mt-32">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-white">Tecnologia e Segurança</h2>
                    <p className="text-gray-400 mt-4">Construído com padrões modernos para garantir sua tranquilidade.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-gray-900/60 backdrop-blur p-8 rounded-2xl border border-white/5 hover:border-blue-500/50 transition duration-300 group">
                    <div className="w-14 h-14 bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300 border border-blue-500/20">
                        <Cloud className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="font-bold text-lg text-white mb-2">100% na Nuvem</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">Nada para instalar. Acesse de qualquer lugar (casa ou clínica) pelo Chrome, Safari ou Edge.</p>
                    </div>
                    <div className="bg-gray-900/60 backdrop-blur p-8 rounded-2xl border border-white/5 hover:border-purple-500/50 transition duration-300 group">
                    <div className="w-14 h-14 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300 border border-purple-500/20">
                        <Smartphone className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="font-bold text-lg text-white mb-2">Mobile First</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">Interface responsiva desenhada para funcionar perfeitamente no seu celular ou tablet.</p>
                    </div>
                    <div className="bg-gray-900/60 backdrop-blur p-8 rounded-2xl border border-white/5 hover:border-green-500/50 transition duration-300 group">
                    <div className="w-14 h-14 bg-green-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300 border border-green-500/20">
                        <Lock className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="font-bold text-lg text-white mb-2">Dados Seguros</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">Criptografia de ponta a ponta e backups automáticos. Seus pacientes estão seguros.</p>
                    </div>
                </div>
            </div>

            {/* Gestão de Equipe */}
            <div className="mt-24 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 text-white text-center relative overflow-hidden border border-white/10">
                <div className="relative z-10 max-w-3xl mx-auto">
                    <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm border border-white/20">
                        <Users size={32} className="text-blue-300" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Gestão de Equipe e Acessos</h2>
                    <p className="text-gray-300 mb-8 text-lg">
                        Cresça sua clínica com segurança. Convide outros dentistas e recepcionistas, definindo exatamente o que cada um pode ver.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 text-sm font-bold">
                        <span className="bg-white/10 border border-white/20 px-4 py-2 rounded-full text-white">Administrador (Total)</span>
                        <span className="bg-white/10 border border-white/20 px-4 py-2 rounded-full text-white">Dentista (Agenda Própria)</span>
                        <span className="bg-white/10 border border-white/20 px-4 py-2 rounded-full text-white">Recepcionista (Operacional)</span>
                    </div>
                </div>
                {/* Decorative BG */}
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-blue-600/10 to-transparent pointer-events-none"></div>
            </div>

            {/* CTA Final */}
            <div className="mt-32 text-center">
                <h2 className="text-3xl font-bold text-white mb-6">Tudo isso em uma única plataforma</h2>
                <button 
                    onClick={() => navigate('/auth', { state: { view: 'signup' } })}
                    className="bg-blue-600 text-white text-xl font-bold px-10 py-5 rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all transform hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(37,99,235,0.6)]"
                >
                    Começar Gratuitamente
                </button>
                <p className="mt-4 text-sm text-gray-500">
                    Plano Free disponível para consultórios iniciantes.
                </p>
            </div>
        </div>
      </section>

      {/* PLANS SECTION */}
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

      <footer className="bg-gray-950 border-t border-white/5 py-12 text-center text-sm text-gray-500 relative z-10">
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
