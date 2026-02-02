
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';
import { 
  Calendar, Users, DollarSign, CheckCircle, ShieldCheck, Zap, Search, Mic, 
  BookOpen, Smartphone, Tablet, Monitor, LayoutDashboard, Bell, BellRing,
  UserCheck, MessageSquare, Settings, Mail, Gift, CreditCard, Menu, X, Check, Loader2,
  TrendingUp, TrendingDown, Filter, ChevronLeft, ChevronRight, Plus, Folder,
  Brain, Clock, ArrowRight, BarChart3, Repeat, Lock, Sparkles, Star
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeMockup, setActiveMockup] = useState('Visão Geral');
  // Inicia detectando se é mobile para renderizar o componente correto imediatamente (evita layout shift/peso)
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>(
      typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'
  );
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadStatus, setLeadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Listener para redimensionamento
    const handleResize = () => {
        if (window.innerWidth < 768 && device !== 'mobile') setDevice('mobile');
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
      { threshold: 0.3 }
    );

    const plansElement = document.getElementById('plans');
    if (plansElement) {
      observer.observe(plansElement);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (plansElement) observer.unobserve(plansElement);
    };
  }, [device]);

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
    { label: 'Prontuário IA', icon: Mic },
    { label: 'Mensageria', icon: MessageSquare },
    { label: 'Financeiro', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white overflow-x-hidden">
      
      {/* 
          CORREÇÃO CRÍTICA DE PERFORMANCE IOS:
          Ocultar os "Glows" (Blur 120px) no mobile.
          O Safari Mobile trava tentando renderizar grandes áreas de blur gaussian.
          Usamos 'hidden md:block' para exibir apenas em tablets/desktop.
      */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 hidden md:block">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      {/* HEADER */}
      <header className="fixed w-full top-0 z-50 border-b border-white/5 bg-gray-950/90 backdrop-blur-md supports-[backdrop-filter]:bg-gray-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-white font-bold text-2xl cursor-pointer hover:opacity-80 transition" onClick={() => navigate('/')}>
              <Logo className="w-8 h-8" />
              <span className="tracking-tight">DentiHub</span>
            </div>
            
            {/* Desktop Nav */}
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

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-4">
                <button onClick={() => goToAuth('signup')} className="bg-white text-gray-900 px-4 py-1.5 rounded-full font-bold text-sm">Criar Conta</button>
            </div>
          </div>
        </div>
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
            <button 
              onClick={() => goToAuth('signup')} 
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-500 transition shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 group"
            >
              Criar Conta Gratuita
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
                onClick={() => document.getElementById('ai-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <Mic size={20} className="text-purple-400"/>
              Ver a IA em ação
            </button>
          </div>

          {/* MOCKUP INTERATIVO */}
          <div className="relative mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-up delay-200 flex flex-col items-center">
            
            {/* Device Selector */}
            <div className="flex items-center justify-center gap-4 mb-8 p-1.5 bg-gray-900/80 backdrop-blur rounded-full border border-white/10 shadow-xl w-fit">
                <button onClick={() => setDevice('mobile')} className={`p-2 rounded-full transition ${device === 'mobile' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Smartphone size={18} /></button>
                <button onClick={() => setDevice('tablet')} className={`p-2 rounded-full transition ${device === 'tablet' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Tablet size={18} /></button>
                <button onClick={() => setDevice('desktop')} className={`p-2 rounded-full transition ${device === 'desktop' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Monitor size={18} /></button>
            </div>

            {/* The Frame Wrapper */}
            <div 
                className={`transition-all duration-700 ease-in-out relative bg-gray-900 shadow-2xl overflow-hidden group
                    ${device === 'desktop' ? 'w-full max-w-5xl rounded-xl border border-white/10 h-[600px] hover:shadow-[0_0_50px_rgba(124,58,237,0.2)]' : ''}
                    ${device === 'tablet' ? 'w-[500px] h-[700px] rounded-[2rem] border-[8px] border-gray-800 ring-1 ring-white/10' : ''}
                    ${device === 'mobile' ? 'w-[320px] h-[650px] rounded-[3rem] border-[8px] border-gray-800 ring-1 ring-white/10' : ''}
                `}
            >
                {/* Desktop Header */}
                {device === 'desktop' && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-white/5">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                        </div>
                        <div className="mx-auto bg-gray-800/50 border border-white/5 rounded-md px-3 py-1 text-[10px] text-gray-400 font-mono w-full max-w-xs text-center flex items-center justify-center gap-1">
                            <Lock size={10} /> dentihub.com.br/dashboard
                        </div>
                    </div>
                )}

                <div className={`flex bg-white h-full relative text-left ${device === 'mobile' ? 'flex-col' : 'flex-row'}`}>
                    {/* Sidebar Mockup */}
                    <div className={`bg-gray-50 border-r border-gray-200 flex-shrink-0 z-20 ${device === 'mobile' ? 'hidden' : 'w-56 p-4 flex flex-col'}`}>
                        <div className="flex items-center gap-2 text-gray-900 font-bold mb-8 px-2">
                            <Logo className="w-6 h-6" /> <span>DentiHub</span>
                        </div>
                        <div className="space-y-1">
                            {mockupMenu.map(item => (
                                <button key={item.label} onClick={() => setActiveMockup(item.label)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${activeMockup === item.label ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    <item.icon size={18}/> {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Mockup */}
                    <div className="flex-1 bg-white p-6 overflow-y-auto">
                        {activeMockup === 'Visão Geral' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <div><h2 className="text-xl font-bold text-gray-800">Visão Geral</h2><p className="text-sm text-gray-500">Bem-vindo, Dr. Silva</p></div>
                                    <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-xs text-gray-500 uppercase font-bold">Agendados Hoje</div><div className="text-2xl font-black text-gray-800 mt-1">12</div></div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-xs text-gray-500 uppercase font-bold">Receita (Mês)</div><div className="text-2xl font-black text-green-600 mt-1">R$ 24.500</div></div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-xs text-gray-500 uppercase font-bold">Pacientes</div><div className="text-2xl font-black text-blue-600 mt-1">1,240</div></div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-4 text-sm">Próximos Pacientes</h3>
                                    <div className="space-y-3">
                                        {['Ana Silva - Limpeza', 'Carlos Souza - Canal', 'Mariana Lima - Avaliação'].map((p, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{p.charAt(0)}</div><span>{p}</span></div>
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Confirmado</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeMockup !== 'Visão Geral' && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Settings size={48} className="mb-4 opacity-20"/>
                                <p>Visualização demonstrativa do módulo {activeMockup}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI SPOTLIGHT SECTION */}
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
        </div>
      </section>

      {/* CORE FEATURES GRID (BENTO STYLE) */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Gestão Completa & Moderna</h2>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">Funcionalidades desenhadas para eliminar gargalos e aumentar a produtividade da sua clínica.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Agenda Online */}
                <div className="md:col-span-2 bg-gray-900/60 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/5 hover:border-blue-500/30 transition group overflow-hidden relative">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 border border-blue-500/20"><Calendar size={24}/></div>
                        <h3 className="text-2xl font-bold text-white mb-3">Agenda Inteligente & Online</h3>
                        <p className="text-gray-400 mb-6 max-w-md">Elimine os buracos na agenda. Compartilhe seu link exclusivo e deixe que os pacientes escolham horários livres. Você aprova ou recusa com um clique.</p>
                        <div className="flex gap-2 text-sm font-bold text-blue-300">
                            <span className="bg-blue-900/30 px-3 py-1 rounded-full border border-blue-500/20">Link Público</span>
                            <span className="bg-blue-900/30 px-3 py-1 rounded-full border border-blue-500/20">Bloqueio de Férias</span>
                        </div>
                    </div>
                    <div className="absolute right-0 bottom-0 w-1/3 h-full bg-gradient-to-l from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                </div>

                {/* Financeiro */}
                <div className="bg-gray-900/60 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/5 hover:border-green-500/30 transition group">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 mb-6 border border-green-500/20"><DollarSign size={24}/></div>
                    <h3 className="text-2xl font-bold text-white mb-3">Fluxo de Caixa</h3>
                    <p className="text-gray-400 mb-4">Lançamentos automáticos a partir da agenda. Saiba exatamente quanto entrou e quanto tem a pagar.</p>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mt-auto">
                        <div className="bg-green-500 w-3/4 h-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">Receita Prevista vs Realizada</p>
                </div>

                {/* CRM / Recall */}
                <div className="bg-gray-900/60 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/5 hover:border-pink-500/30 transition group">
                    <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-400 mb-6 border border-pink-500/20"><Repeat size={24}/></div>
                    <h3 className="text-2xl font-bold text-white mb-3">Marketing de Retorno</h3>
                    <p className="text-gray-400">Filtre pacientes sumidos há 6 meses e traga-os de volta com campanhas automáticas de e-mail.</p>
                </div>

                {/* Lembretes */}
                <div className="md:col-span-2 bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 shadow-lg border border-white/10 text-white relative overflow-hidden group hover:border-white/20 transition">
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
                        <div className="flex-1">
                            <div className="w-12 h-12 bg-gray-700/50 rounded-xl flex items-center justify-center text-white mb-6 border border-white/10"><BellRing size={24}/></div>
                            <h3 className="text-2xl font-bold mb-3">Reduza Faltas (No-Show)</h3>
                            <p className="text-gray-400 mb-6">O sistema envia e-mails automáticos 24h antes. Se o paciente não confirmar, enviamos um alerta de urgência 12h antes.</p>
                            <button onClick={() => goToAuth('signup')} className="text-white border-b border-white/30 pb-1 hover:text-white hover:border-white transition">Configurar Lembretes &rarr;</button>
                        </div>
                        {/* Visual representation of email */}
                        <div className="bg-white text-gray-900 p-4 rounded-xl w-full md:w-64 shadow-2xl transform rotate-3 group-hover:rotate-0 transition duration-500">
                            <div className="flex items-center gap-2 mb-3 border-b pb-2">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">D</div>
                                <span className="text-xs font-bold">Lembrete de Consulta</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-3">Olá Ana, sua consulta é amanhã às 14:00.</p>
                            <div className="flex gap-2">
                                <div className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded flex-1 text-center">Confirmar</div>
                                <div className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded flex-1 text-center">Cancelar</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </section>

      {/* PRICING */}
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
                <li className="flex items-center text-gray-400"><CheckCircle size={18} className="text-gray-600 mr-2" /> Prontuário IA (3 usos)</li>
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
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-blue-500 mr-2" /> Prontuário IA (5 usos/dia)</li>
                <li className="flex items-center text-gray-300"><CheckCircle size={18} className="text-blue-500 mr-2" /> Lembretes de Urgência (12h)</li>
              </ul>
              <button onClick={() => goToAuth('signup')} className="w-full py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-900/20">Assinar Agora</button>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-white/10 p-8 relative flex flex-col text-white">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Star size={16} className="text-yellow-400 fill-yellow-400"/> Pro</h3>
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
      <footer className="bg-gray-950 py-12 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 text-white font-bold text-xl mb-4">
            <Logo className="w-6 h-6" />
            <span>DentiHub</span>
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
                  <p className="text-gray-400 text-sm mt-2">Obrigado por se juntar a nós.</p>
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

// Helper Icon for sparkle effects
const SparklesIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.39 9.39L22 12L14.39 14.61L12 22L9.61 14.61L2 12L9.61 9.39L12 2Z" />
    </svg>
);

export default LandingPage;
