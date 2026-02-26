import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Calendar, Users, UserCheck, Mic, MessageSquare, DollarSign, Box, 
  BellRing, BookOpen, Settings, Smartphone, Tablet, Monitor, Clock, Menu, X, Lock,
  CheckCircle, ArrowUpCircle, ArrowDownCircle, Search, MoreVertical, Plus, Filter,
  ChevronLeft, ChevronRight, LogOut, Trash2, Edit2, Download, Upload, ShieldCheck,
  CreditCard, FileText, FolderOpen, Send, HelpCircle, AlertTriangle, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../Logo';

const InteractiveMockup: React.FC = () => {
  const navigate = useNavigate();
  const mockupRef = useRef<HTMLDivElement>(null);
  const [activeMockup, setActiveMockup] = useState('Visão Geral');
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [mockupMobileMenuOpen, setMockupMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setDevice('mobile');
    }
  }, []);

  const goToAuth = () => {
    navigate('/auth', { state: { view: 'signup' } });
  };

  const mockupMenu = [
    { label: 'Visão Geral', icon: LayoutDashboard, id: 'dashboard' },
    { label: 'Agenda', icon: Calendar, id: 'calendar' },
    { label: 'Pacientes', icon: Users, id: 'clients' },
    { label: 'Dentistas', icon: UserCheck, id: 'dentists' },
    { label: 'Prontuário IA', icon: Mic, id: 'smart-record' },
    { label: 'Mensageria', icon: MessageSquare, id: 'messaging' },
    { label: 'Financeiro', icon: DollarSign, id: 'finance' },
    { label: 'Estoque', icon: Box, id: 'inventory' },
    { label: 'Solicitações', icon: BellRing, id: 'requests', badge: 1 },
    { label: 'Guia Prático', icon: BookOpen, id: 'guide' },
    { label: 'Configurações', icon: Settings, id: 'settings' },
  ];

  // --- FAKE DATA ---
  const fakeAppointments = [
      { time: '09:00', name: 'Ana Souza', service: 'Limpeza (Profilaxia)', status: 'completed', color: '#10b981', dentist: 'Dr. André' },
      { time: '10:30', name: 'Carlos Oliveira', service: 'Canal (Endo)', status: 'confirmed', color: '#f59e0b', dentist: 'Dra. Júlia' },
      { time: '14:00', name: 'Mariana Costa', service: 'Avaliação', status: 'scheduled', color: '#3b82f6', dentist: 'Dr. André' },
      { time: '16:00', name: 'Pedro Santos', service: 'Restauração', status: 'scheduled', color: '#3b82f6', dentist: 'Dr. André' },
      { time: '17:30', name: 'Roberto Silva', service: 'Implante', status: 'cancelled', color: '#ef4444', dentist: 'Dra. Júlia' },
  ];

  const fakePatients = [
      { name: 'Ana Souza', email: 'ana.souza@email.com', phone: '(11) 99999-1234', cpf: '123.***.***-00' },
      { name: 'Carlos Oliveira', email: 'carlos.o@email.com', phone: '(11) 98888-5678', cpf: '456.***.***-11' },
      { name: 'Mariana Costa', email: 'mari.costa@email.com', phone: '(11) 97777-9012', cpf: '789.***.***-22' },
      { name: 'Roberto Lima', email: 'beto.lima@email.com', phone: '(11) 96666-3456', cpf: '321.***.***-33' },
      { name: 'Fernanda Dias', email: 'fer.dias@email.com', phone: '(11) 95555-1234', cpf: '654.***.***-44' },
  ];

  const fakeDentists = [
      { name: 'Dr. André Silva', cro: '12345', email: 'andre@dentihub.com', color: '#3b82f6' },
      { name: 'Dra. Júlia Costa', cro: '67890', email: 'julia@dentihub.com', color: '#f59e0b' },
  ];

  const fakeTransactions = [
      { date: '17/02/2024', desc: 'Consulta - Ana Souza', type: 'income', amount: 'R$ 250,00', status: 'paid' },
      { date: '17/02/2024', desc: 'Material Descartável', type: 'expense', amount: 'R$ 180,00', status: 'paid' },
      { date: '16/02/2024', desc: 'Manutenção Equip.', type: 'expense', amount: 'R$ 450,00', status: 'pending' },
      { date: '16/02/2024', desc: 'Consulta - Carlos O.', type: 'income', amount: 'R$ 500,00', status: 'paid' },
  ];

  const fakeInventory = [
      { name: 'Anestésico Tópico', qtd: 5, min: 2, unit: 'frascos', category: 'Medicamento' },
      { name: 'Luvas Látex M', qtd: 12, min: 5, unit: 'caixas', category: 'Descartável' },
      { name: 'Sugador', qtd: 4, min: 10, unit: 'pct', category: 'Descartável' },
      { name: 'Resina Composta', qtd: 8, min: 3, unit: 'tubos', category: 'Material' },
  ];

  const fakeMessages = [
      { date: '17/02 09:00', type: 'Lembrete (24h)', recipient: 'Ana Souza', status: 'sent' },
      { date: '16/02 14:00', type: 'Confirmação', recipient: 'Carlos Oliveira', status: 'read' },
      { date: '15/02 10:00', type: 'Campanha Retorno', recipient: 'Lista: Ausentes 6m', status: 'sent' },
  ];

  return (
    <div className="relative mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-up delay-200 flex flex-col items-center">
        
        {/* Device Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-4 p-1.5 bg-gray-900/80 backdrop-blur rounded-full border border-white/10 shadow-xl w-fit">
                <button onClick={() => setDevice('mobile')} className={`p-2 rounded-full transition ${device === 'mobile' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Smartphone size={18} /></button>
                <button onClick={() => setDevice('tablet')} className={`p-2 rounded-full transition ${device === 'tablet' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Tablet size={18} /></button>
                <button onClick={() => setDevice('desktop')} className={`p-2 rounded-full transition ${device === 'desktop' ? 'bg-gray-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}><Monitor size={18} /></button>
            </div>
        </div>

        {/* The Frame */}
        <div 
            ref={mockupRef}
            className={`transition-all duration-700 ease-in-out relative bg-gray-950 shadow-2xl overflow-hidden group border border-white/10
                ${device === 'desktop' ? 'w-full max-w-6xl rounded-xl h-[700px] hover:shadow-[0_0_50px_rgba(124,58,237,0.2)]' : ''}
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
                
                {/* Mockup Sidebar - Estilo Real */}
                <div className={`bg-gray-900/95 border-r border-white/5 flex-shrink-0 z-20 flex flex-col ${device === 'mobile' ? 'hidden' : 'w-60'}`}>
                    <div className="flex items-center gap-2 text-white font-bold p-4 border-b border-white/5">
                        <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-purple-500/20 shrink-0">
                            <Logo className="w-5 h-5 text-white" />
                        </div> 
                        <span className="text-sm">DentiHub</span>
                    </div>
                    
                    <div className="px-4 py-4 bg-gray-900/50 border-b border-white/5">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Logado como</p>
                        <p className="text-sm font-medium text-white truncate">dr.andre@dentihub.com</p>
                        <div className="flex items-center mt-2 space-x-2">
                            <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full inline-block font-bold border border-blue-500/20">Dentista</span>
                            <span className="text-[10px] bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded-full inline-block uppercase font-bold border border-purple-500/20">PRO</span>
                        </div>
                    </div>

                    <div className="p-3 space-y-1 mt-2 overflow-y-auto flex-1 custom-scrollbar">
                        {mockupMenu.map(item => (
                            <button key={item.label} onClick={() => setActiveMockup(item.label)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeMockup === item.label ? 'bg-primary text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] border border-primary/50' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}`}>
                                <div className="relative">
                                    <item.icon size={18} className={item.id === 'smart-record' ? 'text-purple-400' : ''}/>
                                    {item.badge && <span className="absolute -top-1 -right-1 bg-red-500 w-2.5 h-2.5 rounded-full border-2 border-gray-900"></span>}
                                </div>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-white/5">
                        <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                            <LogOut size={18} className="mr-3" /> Sair
                        </button>
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

                    <div className="p-6 sm:p-8">
                        
                        {/* Conteúdo: Visão Geral */}
                        {activeMockup === 'Visão Geral' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <h2 className="text-2xl font-bold text-white">Visão Geral</h2>
                                    <div className="bg-gray-900 p-1 rounded-lg border border-white/10 flex items-center shadow-sm">
                                        <Filter size={16} className="text-gray-500 ml-2 mr-2" />
                                        <span className="text-sm text-white pr-4">Todos os Dentistas</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400"><Users size={24} /></div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Pacientes</p>
                                                <h3 className="text-3xl font-black text-white mt-1">148</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="p-3 bg-green-500/20 rounded-lg text-green-400"><Calendar size={24} /></div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Agendados Hoje</p>
                                                <h3 className="text-3xl font-black text-white mt-1">12</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="p-3 bg-yellow-500/20 rounded-lg text-yellow-400"><DollarSign size={24} /></div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Saldo (Mês)</p>
                                                <h3 className="text-3xl font-black text-white mt-1">R$ 18.590,00</h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* ... Rest of Dashboard Content (Appointment List, Stats) ... */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 bg-gray-900/60 backdrop-blur-md rounded-xl border border-white/5 shadow-lg flex flex-col h-full">
                                        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-gray-800/20">
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                <Clock size={18} className="text-gray-400"/> Próximos Agendamentos
                                            </h3>
                                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded border border-white/5">5 na fila</span>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {fakeAppointments.map((appt, i) => (
                                                <div key={i} className="flex items-center p-3 bg-gray-800/40 rounded-lg border border-white/5 hover:bg-gray-800/80 transition">
                                                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-900 rounded-lg border border-white/10 mr-4">
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase">HOJE</span>
                                                        <span className="text-sm font-black text-white leading-none">{appt.time}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-white text-sm truncate">{appt.name}</h4>
                                                        <div className="text-xs text-gray-500">{appt.service}</div>
                                                    </div>
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: appt.color }}></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Financial Mini Stats */}
                                    <div className="flex flex-col gap-6">
                                        <div className="bg-gray-900/60 backdrop-blur-md rounded-xl border border-white/5 shadow-lg p-5 flex-1">
                                            <h3 className="font-bold text-white flex items-center gap-2 text-sm mb-4">
                                                <span className="p-1.5 bg-green-500/20 rounded-lg text-green-400"><ArrowUpCircle size={16}/></span> 
                                                Entradas (Semana)
                                            </h3>
                                            <p className="text-lg font-black text-white">R$ 4.250</p>
                                        </div>
                                        <div className="bg-gray-900/60 backdrop-blur-md rounded-xl border border-white/5 shadow-lg p-5 flex-1">
                                            <h3 className="font-bold text-white flex items-center gap-2 text-sm mb-4">
                                                <span className="p-1.5 bg-red-500/20 rounded-lg text-red-400"><ArrowDownCircle size={16}/></span> 
                                                Saídas (Semana)
                                            </h3>
                                            <p className="text-lg font-black text-white">R$ 890</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Conteúdo: Agenda */}
                        {activeMockup === 'Agenda' && (
                            <div className="space-y-6 animate-fade-in flex flex-col h-full">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <h2 className="text-2xl font-bold text-white">Agenda</h2>
                                    <div className="flex items-center space-x-2 bg-gray-900 border border-white/10 p-1 rounded-lg shadow-sm">
                                        <button className="p-1.5 hover:bg-white/10 rounded-md text-gray-400"><ChevronLeft size={20}/></button>
                                        <span className="text-sm font-bold text-white min-w-[120px] text-center">Fevereiro 2024</span>
                                        <button className="p-1.5 hover:bg-white/10 rounded-md text-gray-400"><ChevronRight size={20}/></button>
                                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                                        <button className="text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5">Hoje</button>
                                    </div>
                                    <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg"><Plus size={16}/> Novo Agendamento</button>
                                </div>
                                <div className="bg-gray-900/60 rounded-xl border border-white/5 shadow-lg flex-1 overflow-hidden flex flex-col">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-white/5">
                                            <thead className="bg-gray-800/50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Horário</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Paciente</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {fakeAppointments.map((app, i) => (
                                                    <tr key={i} className="hover:bg-gray-800/50">
                                                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">{app.time}</td>
                                                        <td className="px-6 py-4"><div className="font-bold text-white text-sm">{app.name}</div><div className="text-xs text-gray-500">{app.service}</div></td>
                                                        <td className="px-6 py-4"><span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-800 text-gray-300 border border-white/10">{app.status}</span></td>
                                                        <td className="px-6 py-4 text-center"><MoreVertical size={16} className="text-gray-500 mx-auto cursor-pointer"/></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Conteúdo: Pacientes */}
                        {activeMockup === 'Pacientes' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <Users className="text-primary" /> Pacientes
                                        <span className="text-sm font-normal bg-gray-800 text-gray-400 px-2.5 py-0.5 rounded-lg border border-white/10">148</span>
                                    </h2>
                                    <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg"><Plus size={16}/> Novo Paciente</button>
                                </div>
                                <div className="bg-gray-900/60 rounded-xl border border-white/5 shadow-lg overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-800/50 text-xs text-gray-500 uppercase">
                                            <tr><th className="px-6 py-4">Paciente</th><th className="px-6 py-4">Contato</th><th className="px-6 py-4 hidden sm:table-cell">CPF</th><th className="px-6 py-4 text-center">Ações</th></tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-white/5">
                                            {fakePatients.map((p, i) => (
                                                <tr key={i} className="hover:bg-gray-800/30">
                                                    <td className="px-6 py-4"><div className="flex items-center"><div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold mr-3 border border-white/10">{p.name.charAt(0)}</div><div className="font-bold text-white">{p.name}</div></div></td>
                                                    <td className="px-6 py-4"><div className="text-gray-400 text-xs">{p.phone}</div><div className="text-gray-500 text-[10px]">{p.email}</div></td>
                                                    <td className="px-6 py-4 text-gray-500 text-xs hidden sm:table-cell font-mono">{p.cpf}</td>
                                                    <td className="px-6 py-4 text-center"><MoreVertical size={16} className="text-gray-500 mx-auto cursor-pointer"/></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Conteúdo: Dentistas */}
                        {activeMockup === 'Dentistas' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3"><UserCheck className="text-primary"/> Dentistas</h2>
                                    <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Novo</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {fakeDentists.map((d, i) => (
                                        <div key={i} className="bg-gray-900/60 rounded-lg border border-white/5 p-4 flex flex-col relative overflow-hidden group" style={{ borderLeft: `4px solid ${d.color}` }}>
                                            <div className="flex items-center mb-3">
                                                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 border border-white/10" style={{ backgroundColor: d.color }}>{d.name.charAt(0)}</div>
                                                <div><h3 className="font-bold text-white text-sm">{d.name}</h3><p className="text-xs text-gray-500">CRO: {d.cro}</p></div>
                                            </div>
                                            <div className="mt-auto flex justify-end gap-2 border-t border-white/5 pt-3">
                                                <button className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded"><Edit2 size={14}/></button>
                                                <button className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Conteúdo: Prontuário IA */}
                        {activeMockup === 'Prontuário IA' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Mic className="text-purple-400"/> Prontuário Inteligente</h2>
                                </div>
                                <div className="bg-gray-900/60 p-6 rounded-xl border border-white/5 shadow-lg">
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div><label className="text-xs font-bold text-gray-400 mb-1 block">Paciente</label><div className="bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm">Selecione um paciente...</div></div>
                                        <div><label className="text-xs font-bold text-gray-400 mb-1 block">Dentista</label><div className="bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm">Dr. André Silva</div></div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30">
                                        <div className="h-20 w-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg mb-4 cursor-pointer hover:scale-105 transition"><Mic size={32} text-white/></div>
                                        <p className="text-gray-400 text-sm">Clique para iniciar a gravação</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Conteúdo: Mensageria */}
                        {activeMockup === 'Mensageria' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Mensageria</h2></div>
                                <div className="flex gap-4 border-b border-white/10 mb-4"><div className="pb-2 border-b-2 border-primary text-primary font-bold text-sm">Histórico</div><div className="pb-2 text-gray-500 font-bold text-sm">Campanhas</div></div>
                                <div className="bg-gray-900/60 rounded-xl border border-white/5 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-800/50 text-xs text-gray-500 uppercase"><tr><th className="p-4">Data</th><th className="p-4">Tipo</th><th className="p-4">Destinatário</th><th className="p-4">Status</th></tr></thead>
                                        <tbody className="text-sm divide-y divide-white/5">
                                            {fakeMessages.map((m, i) => (
                                                <tr key={i} className="hover:bg-gray-800/30"><td className="p-4 text-gray-400">{m.date}</td><td className="p-4 text-white font-medium">{m.type}</td><td className="p-4 text-gray-300">{m.recipient}</td><td className="p-4"><span className="bg-green-900/20 text-green-400 px-2 py-1 rounded text-xs font-bold border border-green-500/20">{m.status}</span></td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Conteúdo: Financeiro */}
                        {activeMockup === 'Financeiro' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Financeiro</h2><button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Nova Transação</button></div>
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="bg-gray-800 p-4 rounded-lg border border-white/5"><p className="text-xs text-gray-400 uppercase font-bold">Saldo</p><p className="text-xl font-black text-white">R$ 12.450,00</p></div>
                                    <div className="bg-gray-800 p-4 rounded-lg border border-white/5"><p className="text-xs text-gray-400 uppercase font-bold">Receitas</p><p className="text-xl font-black text-green-400">R$ 15.200,00</p></div>
                                    <div className="bg-gray-800 p-4 rounded-lg border border-white/5"><p className="text-xs text-gray-400 uppercase font-bold">Despesas</p><p className="text-xl font-black text-red-400">R$ 2.750,00</p></div>
                                </div>
                                <div className="bg-gray-900/60 rounded-xl border border-white/5 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-800/50 text-xs text-gray-500 uppercase"><tr><th className="p-4">Data</th><th className="p-4">Descrição</th><th className="p-4">Status</th><th className="p-4 text-right">Valor</th></tr></thead>
                                        <tbody className="text-sm divide-y divide-white/5">
                                            {fakeTransactions.map((t, i) => (
                                                <tr key={i} className="hover:bg-gray-800/30"><td className="p-4 text-gray-400">{t.date}</td><td className="p-4 text-white">{t.desc}</td><td className="p-4"><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${t.status === 'paid' ? 'bg-green-900/20 text-green-400' : 'bg-yellow-900/20 text-yellow-400'}`}>{t.status}</span></td><td className={`p-4 text-right font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{t.type === 'income' ? '+' : '-'} {t.amount}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Conteúdo: Estoque */}
                        {activeMockup === 'Estoque' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Estoque</h2><button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Novo Item</button></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {fakeInventory.map((item, i) => (
                                        <div key={i} className="bg-gray-900/60 p-4 rounded-lg border border-white/5 flex justify-between items-center">
                                            <div><h4 className="font-bold text-white">{item.name}</h4><p className="text-xs text-gray-400">{item.category} • Mín: {item.min}</p></div>
                                            <div className="text-right"><span className={`text-xl font-bold ${item.qtd <= item.min ? 'text-red-400' : 'text-white'}`}>{item.qtd}</span><span className="text-xs text-gray-500 block">{item.unit}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Conteúdo: Solicitações */}
                        {activeMockup === 'Solicitações' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Solicitações</h2></div>
                                <div className="bg-gray-900/60 p-4 rounded-xl border border-white/5 shadow-lg">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">Danilo Menezes <span className="text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">Novo Paciente</span></h3>
                                            <p className="text-sm text-gray-400 mt-1">Solicitou: <strong>Consulta Geral</strong></p>
                                            <p className="text-sm text-gray-400">Data: <strong>17/02/2026 às 09:00</strong></p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="bg-red-900/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-900/40">Recusar</button>
                                            <button className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-500 shadow-sm">Aceitar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Conteúdo: Guia Prático */}
                        {activeMockup === 'Guia Prático' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Guia Prático</h2></div>
                                <div className="space-y-2">
                                    {['Primeiros Passos', 'Cadastrando Pacientes', 'Usando a Agenda', 'Prontuário com IA', 'Configurando Financeiro'].map((guide, i) => (
                                        <div key={i} className="bg-gray-900/60 p-4 rounded-lg border border-white/5 flex justify-between items-center cursor-pointer hover:bg-gray-800/50 transition">
                                            <span className="font-bold text-gray-300">{guide}</span>
                                            <ChevronRight size={16} className="text-gray-500"/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Conteúdo: Configurações */}
                        {activeMockup === 'Configurações' && (
                            <div className="space-y-6 animate-fade-in">
                                <h2 className="text-2xl font-bold text-white">Configurações</h2>
                                <div className="flex gap-4 border-b border-white/10 mb-4"><div className="pb-2 border-b-2 border-primary text-primary font-bold text-sm">Perfil</div><div className="pb-2 text-gray-500 font-bold text-sm">Equipe</div><div className="pb-2 text-gray-500 font-bold text-sm">Planos</div></div>
                                <div className="space-y-4">
                                    <div><label className="text-xs font-bold text-gray-400 block mb-1">Nome da Clínica</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm" value="Clínica Sorriso" readOnly/></div>
                                    <div><label className="text-xs font-bold text-gray-400 block mb-1">Endereço</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm" value="Rua das Flores, 123" readOnly/></div>
                                    <button className="bg-primary text-white px-4 py-2 rounded text-sm font-bold w-full sm:w-auto">Salvar Alterações</button>
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