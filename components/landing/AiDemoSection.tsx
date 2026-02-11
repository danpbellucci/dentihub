import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Check, Mic, ArrowDown } from 'lucide-react';
import { SparklesIcon } from './HeroSection';

const AiDemoSection: React.FC = () => {
  const navigate = useNavigate();

  const goToAuth = () => {
    navigate('/auth', { state: { view: 'signup' } });
  };

  return (
    <section id="ai-section" className="py-32 relative z-10 border-t border-white/5 bg-gray-900/50 backdrop-blur-sm">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase mb-6 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                        <Brain size={14} /> Diferencial Competitivo
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight text-white">
                        Prontuário com <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Inteligência Artificial</span>
                    </h2>
                    <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                        Esqueça a digitação interminável após cada consulta. Com o DentiHub, você apenas <strong>fala o que fez</strong> e nossa IA transcreve, organiza e estrutura o resumo clínico automaticamente.
                    </p>
                    
                    <ul className="space-y-4 mb-10">
                        <li className="flex items-start gap-3"><div className="mt-1 p-1 bg-green-500/20 rounded text-green-400 border border-green-500/20"><Check size={16}/></div><div><strong className="block text-white">Transcrição de Voz para Texto</strong><span className="text-sm text-gray-500">Não tire as luvas. Apenas dite e o sistema escreve.</span></div></li>
                        <li className="flex items-start gap-3"><div className="mt-1 p-1 bg-green-500/20 rounded text-green-400 border border-green-500/20"><Check size={16}/></div><div><strong className="block text-white">Formato SOAP Automático</strong><span className="text-sm text-gray-500">A IA organiza em Subjetivo, Objetivo, Avaliação e Plano.</span></div></li>
                        <li className="flex items-start gap-3"><div className="mt-1 p-1 bg-green-500/20 rounded text-green-400 border border-green-500/20"><Check size={16}/></div><div><strong className="block text-white">Histórico Seguro</strong><span className="text-sm text-gray-500">Tudo salvo na nuvem com data e hora.</span></div></li>
                    </ul>

                    <button onClick={goToAuth} className="bg-white text-gray-900 px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition shadow-lg shadow-white/10">
                        Quero testar a IA
                    </button>
                </div>

                {/* AI Visual */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                        {/* Audio Waveform */}
                        <div className="flex items-center justify-between mb-4 bg-gray-800/50 p-3 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                                    <Mic size={16} className="text-red-500" />
                                </div>
                                <div className="flex gap-1 h-4 items-center">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="w-1 bg-purple-500 rounded-full animate-bounce" style={{height: Math.random() * 16 + 4 + 'px', animationDelay: i * 0.1 + 's'}}></div>
                                    ))}
                                </div>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">00:14 / 00:45</span>
                        </div>

                        {/* Transcription */}
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Transcrição (Voz para Texto)</p>
                            <p className="text-gray-300 text-sm italic">"O paciente João chegou relatando uma dor aguda no dente 26, principalmente com água gelada. No exame clínico notei uma retração gengival severa e desgaste cervical. Vou aplicar um dessensibilizante agora e agendar uma restauração classe 5."</p>
                        </div>

                        {/* Arrow separator */}
                        <div className="flex justify-center mb-4"><ArrowDown size={20} className="text-purple-500/50" /></div>

                        {/* SOAP Result */}
                        <div className="space-y-2 font-mono text-xs">
                            <div className="p-2 bg-gray-800/30 rounded border border-purple-500/20"><span className="text-purple-400 font-bold">S:</span> <span className="text-gray-400">Dor aguda no dente 26 com estímulos térmicos (frio).</span></div>
                            <div className="p-2 bg-gray-800/30 rounded border border-purple-500/20"><span className="text-purple-400 font-bold">O:</span> <span className="text-gray-400">Retração gengival severa e desgaste cervical no 26.</span></div>
                            <div className="p-2 bg-gray-800/30 rounded border border-purple-500/20"><span className="text-purple-400 font-bold">A:</span> <span className="text-gray-400">Hipersensibilidade dentinária / Lesão cervical não cariosa.</span></div>
                            <div className="p-2 bg-gray-800/30 rounded border border-purple-500/20"><span className="text-purple-400 font-bold">P:</span> <span className="text-gray-400">Aplicação de dessensibilizante (imediato); Restaur. Classe V (agendada).</span></div>
                        </div>
                        
                        <div className="absolute bottom-4 right-4 text-purple-500/10 pointer-events-none"><SparklesIcon size={120} /></div>
                    </div>
                </div>
            </div>

            {/* VIDEO DEMO SECTION */}
            <div className="mt-16 max-w-4xl mx-auto">
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative bg-gray-900 group">
                    <div className="absolute inset-0 bg-purple-600/20 blur-3xl opacity-20 group-hover:opacity-30 transition duration-1000 pointer-events-none"></div>
                    <iframe className="w-full h-full relative z-10" src="https://www.youtube.com/embed/hQmUia6y7vg?rel=0" title="DentiHub AI Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
                <p className="text-center text-gray-500 text-sm mt-4">Veja a Inteligência Artificial criando um prontuário em tempo real.</p>
            </div>
         </div>
      </section>
  );
};

export default AiDemoSection;