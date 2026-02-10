
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { ArrowLeft, Check, X, HelpCircle, Star } from 'lucide-react';

const PlansComparisonPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goToAuth = (view: 'login' | 'signup' = 'login') => {
    navigate('/auth', { state: { view } });
  };

  const features = [
    { category: "Essencial", items: [
        { 
            name: "Dentistas", 
            description: "Quantidade de profissionais de saúde que podem ter agenda própria e acesso ao sistema.",
            free: "1", starter: "Até 3", pro: "Até 5", ent: "Ilimitado" 
        },
        { 
            name: "Pacientes", 
            description: "Número total de fichas de pacientes que podem ser cadastradas na base de dados.",
            free: "Até 30", starter: "Até 100", pro: "Ilimitado", ent: "Ilimitado" 
        },
        { 
            name: "Gestão de Perfis e Acessos", 
            description: "Controle de permissões para recepcionistas e outros funcionários acessarem o sistema.",
            free: true, starter: true, pro: true, ent: true 
        },
        { 
            name: "Agenda Online (Link)", 
            description: "Link público personalizado para enviar aos pacientes, permitindo que eles solicitem agendamentos sozinhos.",
            free: true, starter: true, pro: true, ent: true 
        },
    ]},
    { category: "Inteligência Artificial", items: [
        { 
            name: "Transcrição de Voz", 
            description: "Tecnologia que ouve o que você dita e transforma em texto automaticamente.",
            free: "3 usos (total)", starter: "5 usos/dia/dentista", pro: "10 usos/dia/dentista", ent: "Personalizado" 
        },
        { 
            name: "Resumo SOAP Automático", 
            description: "A IA organiza o texto transcrito no padrão clínico SOAP (Subjetivo, Objetivo, Avaliação, Plano).",
            free: true, starter: true, pro: true, ent: true 
        },
    ]},
    { category: "Gestão & Financeiro", items: [
        { 
            name: "Fluxo de Caixa", 
            description: "Controle completo de entradas e saídas, contas a pagar e receber.",
            free: true, starter: true, pro: true, ent: true 
        },
        { 
            name: "Controle de Estoque", 
            description: "Gestão de materiais e alertas de reposição.",
            free: true, starter: true, pro: true, ent: true 
        },
    ]},
    { category: "Comunicação", items: [
        { 
            name: "Lembretes por E-mail", 
            description: "Envio automático de e-mails para lembrar o paciente da consulta e reduzir faltas.",
            free: true, starter: true, pro: true, ent: true 
        },
        { 
            name: "Campanhas de Retorno", 
            description: "Ferramenta para filtrar pacientes inativos e enviar e-mails em massa convidando para retorno (Recall).",
            free: true, starter: true, pro: true, ent: true 
        },
    ]},
    { category: "Suporte & Segurança", items: [
        { 
            name: "Upload de Arquivos (Exames/Docs)", 
            description: "Armazenamento na nuvem para anexar raios-x, fotos e documentos PDF ao prontuário do paciente.",
            free: false, starter: true, pro: true, ent: true 
        },
        { 
            name: "Backups Diários", 
            description: "Cópia de segurança automática de todos os seus dados para garantir que nada seja perdido.",
            free: true, starter: true, pro: true, ent: true 
        },
        { 
            name: "Suporte Técnico", 
            description: "Canal de atendimento para tirar dúvidas e resolver problemas técnicos.",
            free: "E-mail", starter: "E-mail", pro: "E-mail", ent: "E-mail" 
        },
    ]}
  ];

  const renderValue = (val: string | boolean) => {
      if (typeof val === 'boolean') {
          return val ? <Check className="mx-auto text-green-500" size={20}/> : <X className="mx-auto text-gray-600" size={20}/>;
      }
      return <span className="text-sm font-medium">{val}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 hidden md:block">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
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
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight">
                Comparativo de Planos
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Escolha a opção ideal para o momento atual da sua clínica. Você pode mudar de plano a qualquer momento.
            </p>
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="p-6 bg-gray-900 border-b border-r border-white/10 min-w-[200px] sticky left-0 z-20">
                                <span className="text-gray-400 font-medium text-sm uppercase tracking-wider">Recursos</span>
                            </th>
                            
                            {/* Free Header */}
                            <th className="p-6 bg-gray-900/80 border-b border-white/10 text-center min-w-[180px]">
                                <h3 className="text-xl font-bold text-white mb-1">Gratuito</h3>
                                <p className="text-2xl font-black text-gray-400">R$ 0<span className="text-xs font-normal">/mês</span></p>
                                <button onClick={() => goToAuth('signup')} className="mt-4 w-full py-2 rounded-lg border border-white/20 text-white text-sm font-bold hover:bg-white/5 transition">Criar Conta</button>
                            </th>

                            {/* Starter Header */}
                            <th className="p-6 bg-blue-900/10 border-b border-blue-500/20 text-center min-w-[180px] relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                                <h3 className="text-xl font-bold text-blue-400 mb-1">Starter</h3>
                                <p className="text-2xl font-black text-white">R$ 100<span className="text-xs font-normal text-gray-400">/mês</span></p>
                                <button onClick={() => goToAuth('signup')} className="mt-4 w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-900/20">Assinar</button>
                            </th>

                            {/* Pro Header */}
                            <th className="p-6 bg-yellow-900/10 border-b border-yellow-500/20 text-center min-w-[180px] relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                                <div className="absolute top-3 right-3 text-yellow-500"><Star size={16} fill="currentColor"/></div>
                                <h3 className="text-xl font-bold text-yellow-400 mb-1">Pro</h3>
                                <p className="text-2xl font-black text-white">R$ 300<span className="text-xs font-normal text-gray-400">/mês</span></p>
                                <button onClick={() => goToAuth('signup')} className="mt-4 w-full py-2 rounded-lg bg-yellow-500 text-black text-sm font-bold hover:bg-yellow-400 transition shadow-lg shadow-yellow-900/20">Assinar</button>
                            </th>

                            {/* Enterprise Header */}
                            <th className="p-6 bg-gray-900/80 border-b border-white/10 text-center min-w-[180px]">
                                <h3 className="text-xl font-bold text-purple-400 mb-1">Enterprise</h3>
                                <p className="text-sm font-medium text-gray-400 mt-2 h-8">Sob Medida</p>
                                <button onClick={() => goToAuth('signup')} className="mt-4 w-full py-2 rounded-lg border border-purple-500/50 text-purple-400 text-sm font-bold hover:bg-purple-900/20 transition">Assinar</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {features.map((section, idx) => (
                            <React.Fragment key={idx}>
                                <tr>
                                    <td colSpan={5} className="p-4 bg-gray-900/80 text-xs font-bold text-gray-500 uppercase tracking-widest sticky left-0 z-10">
                                        {section.category}
                                    </td>
                                </tr>
                                {section.items.map((item, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 border-r border-white/5 text-sm text-gray-300 font-medium sticky left-0 bg-gray-950 md:bg-transparent z-10 flex items-center">
                                            {item.name}
                                            <span title={item.description} className="ml-2 cursor-help text-gray-500 hover:text-primary transition-colors">
                                                <HelpCircle size={14} />
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-gray-400">{renderValue(item.free)}</td>
                                        <td className="p-4 text-center text-blue-200 bg-blue-900/5">{renderValue(item.starter)}</td>
                                        <td className="p-4 text-center text-yellow-200 bg-yellow-900/5 font-medium">{renderValue(item.pro)}</td>
                                        <td className="p-4 text-center text-gray-400">{renderValue(item.ent)}</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* FAQ Short */}
        <div className="mt-20 grid md:grid-cols-2 gap-8">
            <div className="bg-gray-900/50 p-6 rounded-xl border border-white/5">
                <h3 className="font-bold text-white mb-2">Posso mudar de plano depois?</h3>
                <p className="text-gray-400 text-sm">Sim, você pode fazer upgrade ou downgrade a qualquer momento direto pelo painel de configurações.</p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-xl border border-white/5">
                <h3 className="font-bold text-white mb-2">Preciso de cartão para o plano Gratuito?</h3>
                <p className="text-gray-400 text-sm">Não. Você pode usar o plano gratuito para sempre sem cadastrar cartão de crédito.</p>
            </div>
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

export default PlansComparisonPage;
