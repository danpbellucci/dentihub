
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { ArrowLeft, Building2, Target, Heart, ShieldCheck } from 'lucide-react';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 hidden md:block">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="fixed w-full top-0 z-50 border-b border-white/5 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-white font-bold text-xl cursor-pointer hover:opacity-80 transition" onClick={() => navigate('/')}>
              <Logo className="w-8 h-8" />
              <span>Denti<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hub</span> <span className="text-gray-500 font-medium text-sm ml-2 border-l border-white/10 pl-2">Sobre</span></span>
            </div>
            <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-300 hover:text-white transition flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full">
                <ArrowLeft size={16}/> Voltar ao Início
            </button>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative z-10">
        
        {/* Intro */}
        <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight">
                Transformando a <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Gestão Odontológica</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Acreditamos que a tecnologia deve servir para aproximar dentistas e pacientes, eliminando burocracias e potencializando sorrisos.
            </p>
        </div>

        {/* Mission Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-gray-900/60 backdrop-blur-md p-8 rounded-2xl border border-white/5 hover:border-white/10 transition duration-300">
                <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 border border-blue-500/20 text-blue-400">
                    <Target size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Nosso Propósito</h3>
                <p className="text-gray-400 leading-relaxed">
                    A DentiHub nasceu com um objetivo claro: unificar <strong>CRM</strong> (Relacionamento), <strong>ERP</strong> (Gestão), <strong>Inteligência Artificial</strong> e a <strong>Busca por Clínicas</strong> em uma única plataforma robusta e intuitiva. Queremos que o dentista foque apenas no que faz de melhor: cuidar de pessoas.
                </p>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-md p-8 rounded-2xl border border-white/5 hover:border-white/10 transition duration-300">
                <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 border border-purple-500/20 text-purple-400">
                    <Heart size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Feito para Você</h3>
                <p className="text-gray-400 leading-relaxed">
                    Entendemos as dores do dia a dia clínico. Faltas de pacientes, prontuários de papel e financeira desorganizada são problemas do passado. Com a DentiHub, trazemos eficiência operacional e modernidade para o seu consultório.
                </p>
            </div>
        </div>

        {/* Company Info */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 border border-white/10 text-center relative overflow-hidden">
            <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20 text-white">
                    <Building2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Desenvolvido por Studio X Solutions</h2>
                <p className="text-gray-400 mb-6">Inovação e Tecnologia aplicada a negócios.</p>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 border border-white/10 text-sm text-gray-300">
                    <ShieldCheck size={14} className="text-green-500"/>
                    <span>CNPJ: 44.156.558.0001-36</span>
                </div>
            </div>
            
            {/* Decorative BG */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-blue-600/10 to-transparent pointer-events-none"></div>
        </div>

      </main>

      <footer className="bg-gray-950 border-t border-white/5 py-12 text-center text-sm text-gray-500">
        <div className="max-w-7xl mx-auto px-4">
            <p>&copy; {new Date().getFullYear()} DentiHub. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
