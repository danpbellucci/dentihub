
import React from 'react';
import { Logo } from './Logo';
import { 
  Calendar, Users, DollarSign, Clock, LayoutDashboard, 
  TrendingUp, TrendingDown, BellRing, Check, Mic, 
  Menu, Search, Plus, Filter, MessageSquare, ChevronLeft, ChevronRight, Lock
} from 'lucide-react';

const MarketingKit: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-20">
      {/* Control Bar (Hidden on Print) */}
      <div className="bg-gray-900 text-white p-4 sticky top-0 z-50 flex justify-between items-center print:hidden shadow-lg">
        <div className="flex items-center gap-3">
            <Logo className="w-8 h-8"/>
            <div>
                <h1 className="font-bold text-lg">DentiHub Marketing Kit</h1>
                <p className="text-xs text-gray-400">Mockups para materiais promocionais</p>
            </div>
        </div>
        <button 
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition flex items-center gap-2"
        >
            <span className="text-lg">🖨️</span> Salvar como PDF
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-24 print:p-0 print:space-y-12">

        {/* --- SCENARIO 1: DESKTOP DASHBOARD --- */}
        <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-black text-gray-800 mb-6 border-l-4 border-blue-500 pl-4 print:hidden">1. Visão Geral (Desktop)</h2>
            <div className="border border-gray-200 rounded-xl shadow-2xl overflow-hidden bg-gray-950 aspect-video relative">
                {/* Browser Header */}
                <div className="bg-gray-900 border-b border-white/5 p-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <div className="mx-auto bg-gray-800/50 rounded px-4 py-1 text-xs text-gray-400 font-mono flex items-center gap-2">
                        <Lock size={10}/> app.dentihub.com.br/dashboard
                    </div>
                </div>

                {/* Content */}
                <div className="flex h-full">
                    {/* Sidebar */}
                    <div className="w-64 bg-gray-900 border-r border-white/5 p-4 flex flex-col hidden md:flex">
                        <div className="flex items-center gap-2 text-white font-bold mb-8">
                            <Logo className="w-6 h-6"/> DentiHub
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"><LayoutDashboard size={18}/> Visão Geral</div>
                            <div className="flex items-center gap-3 px-3 py-2 text-gray-400 rounded-lg text-sm font-medium"><Calendar size={18}/> Agenda</div>
                            <div className="flex items-center gap-3 px-3 py-2 text-gray-400 rounded-lg text-sm font-medium"><Users size={18}/> Pacientes</div>
                            <div className="flex items-center gap-3 px-3 py-2 text-gray-400 rounded-lg text-sm font-medium"><DollarSign size={18}/> Financeiro</div>
                        </div>
                    </div>

                    {/* Main Area */}
                    <div className="flex-1 p-8 bg-gray-950 overflow-hidden">
                        <h1 className="text-2xl font-bold text-white mb-6">Bom dia, Dr. André! 👋</h1>
                        
                        {/* KPI Cards */}
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div className="bg-gray-900/50 p-6 rounded-xl border border-white/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400"><Users size={24}/></div>
                                    <span className="text-xs text-green-400 font-bold bg-green-500/10 px-2 py-1 rounded">+12%</span>
                                </div>
                                <p className="text-sm text-gray-400 uppercase font-bold">Pacientes Ativos</p>
                                <p className="text-3xl font-black text-white">1.248</p>
                            </div>
                            <div className="bg-gray-900/50 p-6 rounded-xl border border-white/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-green-500/10 rounded-lg text-green-400"><Calendar size={24}/></div>
                                </div>
                                <p className="text-sm text-gray-400 uppercase font-bold">Agendados Hoje</p>
                                <p className="text-3xl font-black text-white">14</p>
                            </div>
                            <div className="bg-gray-900/50 p-6 rounded-xl border border-white/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400"><DollarSign size={24}/></div>
                                </div>
                                <p className="text-sm text-gray-400 uppercase font-bold">Faturamento (Mês)</p>
                                <p className="text-3xl font-black text-white">R$ 42.850,00</p>
                            </div>
                        </div>

                        {/* Recent Appointments */}
                        <div className="bg-gray-900/50 rounded-xl border border-white/10 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-white flex items-center gap-2"><Clock className="text-blue-500"/> Próximos Atendimentos</h3>
                                <span className="text-xs text-gray-500">Hoje, 24 Out</span>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { time: '09:00', name: 'Mariana Costa', proc: 'Avaliação Geral', status: 'Confirmado', color: 'green' },
                                    { time: '10:30', name: 'Pedro Alves', proc: 'Canal (Sessão 2)', status: 'Na Sala', color: 'blue' },
                                    { time: '13:00', name: 'Julia Silva', proc: 'Clareamento', status: 'Agendado', color: 'gray' },
                                    { time: '14:30', name: 'Roberto Dias', proc: 'Implante', status: 'Agendado', color: 'gray' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-gray-800/40 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-gray-800 text-white font-mono px-3 py-2 rounded border border-white/10 font-bold">{item.time}</div>
                                            <div>
                                                <p className="text-white font-bold">{item.name}</p>
                                                <p className="text-xs text-gray-400">{item.proc}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full bg-${item.color}-500/10 text-${item.color}-400 border border-${item.color}-500/20`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- SCENARIO 2: MOBILE AGENDA & FINANCE --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 print:break-inside-avoid">
            <div>
                <h2 className="text-2xl font-black text-gray-800 mb-6 border-l-4 border-purple-500 pl-4 print:hidden">2. Agenda Mobile</h2>
                <div className="mx-auto w-[360px] h-[720px] bg-gray-950 rounded-[3rem] border-[8px] border-gray-900 shadow-2xl relative overflow-hidden flex flex-col">
                    {/* Status Bar Fake */}
                    <div className="h-6 w-full bg-gray-950 flex justify-between px-6 items-center text-[10px] text-white pt-2">
                        <span>9:41</span>
                        <div className="flex gap-1"><span className="w-3 h-3 bg-white rounded-full opacity-20"></span><span className="w-3 h-3 bg-white rounded-full"></span></div>
                    </div>

                    {/* App Header */}
                    <div className="p-4 flex justify-between items-center bg-gray-900/50 backdrop-blur border-b border-white/5">
                        <div className="flex items-center gap-2 text-white font-bold">
                            <Logo className="w-5 h-5"/> DentiHub
                        </div>
                        <Menu className="text-gray-400" size={24}/>
                    </div>

                    {/* App Content */}
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-950">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white">Agenda</h2>
                            <button className="bg-blue-600 text-white p-2 rounded-lg shadow-lg shadow-blue-900/20"><Plus size={18}/></button>
                        </div>

                        {/* Calendar Strip */}
                        <div className="flex justify-between mb-6 bg-gray-900 p-2 rounded-xl border border-white/5">
                            {['S','T','Q','Q','S'].map((d, i) => (
                                <div key={i} className={`flex flex-col items-center justify-center w-10 h-14 rounded-lg ${i === 2 ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>
                                    <span className="text-[10px] font-bold">{d}</span>
                                    <span className="font-bold text-sm">{22+i}</span>
                                </div>
                            ))}
                        </div>

                        {/* Appointments */}
                        <div className="space-y-3">
                            <div className="relative pl-4 border-l-2 border-green-500">
                                <div className="bg-gray-900 p-3 rounded-lg border border-white/5">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-green-400 text-xs font-bold bg-green-500/10 px-2 py-0.5 rounded">09:00 - 10:00</span>
                                        <Check size={14} className="text-green-500"/>
                                    </div>
                                    <p className="text-white font-bold">Ana Clara</p>
                                    <p className="text-xs text-gray-500">Limpeza e Profilaxia</p>
                                </div>
                            </div>
                            <div className="relative pl-4 border-l-2 border-blue-500">
                                <div className="bg-gray-900 p-3 rounded-lg border border-white/5">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-blue-400 text-xs font-bold bg-blue-500/10 px-2 py-0.5 rounded">10:30 - 11:30</span>
                                    </div>
                                    <p className="text-white font-bold">Carlos Mendes</p>
                                    <p className="text-xs text-gray-500">Restauração 46</p>
                                </div>
                            </div>
                            <div className="relative pl-4 border-l-2 border-gray-700">
                                <div className="bg-gray-900 p-3 rounded-lg border border-white/5 opacity-60">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-400 text-xs font-bold bg-gray-700/50 px-2 py-0.5 rounded">12:00 - 13:00</span>
                                    </div>
                                    <p className="text-white font-bold">Almoço</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-black text-gray-800 mb-6 border-l-4 border-green-500 pl-4 print:hidden">3. Financeiro Mobile</h2>
                <div className="mx-auto w-[360px] h-[720px] bg-gray-950 rounded-[3rem] border-[8px] border-gray-900 shadow-2xl relative overflow-hidden flex flex-col">
                    {/* Status Bar Fake */}
                    <div className="h-6 w-full bg-gray-950 flex justify-between px-6 items-center text-[10px] text-white pt-2">
                        <span>9:42</span>
                        <div className="flex gap-1"><span className="w-3 h-3 bg-white rounded-full opacity-20"></span><span className="w-3 h-3 bg-white rounded-full"></span></div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-950">
                        <div className="flex justify-between items-center mb-6 mt-2">
                            <h2 className="text-lg font-bold text-white">Financeiro</h2>
                            <Filter className="text-gray-400" size={20}/>
                        </div>

                        {/* Balance Card */}
                        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-white/10 mb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} className="text-white"/></div>
                            <p className="text-gray-400 text-xs font-bold uppercase mb-1">Saldo Atual</p>
                            <p className="text-3xl font-black text-white mb-4">R$ 12.450</p>
                            <div className="flex gap-4">
                                <div className="flex items-center text-green-400 text-xs font-bold"><TrendingUp size={14} className="mr-1"/> + R$ 2.500</div>
                                <div className="flex items-center text-red-400 text-xs font-bold"><TrendingDown size={14} className="mr-1"/> - R$ 850</div>
                            </div>
                        </div>

                        <h3 className="text-white font-bold mb-3 text-sm">Histórico Recente</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><TrendingUp size={16}/></div>
                                    <div><p className="text-white text-sm font-bold">Consulta Particular</p><p className="text-[10px] text-gray-500">Hoje, 10:00</p></div>
                                </div>
                                <span className="text-green-400 font-bold text-sm">+ R$ 350</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><TrendingDown size={16}/></div>
                                    <div><p className="text-white text-sm font-bold">Dental Cremer</p><p className="text-[10px] text-gray-500">Ontem</p></div>
                                </div>
                                <span className="text-red-400 font-bold text-sm">- R$ 1.200</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><TrendingUp size={16}/></div>
                                    <div><p className="text-white text-sm font-bold">Ortodontia (Mensal)</p><p className="text-[10px] text-gray-500">22 Out</p></div>
                                </div>
                                <span className="text-green-400 font-bold text-sm">+ R$ 200</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- SCENARIO 3: AI RECORD (Tablet/Desktop) --- */}
        <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-black text-gray-800 mb-6 border-l-4 border-purple-500 pl-4 print:hidden">4. Prontuário IA</h2>
            <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 shadow-2xl max-w-4xl mx-auto relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2"><Mic className="text-purple-500"/> Prontuário Inteligente</h3>
                        <p className="text-gray-400 text-sm mt-1">Transcrição e Análise Automática</p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-500/30 text-purple-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> IA Ativa
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    {/* Left: Input */}
                    <div className="bg-gray-900 rounded-xl p-6 border border-white/5 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-purple-500/50 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                            <Mic size={40} className="text-purple-400"/>
                        </div>
                        <p className="text-white font-bold mb-1">Áudio Processado</p>
                        <p className="text-gray-500 text-xs mb-4">Duração: 02:14</p>
                        <div className="w-full bg-gray-800 h-10 rounded-lg flex items-center justify-center gap-1 px-4">
                            {[...Array(20)].map((_,i) => (
                                <div key={i} className="w-1 bg-purple-500/50 rounded-full" style={{height: Math.random()*20+10+'px'}}></div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Output */}
                    <div className="space-y-4">
                        <div className="bg-gray-900 rounded-xl p-4 border border-white/5 border-l-4 border-l-purple-500">
                            <span className="text-purple-400 text-xs font-bold uppercase block mb-1">S (Subjetivo)</span>
                            <p className="text-gray-300 text-sm">Paciente relata sensibilidade no dente 26 ao ingerir líquidos gelados. Dor iniciou há 3 dias.</p>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-white/5 border-l-4 border-l-blue-500">
                            <span className="text-blue-400 text-xs font-bold uppercase block mb-1">O (Objetivo)</span>
                            <p className="text-gray-300 text-sm">Exame clínico revela retração gengival vestibular no 26. Sem cárie visível. Teste térmico positivo.</p>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-white/5 border-l-4 border-l-green-500">
                            <span className="text-green-400 text-xs font-bold uppercase block mb-1">P (Plano)</span>
                            <p className="text-gray-300 text-sm">Aplicação de dessensibilizante tópico e orientação de escovação. Reavaliação em 15 dias.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

      </div>
    </div>
  );
};

export default MarketingKit;
