
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { 
  ArrowLeft, Brain, Clock, ShieldCheck, Database, Mic, Smile, CheckCircle, 
  FileText, Calendar, BellRing, DollarSign, Users, Repeat, Smartphone, Cloud, Lock,
  Search, Menu, X, Box
} from 'lucide-react';

const LearnMorePage: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Garante que a página comece do topo ao ser carregada
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      id: 'agenda',
      title: 'Agenda Inteligente & Online',
      icon: Calendar,
      color: 'text-blue-400',
      bgGlow: 'bg-blue-500/20',
      border: 'border-blue-500/20',
      description: 'O coração da clínica, projetado para eliminar "buracos" e conflitos.',
      details: [
        'Link Público de Agendamento: Envie para pacientes no WhatsApp ou Instagram.',
        'Central de Aprovação: Você decide quem entra na agenda.',
        'Status Coloridos: Visualize rapidamente quem confirmou, pagou ou faltou.',
        'Bloqueio de Horários: Configure férias e folgas facilmente.'
      ]
    },
    {
      id: 'ai',
      title: 'Prontuário com Inteligência Artificial',
      icon: Brain,
      color: 'text-purple-400',
      bgGlow: 'bg-purple-500/20',
      border: 'border-purple-500/20',
      description: 'A funcionalidade "Uau" que economiza horas de digitação.',
      details: [
        'Voz para Texto: Dite a evolução sem tirar as luvas.',
        'Resumo SOAP Automático: A IA estrutura Subjetivo, Objetivo, Avaliação e Plano.',
        'Histórico Seguro: Tudo salvo na nuvem com data e hora.',
        'Foco no Paciente: Gaste menos tempo digitando e mais tempo cuidando.'
      ]
    },
    {
      id: 'crm',
      title: 'Automação & CRM (Redução de Faltas)',
      icon: BellRing,
      color: 'text-orange-400',
      bgGlow: 'bg-orange-500/20',
      border: 'border-orange-500/20',
      description: 'Fidelização automática e redução drástica de No-Show.',
      details: [
        'Lembrete de 24h: E-mail automático pedindo confirmação.',
        'Alerta de Urgência (12h): Aviso extra se o paciente não confirmar.',
        'Botões Interativos: O paciente confirma ou cancela direto no e-mail.',
        'Agenda Diária: O dentista recebe o resumo do dia seguinte por e-mail.'
      ]
    },
    {
      id: 'recall',
      title: 'Marketing de Retorno (Recall)',
      icon: Repeat,
      color: 'text-red-400',
      bgGlow: 'bg-red-500/20',
      border: 'border-red-500/20',
      description: 'Gere receita imediata trazendo pacientes antigos de volta.',
      details: [
        'Filtros Inteligentes: Encontre quem não vem há 6 meses ou 1 ano.',
        'Campanhas em Massa: Dispare e-mails convidando para check-up.',
        'Virgens de Campanha: Segmente quem nunca recebeu contato.',
        'Reativação: Transforme cadastro inativo em agendamento.'
      ]
    },
    {
      id: 'finance',
      title: 'Gestão Financeira Descomplicada',
      icon: DollarSign,
      color: 'text-green-400',
      bgGlow: 'bg-green-500/20',
      border: 'border-green-500/20',
      description: 'Controle total do fluxo de caixa sem precisar de contador.',
      details: [
        'Lançamento Automático: Ao marcar "Pago" na agenda, entra no caixa.',
        'Contas a Pagar/Receber: Organize despesas fixas e variáveis.',
        'Previsão Diária: Receba um e-mail com a previsão financeira do dia seguinte.',
        'Visão de Saldo: Acompanhe a saúde financeira em tempo real.'
      ]
    },
    {
      id: 'inventory',
      title: 'Controle de Estoque & Materiais',
      icon: Box,
      color: 'text-cyan-400',
      bgGlow: 'bg-cyan-500/20',
      border: 'border-cyan-500/20',
      description: 'Gestão completa de insumos para evitar desperdícios e garantir que nunca falte nada.',
      details: [
        'Alertas de Estoque Baixo: O sistema avisa por e-mail quando repor.',
        'Donos de Materiais: Defina se o item é da clínica ou de um dentista específico.',
        'Ajuste Rápido: Entrada e saída simplificada no dia a dia.',
        'Categorização: Organize por descartáveis, instrumentais ou medicamentos.'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 overflow-x-hidden">
      
      {/* BACKGROUND AMBIENT GLOWS - Oculto no Mobile para performance */}
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
              <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-300 hover:text-white transition">Recursos</button>
              <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-300 hover:text-white transition">Preços</button>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-sm font-medium text-white transition cursor-default">Como Funciona</button>
              
              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                <button onClick={() => navigate('/encontrar-clinica')} className="text-sm font-medium text-gray-300 hover:text-white transition flex items-center gap-2">
                    <Search size={16}/> Buscar Clínica
                </button>
                <button onClick={() => navigate('/auth', { state: { view: 'login' } })} className="text-sm font-bold text-white hover:text-purple-400 transition">Entrar</button>
                <button onClick={() => navigate('/auth', { state: { view: 'signup' } })} className="bg-white text-gray-900 px-5 py-2 rounded-full font-bold hover:bg-gray-100 transition shadow-[0_0_20px_rgba(255,255,255,0.3)] text-sm">
                    Começar Grátis
                </button>
              </div>
            </div>

            <div className="md:hidden flex items-center gap-4">
                <button onClick={() => navigate('/auth', { state: { view: 'login' } })} className="text-sm font-bold text-white hover:text-purple-400 transition">Entrar</button>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-300 hover:text-white p-1">
                    {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 w-full bg-gray-950 border-b border-white/10 shadow-2xl animate-fade-in-down">
                <div className="flex flex-col p-4 space-y-4">
                    <button onClick={() => navigate('/')} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5">Recursos</button>
                    <button onClick={() => navigate('/')} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5">Preços</button>
                    <button onClick={() => setMobileMenuOpen(false)} className="text-left text-base font-medium text-white py-2 border-b border-white/5">Como Funciona</button>
                    <button onClick={() => navigate('/encontrar-clinica')} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5 flex items-center gap-2"><Search size={16}/> Buscar Clínica</button>
                    <button onClick={() => navigate('/auth', { state: { view: 'signup' } })} className="bg-white text-gray-900 py-3 rounded-lg font-bold text-center mt-2 shadow-lg">Começar Grátis</button>
                </div>
            </div>
        )}
      </header>

      {/* Hero Header & Intro Narrative */}
      <div className="relative z-10 pt-48 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-300 text-xs font-bold uppercase tracking-wide mb-6 backdrop-blur-sm animate-fade-in-up">
            Funcionalidades Completas
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6 drop-shadow-2xl animate-fade-in-up delay-100">
            Por que sua clínica precisa de um <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">ERP com Inteligência Artificial?</span>
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto mb-12 animate-fade-in-up delay-200">
            Descubra como a tecnologia está transformando a rotina de dentistas, eliminando a burocracia e devolvendo o foco ao que realmente importa: o paciente.
          </p>

          <div className="bg-gray-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/10 text-left relative overflow-hidden group animate-fade-in-up delay-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600"></div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition duration-700"></div>
            
            <div className="space-y-6 text-gray-300 leading-relaxed text-lg relative z-10">
                <p>
                    Gerenciar uma clínica odontológica é um desafio que vai muito além da cadeira do dentista. Além da excelência clínica, o profissional precisa lidar com agendamentos, faltas, controle financeiro, estoque e a minuciosa documentação dos pacientes.
                </p>
                <p>
                    É aqui que entra o <strong className="text-white">ERP (Enterprise Resource Planning)</strong>. Diferente de simples agendas de papel ou planilhas desconexas, um ERP centraliza todas as informações do consultório em um único lugar seguro e acessível.
                </p>
            </div>
          </div>

          {/* Vídeo Tutorial Section */}
          <div className="mt-16 animate-fade-in-up delay-400">
            <h2 className="text-2xl font-bold text-white mb-6">Veja o DentiHub em Ação</h2>
            <div className="aspect-video w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/UgMxxxstrA8" 
                title="DentiHub Tutorial" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Feature Blocks */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pb-24 pt-12">
        <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">Como o DentiHub resolve isso:</h2>
        </div>

        <div className="space-y-24">
          
          {features.map((feature, index) => (
            <div key={feature.id} className={`flex flex-col md:flex-row gap-12 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
              
              {/* Visual Side */}
              <div className="flex-1 w-full">
                <div className={`rounded-3xl p-8 bg-gray-900/40 backdrop-blur border border-white/5 relative overflow-hidden group hover:border-white/10 transition duration-500`}>
                  
                  {/* Background Glow Effect based on feature color - Otimizado para Mobile (removido blur excessivo) */}
                  <div className={`absolute top-0 right-0 p-8 opacity-20 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition duration-700 hidden md:block blur-2xl`}>
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

              {/* Text Side */}
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
            {/* Decorative BG - hidden on mobile */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-blue-600/10 to-transparent pointer-events-none hidden md:block"></div>
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

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-white/5 py-12 text-center text-sm text-gray-500 relative z-10">
        &copy; {new Date().getFullYear()} DentiHub. Inovação em Odontologia.
      </footer>
    </div>
  );
};

export default LearnMorePage;
