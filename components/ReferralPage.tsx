import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { 
  ArrowLeft, Gift, Users, Zap, CheckCircle, Copy, ArrowRight, Star, Heart, Menu, X
} from 'lucide-react';

const ReferralPage: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goToAuth = (view: 'login' | 'signup' = 'login') => {
    navigate('/auth', { state: { view } });
  };

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 hidden md:block">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      {/* HEADER */}
      <header className="fixed w-full top-0 z-50 border-b border-white/5 bg-gray-950/90 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-white font-bold text-2xl cursor-pointer hover:opacity-80 transition" onClick={() => navigate('/')}>
              <Logo className="w-8 h-8" />
              <span className="tracking-tight">
                Denti<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hub</span>
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-300 hover:text-white transition">Início</button>
              
              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
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
                    <button onClick={() => navigate('/')} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5">Voltar ao Início</button>
                    <button onClick={() => goToAuth('signup')} className="bg-white text-gray-900 py-3 rounded-lg font-bold text-center mt-2 shadow-lg">Criar Conta</button>
                </div>
            </div>
        )}
      </header>

      {/* HERO SECTION */}
      <main className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wide mb-6 backdrop-blur-sm">
                <Gift size={14} /> Programa de Indicação
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight mb-6 drop-shadow-2xl">
                Indique Colegas e Ganhe <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Mensalidades Grátis</span>
            </h1>
            
            <p className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-12">
                Ajude outros dentistas a modernizarem suas clínicas com o DentiHub e receba recompensas exclusivas diretamente na sua assinatura.
            </p>
        </div>

        {/* REWARDS CARDS */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            
            {/* Card Starter */}
            <div className="bg-gray-900/60 backdrop-blur-md rounded-3xl p-8 border border-blue-500/30 hover:border-blue-500/60 transition duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110 duration-500">
                    <Users size={120} className="text-blue-400" />
                </div>
                
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30 text-blue-400">
                        <Users size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">Ganhe Plano Starter</h3>
                    <div className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                        30 Dias Grátis
                    </div>
                    <p className="text-gray-400 mb-6 min-h-[50px]">
                        Para cada colega indicado que realizar o cadastro e atingir a marca de <strong>30 pacientes cadastrados</strong> no sistema.
                    </p>
                    
                    <ul className="space-y-3">
                        <li className="flex items-start text-sm text-gray-300">
                            <CheckCircle size={16} className="text-blue-500 mr-2 mt-0.5" />
                            <span>Acesso para até 3 dentistas</span>
                        </li>
                        <li className="flex items-start text-sm text-gray-300">
                            <CheckCircle size={16} className="text-blue-500 mr-2 mt-0.5" />
                            <span>Até 100 pacientes</span>
                        </li>
                        <li className="flex items-start text-sm text-gray-300">
                            <CheckCircle size={16} className="text-blue-500 mr-2 mt-0.5" />
                            <span>Mais IA no Prontuário</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Card Pro */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-md rounded-3xl p-8 border border-yellow-500/30 hover:border-yellow-500/60 transition duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110 duration-500">
                    <Zap size={120} className="text-yellow-400" />
                </div>
                
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mb-6 border border-yellow-500/30 text-yellow-400">
                        <Zap size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-2">Ganhe Plano Pro <Star size={20} className="text-yellow-400 fill-current"/></h3>
                    <div className="inline-block bg-yellow-600 text-black text-xs font-bold px-3 py-1 rounded-full mb-4">
                        30 Dias Grátis
                    </div>
                    <p className="text-gray-300 mb-6 min-h-[50px]">
                        Para cada colega indicado que decidir <strong>contratar qualquer plano pago</strong> do DentiHub.
                    </p>
                    
                    <ul className="space-y-3">
                        <li className="flex items-start text-sm text-gray-300">
                            <CheckCircle size={16} className="text-yellow-500 mr-2 mt-0.5" />
                            <span>Até 5 dentistas</span>
                        </li>
                        <li className="flex items-start text-sm text-gray-300">
                            <CheckCircle size={16} className="text-yellow-500 mr-2 mt-0.5" />
                            <span>Pacientes Ilimitados</span>
                        </li>
                        <li className="flex items-start text-sm text-gray-300">
                            <CheckCircle size={16} className="text-yellow-500 mr-2 mt-0.5" />
                            <span>Máximo poder da IA</span>
                        </li>
                    </ul>
                </div>
            </div>

        </div>

        {/* HOW IT WORKS */}
        <div className="max-w-4xl mx-auto mb-20">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Como Funciona</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-white font-bold text-xl">1</div>
                    <h3 className="text-lg font-bold text-white mb-2">Pegue seu Código</h3>
                    <p className="text-sm text-gray-400">Faça login no DentiHub e acesse a área de Configurações para encontrar seu código único de indicação.</p>
                </div>
                <div className="text-center">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-white font-bold text-xl">2</div>
                    <h3 className="text-lg font-bold text-white mb-2">Compartilhe</h3>
                    <p className="text-sm text-gray-400">Envie o código para seus colegas dentistas. Eles devem inseri-lo no momento do cadastro.</p>
                </div>
                <div className="text-center">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-white font-bold text-xl">3</div>
                    <h3 className="text-lg font-bold text-white mb-2">Ganhe Bônus</h3>
                    <p className="text-sm text-gray-400">Assim que seu indicado cumprir os requisitos, seu plano é atualizado ou estendido automaticamente.</p>
                </div>
            </div>
        </div>

        {/* FAQ / CTA */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 border border-white/10 text-center max-w-4xl mx-auto relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white mb-4">Pronto para começar a indicar?</h2>
                <p className="text-gray-300 mb-8 max-w-xl mx-auto">
                    Não há limite de indicações. Se você indicar 12 colegas que assinem o plano, você garante <strong>1 ano de DentiHub Pro Grátis</strong>.
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                        onClick={() => goToAuth('login')}
                        className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-sky-600 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                        Pegar Meu Código <ArrowRight size={18}/>
                    </button>
                </div>
            </div>
            
            {/* Decorative BG */}
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

export default ReferralPage;