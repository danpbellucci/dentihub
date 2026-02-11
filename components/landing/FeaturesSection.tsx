import React from 'react';
import { Calendar, Brain, BellRing, DollarSign, Box, CheckCircle, Cloud, Smartphone, Lock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FeaturesSection: React.FC = () => {
  const navigate = useNavigate();

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

  return (
    <section id="features" className="py-24 relative z-10 bg-gray-950">
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
      </section>
  );
};

export default FeaturesSection;