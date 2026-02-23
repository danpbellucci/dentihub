import React from 'react';
import { ArrowRight, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InteractiveMockup from './InteractiveMockup';

export const SparklesIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.39 9.39L22 12L14.39 14.61L12 22L9.61 14.61L2 12L9.61 9.39L12 2Z" />
    </svg>
);

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  const goToAuth = () => {
    navigate('/auth', { state: { view: 'signup' } });
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden z-10">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 opacity-50 pointer-events-none">
            <img 
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1920&h=1080" 
                alt="Dentista usando DentiHub" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950/40 to-gray-950"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm text-purple-300 font-medium text-sm mb-8 animate-fade-in-up hover:bg-white/10 transition cursor-default">
            <SparklesIcon /> <span className="text-gray-200">Novo:</span> Prontuário com IA Generativa
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight mb-8 leading-tight max-w-5xl mx-auto drop-shadow-2xl will-change-transform">
            O <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Sistema Operacional <br />
            do Futuro</span> para Dentistas
          </h1>
          
          <p className="mt-4 max-w-3xl mx-auto text-xl text-gray-400 mb-12 leading-relaxed">
            <span className="block text-white font-bold mb-3 text-2xl drop-shadow-md">Gestão administrativa e relacionamento com pacientes em uma única ferramenta.</span>
            Abandone o papel e sistemas do passado. Experimente a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 font-bold">gestão inteligente</span> com agendamento online, prontuário com IA e mensageria automática em uma interface que você vai amar usar.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
            <button onClick={goToAuth} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-500 transition shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 group">
              Criar Conta Gratuita <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => document.getElementById('ai-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition flex items-center justify-center gap-2 backdrop-blur-sm">
              <Mic size={20} className="text-purple-400"/> Ver a IA em ação
            </button>
          </div>

          <InteractiveMockup />
        </div>
    </section>
  );
};

export default HeroSection;