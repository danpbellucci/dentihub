
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { ArrowLeft, CheckCircle, XCircle, Cloud, Server, Smartphone, Monitor, Mic, Keyboard, DollarSign, Wallet, ShieldCheck, Lock } from 'lucide-react';

const SystemComparisonPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goToAuth = (view: 'login' | 'signup' = 'login') => {
    navigate('/auth', { state: { view } });
  };

  const comparisons = [
    {
      title: "Prontuário",
      icon: Mic,
      dentiHub: { title: "Inteligência Artificial", desc: "Você dita, a IA escreve e estrutura (SOAP).", positive: true },
      others: { title: "Digitação Manual", desc: "Você perde tempo digitando textos longos após cada consulta.", positive: false }
    },
    {
      title: "Infraestrutura",
      icon: Cloud,
      dentiHub: { title: "100% na Nuvem", desc: "Acesse de qualquer lugar. Sem instalação, sem servidor.", positive: true },
      others: { title: "Servidor Local", desc: "Precisa de um PC dedicado, instalação de CD/Pendrive e técnico de TI.", positive: false }
    },
    {
      title: "Acesso Mobile",
      icon: Smartphone,
      dentiHub: { title: "Mobile First", desc: "Funciona perfeitamente no celular e tablet, igual um App.", positive: true },
      others: { title: "Apenas Desktop", desc: "Interface antiga que não abre no celular ou acesso remoto lento.", positive: false }
    },
    {
      title: "Agendamento",
      icon: Monitor,
      dentiHub: { title: "Híbrido (Online + Balcão)", desc: "Link público para pacientes agendarem sozinhos (tipo Calendly).", positive: true },
      others: { title: "Apenas Balcão", desc: "Dependência total da secretária ou telefone tocando.", positive: false }
    },
    {
      title: "Custo-Benefício",
      icon: DollarSign,
      dentiHub: { title: "Assinatura Transparente", desc: "Sem taxa de adesão, sem multa de cancelamento. Comece grátis.", positive: true },
      others: { title: "Custos Ocultos", desc: "Taxa de implantação alta, custo de suporte e fidelidade contratual.", positive: false }
    },
    {
        title: "Backup & Segurança",
        icon: ShieldCheck,
        dentiHub: { title: "Automático & Criptografado", desc: "Backups diários na nuvem sem você precisar fazer nada.", positive: true },
        others: { title: "Manual & Arriscado", desc: "Você é responsável por fazer backup em HD externo (risco de vírus/perda).", positive: false }
      },
  ];

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white">
      
      {/* Header */}
      <header className="fixed w-full top-0 z-50 border-b border-white/5 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-white font-bold text-xl cursor-pointer hover:opacity-80 transition" onClick={() => navigate('/')}>
              <Logo className="w-8 h-8" />
              <span>Denti<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hub</span></span>
            </div>
            <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-300 hover:text-white transition flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full">
                <ArrowLeft size={16}/> Voltar
            </button>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        
        <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wide mb-6">
                Modernize sua Clínica
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
                DentiHub vs. Sistemas Tradicionais
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Veja porque clínicas modernas estão migrando de softwares antigos para a nossa plataforma inteligente.
            </p>
        </div>

        <div className="grid gap-6">
            {/* Headers da Tabela Visual */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 mb-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                <div className="col-span-2 text-center">Recurso</div>
                <div className="col-span-5 pl-4 text-blue-400">DentiHub</div>
                <div className="col-span-5 pl-4 text-gray-400">Outros Sistemas (ERP Legado)</div>
            </div>

            {comparisons.map((item, idx) => (
                <div key={idx} className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 md:p-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-gray-900/60 transition-colors">
                    
                    {/* Icone e Titulo - Centralizado */}
                    <div className="col-span-12 md:col-span-2 flex md:flex-col items-center md:items-center gap-3 md:gap-1">
                        <div className="p-3 bg-gray-800 rounded-xl border border-white/10 text-gray-300">
                            <item.icon size={24}/>
                        </div>
                        <h3 className="font-bold text-white text-lg md:text-sm text-center">{item.title}</h3>
                    </div>

                    {/* DentiHub Side */}
                    <div className="col-span-12 md:col-span-5 bg-blue-900/10 border border-blue-500/20 rounded-xl p-5 md:p-4 relative overflow-hidden group">
                         <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                         <div className="flex items-start gap-3 relative z-10">
                             <CheckCircle className="text-blue-400 shrink-0 mt-1" size={20} />
                             <div>
                                 <h4 className="font-bold text-white text-lg md:text-base mb-1">{item.dentiHub.title}</h4>
                                 <p className="text-sm text-gray-400 leading-relaxed">{item.dentiHub.desc}</p>
                             </div>
                         </div>
                    </div>

                    {/* Others Side */}
                    <div className="col-span-12 md:col-span-5 bg-gray-800/30 border border-white/5 rounded-xl p-5 md:p-4 relative opacity-80 grayscale-[0.5]">
                         <div className="flex items-start gap-3">
                             <XCircle className="text-gray-500 shrink-0 mt-1" size={20} />
                             <div>
                                 <h4 className="font-bold text-gray-300 text-lg md:text-base mb-1">{item.others.title}</h4>
                                 <p className="text-sm text-gray-500 leading-relaxed">{item.others.desc}</p>
                             </div>
                         </div>
                    </div>

                </div>
            ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center bg-gradient-to-b from-gray-900 to-gray-800 rounded-3xl p-10 border border-white/10 relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white mb-6">Pare de viver no passado</h2>
                <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                    Troque planilhas complexas e softwares lentos por uma gestão fluida, moderna e inteligente.
                </p>
                <button onClick={() => goToAuth('signup')} className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-sky-600 transition shadow-lg shadow-blue-500/20 transform hover:-translate-y-1">
                    Começar Gratuitamente
                </button>
                <p className="text-sm text-gray-500 mt-4">Sem cartão de crédito necessário.</p>
            </div>
             <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-blue-600/10 to-transparent pointer-events-none"></div>
        </div>

      </main>

      <footer className="bg-gray-950 border-t border-white/5 py-12 text-center text-sm text-gray-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
            <p>&copy; {new Date().getFullYear()} DentiHub. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default SystemComparisonPage;
