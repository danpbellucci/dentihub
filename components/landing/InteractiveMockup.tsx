import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Calendar, Users, UserCheck, Mic, MessageSquare, DollarSign, Box, 
  BellRing, BookOpen, Settings, Smartphone, Tablet, Monitor, Clock, Menu, X, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../Logo';

const InteractiveMockup: React.FC = () => {
  const navigate = useNavigate();
  const [activeMockup, setActiveMockup] = useState('Visão Geral');
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [mockupMobileMenuOpen, setMockupMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Set initial device based on screen width, but allow user override
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setDevice('mobile');
    }
  }, []);

  const goToAuth = () => {
    navigate('/auth', { state: { view: 'signup' } });
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

  return (
    <div className="relative mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-up delay-200 flex flex-col items-center">
        
        {/* Device Switcher */}
        <div className="flex items-center justify-center gap-4 mb-8 p-1.5 bg-gray-900/80 backdrop-blur rounded-full border border-white/10 shadow-xl w-fit">
            <button onClick={() => setDevice('mobile')} className={`p-2 rounded-full transition ${device === 'mobile' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Smartphone size={18} /></button>
            <button onClick={() => setDevice('tablet')} className={`p-2 rounded-full transition ${device === 'tablet' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Tablet size={18} /></button>
            <button onClick={() => setDevice('desktop')} className={`p-2 rounded-full transition ${device === 'desktop' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Monitor size={18} /></button>
        </div>

        {/* The Frame */}
        <div className={`transition-all duration-700 ease-in-out relative bg-gray-950 shadow-2xl overflow-hidden group border border-white/10
                ${device === 'desktop' ? 'w-full max-w-5xl rounded-xl h-[600px] hover:shadow-[0_0_50px_rgba(124,58,237,0.2)]' : ''}
                ${device === 'tablet' ? 'w-[500px] h-[700px] rounded-[2rem] border-[8px] border-gray-800 ring-1 ring-white/10' : ''}
                ${device === 'mobile' ? 'w-[320px] h-[650px] rounded-[3rem] border-[8px] border-gray-800 ring-1 ring-white/10' : ''}
            `}>
            
            {/* Desktop Browser Bar */}
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
                <div className="flex-1 bg-gray-900 overflow-y-auto custom-scrollbar relative flex flex-col">
                    
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
                        
                        {/* Conteúdo do Mockup - Visão Geral */}
                        {activeMockup === 'Visão Geral' && (
                            <div className="space-y-6 animate-fade-in">
                                <h2 className="text-xl font-bold text-white mb-4">Visão Geral</h2>
                                {device === 'mobile' ? (
                                    <div className="flex flex-col gap-4">
                                        {/* Cards Mobile */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden flex flex-col items-start">
                                                <div className="p-2 bg-blue-500/10 rounded-lg mb-2"><Users size={20} className="text-blue-500"/></div>
                                                <p className="text-xs text-gray-400 uppercase font-bold">Pacientes</p>
                                                <p className="text-2xl font-black text-white">148</p>
                                            </div>
                                            <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden flex flex-col items-start">
                                                <div className="p-2 bg-green-500/10 rounded-lg mb-2"><Calendar size={20} className="text-green-500"/></div>
                                                <p className="text-xs text-gray-400 uppercase font-bold">Hoje</p>
                                                <p className="text-2xl font-black text-white">12</p>
                                            </div>
                                            <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden flex flex-col items-start col-span-2">
                                                <div className="flex items-center justify-between w-full mb-2">
                                                    <div className="p-2 bg-yellow-500/10 rounded-lg"><DollarSign size={20} className="text-yellow-500"/></div>
                                                    <span className="text-xs text-gray-500">Mês Atual</span>
                                                </div>
                                                <p className="text-xs text-gray-400 uppercase font-bold">Receita Estimada</p>
                                                <p className="text-2xl font-black text-white">R$ 18.590,00</p>
                                            </div>
                                        </div>

                                        {/* Agenda List Mobile */}
                                        <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5">
                                            <h3 className="font-bold text-white flex items-center gap-2 text-sm mb-4"><Clock size={16} className="text-gray-400"/> Próximos</h3>
                                            <div className="space-y-3">
                                                {[
                                                    { time: '14:00', name: 'Mariana Costa', service: 'Avaliação Inicial', color: 'bg-blue-500' },
                                                    { time: '15:00', name: 'Pedro Alves', service: 'Manutenção Ortodôntica', color: 'bg-purple-500' }
                                                ].map((apt, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-lg border border-white/5">
                                                        <div className="bg-gray-800 px-2 py-1 rounded text-xs font-bold text-gray-400 border border-white/10">{apt.time}</div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-white">{apt.name}</p>
                                                            <p className="text-[10px] text-gray-500">{apt.service}</p>
                                                        </div>
                                                        <div className={`w-2 h-2 rounded-full ${apt.color}`}></div>
                                                    </div>
                                                ))}
                                                <span className="block text-center text-xs text-primary mt-2">Ver todos</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // Desktop Layout (Original)
                                    <>
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
                                        {/* Mockup Placeholder Content for Desktop */}
                                        <div className="grid grid-cols-3 gap-4 h-64">
                                            <div className="col-span-2 bg-gray-900/60 rounded-xl border border-white/5 p-4">
                                                <h3 className="font-bold text-white text-sm mb-3">Agenda de Hoje</h3>
                                                <div className="space-y-2">
                                                    {[1,2,3].map(i => (
                                                        <div key={i} className="h-10 bg-gray-800/50 rounded flex items-center px-3 gap-3">
                                                            <div className="w-12 h-4 bg-gray-700 rounded"></div>
                                                            <div className="flex-1 h-4 bg-gray-700 rounded"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-gray-900/60 rounded-xl border border-white/5 p-4">
                                                <h3 className="font-bold text-white text-sm mb-3">Lembretes</h3>
                                                <div className="space-y-2">
                                                    <div className="h-16 bg-gray-800/50 rounded"></div>
                                                    <div className="h-16 bg-gray-800/50 rounded"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Conteúdo do Mockup - Outras Telas */}
                        {activeMockup !== 'Visão Geral' && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                                <h3 className="text-xl font-bold text-white mb-2">{activeMockup}</h3>
                                <p>Esta tela é totalmente funcional no sistema real.</p>
                                <button onClick={goToAuth} className="mt-4 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition">Testar Grátis</button>
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
  );
};

export default InteractiveMockup;