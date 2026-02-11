import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { ArrowLeft, Check, X, HelpCircle, CheckCircle, XCircle } from 'lucide-react';

const SystemComparisonPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goToAuth = (view: 'login' | 'signup' = 'login') => {
    navigate('/auth', { state: { view } });
  };

  const comparisonData = [
    {
        category: "Tecnologia & Acesso",
        items: [
            { feature: "Infraestrutura", dentihub: "100% Nuvem (Acesse de onde quiser)", legacy: "Servidor Local (Preso na clínica)" },
            { feature: "Acesso Mobile", dentihub: "Nativo (Celular e Tablet)", legacy: "Não funciona ou Acesso Remoto lento" },
            { feature: "Instalação", dentihub: "Instantânea (Nenhuma)", legacy: "Técnico presencial / CD / Pendrive" },
            { feature: "Backups", dentihub: "Automáticos & Criptografados", legacy: "Manual (Risco de HD queimado/Vírus)" },
        ]
    },
    {
        category: "Produtividade Clínica",
        items: [
            { feature: "Prontuário", dentihub: "IA (Voz para Texto + SOAP Automático)", legacy: "Digitação Manual demorada" },
            { feature: "Agendamento", dentihub: "Híbrido (Link Online + Balcão)", legacy: "Apenas Balcão/Telefone" },
            { feature: "Confirmação", dentihub: "Automática (E-mail Interativo)", legacy: "Manual (WhatsApp um por um)" },
            { feature: "Marketing (Recall)", dentihub: "Filtros e Disparos em Massa", legacy: "Relatórios manuais complexos" },
        ]
    },
    {
        category: "Modelo Comercial",
        items: [
            { feature: "Custo Inicial", dentihub: "Zero (Grátis para começar)", legacy: "Taxa de Licença/Implantação alta" },
            { feature: "Contrato", dentihub: "Mensal (Cancele quando quiser)", legacy: "Fidelidade anual + Multa" },
            { feature: "Atualizações", dentihub: "Automáticas e Gratuitas", legacy: "Pagas ou requerem visita técnica" },
            { feature: "Suporte", dentihub: "Incluso no plano", legacy: "Cobrado por hora/visita" },
        ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 hidden md:block">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

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

      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        
        <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wide mb-6">
                Comparativo de Tecnologia
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
                DentiHub vs. Sistemas Tradicionais
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Veja porque clínicas modernas estão migrando de softwares antigos e planilhas para a nossa plataforma inteligente.
            </p>
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="p-6 bg-gray-900 border-b border-r border-white/10 min-w-[200px] sticky left-0 z-20">
                                <span className="text-gray-400 font-medium text-sm uppercase tracking-wider">Recurso / Funcionalidade</span>
                            </th>
                            
                            {/* DentiHub Header */}
                            <th className="p-6 bg-blue-900/10 border-b border-blue-500/20 text-center min-w-[250px] relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                                <h3 className="text-xl font-bold text-blue-400 mb-1 flex items-center justify-center gap-2">
                                    DentiHub <CheckCircle size={20} className="fill-blue-500 text-gray-900"/>
                                </h3>
                                <p className="text-sm text-gray-400 mb-4">SaaS Moderno (Nuvem)</p>
                                <button onClick={() => goToAuth('signup')} className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-900/20">Criar Conta Grátis</button>
                            </th>

                            {/* Legacy Header */}
                            <th className="p-6 bg-gray-900/80 border-b border-white/10 text-center min-w-[250px] opacity-80">
                                <h3 className="text-xl font-bold text-gray-500 mb-1 flex items-center justify-center gap-2">
                                    Outros Sistemas <XCircle size={20}/>
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">Software Legado / Planilha</p>
                                <div className="w-full py-2 rounded-lg border border-white/5 text-gray-600 text-sm font-bold cursor-not-allowed bg-white/5">Tecnologia Antiga</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {comparisonData.map((section, idx) => (
                            <React.Fragment key={idx}>
                                <tr>
                                    <td colSpan={3} className="p-4 bg-gray-900/80 text-xs font-bold text-gray-500 uppercase tracking-widest sticky left-0 z-10 border-y border-white/5">
                                        {section.category}
                                    </td>
                                </tr>
                                {section.items.map((item, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 border-r border-white/5 text-sm text-gray-300 font-medium sticky left-0 bg-gray-950 md:bg-transparent z-10 flex items-center h-full min-h-[60px]">
                                            {item.feature}
                                        </td>
                                        <td className="p-4 text-center text-blue-200 bg-blue-900/5 font-medium border-x border-blue-500/10">
                                            {item.dentihub}
                                        </td>
                                        <td className="p-4 text-center text-gray-500">
                                            {item.legacy}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
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