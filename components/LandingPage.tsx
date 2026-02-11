import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';
import { Search, Gift, Menu, X } from 'lucide-react';
import Toast, { ToastType } from './Toast';

// Imported Sections
import HeroSection from './landing/HeroSection';
import AiDemoSection from './landing/AiDemoSection';
import FeaturesSection from './landing/FeaturesSection';
import PlansSection from './landing/PlansSection';
import LeadCaptureModal from './landing/LeadCaptureModal';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    // 1. Mobile Menu Resize Handler
    const handleResize = () => {
        if (window.innerWidth >= 768) {
            setMobileMenuOpen(false);
        }
    };
    window.addEventListener('resize', handleResize);

    // 2. Lead Popup Observer
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !localStorage.getItem('denti_lead_popup_shown')) {
          setShowLeadModal(true);
          localStorage.setItem('denti_lead_popup_shown', 'true');
        }
      },
      { threshold: 0.1 }
    );

    const plansEndElement = document.getElementById('plans-end-trigger');
    if (plansEndElement) {
      observer.observe(plansEndElement);
    }

    // 3. Handle Email Unsubscribe from URL
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    const emailParam = params.get('email');

    if (action === 'unsubscribe' && emailParam) {
        handleUnsubscribe(emailParam);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (plansEndElement) observer.unobserve(plansEndElement);
    };
  }, [location]);

  const handleUnsubscribe = async (email: string) => {
      try {
          const { error } = await supabase.functions.invoke('manage-leads', {
              body: { type: 'unsubscribe', email }
          });
          if (error) throw error;
          setToast({ message: "Você foi descadastrado da nossa lista de e-mails com sucesso.", type: 'success' });
          window.history.replaceState({}, document.title, "/");
      } catch (err) {
          console.error(err);
          setToast({ message: "Erro ao processar descadastro.", type: 'error' });
      }
  };

  const scrollToPlans = () => {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const goToAuth = (view: 'login' | 'signup' = 'login') => {
    navigate('/auth', { state: { view } });
  };

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white overflow-x-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Background Ambience */}
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
              <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium text-gray-300 hover:text-white transition">Recursos</button>
              <button onClick={scrollToPlans} className="text-sm font-medium text-gray-300 hover:text-white transition">Preços</button>
              <button onClick={() => navigate('/entenda')} className="text-sm font-medium text-gray-300 hover:text-white transition">Como Funciona</button>
              <button onClick={() => navigate('/indique-e-ganhe')} className="text-sm font-medium text-yellow-400 hover:text-yellow-300 transition flex items-center gap-1"><Gift size={14}/> Indique e Ganhe</button>
              
              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                <button onClick={() => navigate('/encontrar-clinica')} className="text-sm font-medium text-gray-300 hover:text-white transition flex items-center gap-2">
                    <Search size={16}/> Buscar Clínica
                </button>
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
                    <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5">Recursos</button>
                    <button onClick={scrollToPlans} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5">Preços</button>
                    <button onClick={() => { setMobileMenuOpen(false); navigate('/entenda'); }} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5">Como Funciona</button>
                    <button onClick={() => { setMobileMenuOpen(false); navigate('/indique-e-ganhe'); }} className="text-left text-base font-medium text-yellow-400 hover:text-yellow-300 py-2 border-b border-white/5 flex items-center gap-2"><Gift size={16}/> Indique e Ganhe</button>
                    <button onClick={() => { navigate('/encontrar-clinica'); setMobileMenuOpen(false); }} className="text-left text-base font-medium text-gray-300 hover:text-white py-2 border-b border-white/5 flex items-center gap-2"><Search size={16}/> Buscar Clínica</button>
                    <button onClick={() => { goToAuth('signup'); setMobileMenuOpen(false); }} className="bg-white text-gray-900 py-3 rounded-lg font-bold text-center mt-2 shadow-lg">Começar Grátis</button>
                </div>
            </div>
        )}
      </header>

      {/* SECTIONS */}
      <HeroSection />
      <AiDemoSection />
      <FeaturesSection />
      <PlansSection />

      {/* LEAD MODAL */}
      {showLeadModal && (
        <LeadCaptureModal onClose={() => setShowLeadModal(false)} />
      )}
      
      {/* FOOTER */}
      <footer className="bg-gray-950 border-t border-white/5 py-12 text-center text-sm text-gray-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 text-white font-bold text-xl mb-4">
            <Logo className="w-6 h-6" />
            <span>Denti<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hub</span></span>
          </div>
          
          <div className="mb-6 flex flex-wrap justify-center gap-6">
            <button onClick={() => navigate('/blog')} className="text-gray-400 hover:text-white transition-colors font-medium">
                Blog
            </button>
            <button onClick={() => navigate('/sobre')} className="text-gray-400 hover:text-white transition-colors font-medium">
                Sobre Nós
            </button>
            <button onClick={() => navigate('/comparativo-de-planos')} className="text-gray-400 hover:text-white transition-colors font-medium">
                Comparar Planos
            </button>
            <button onClick={() => navigate('/compare-sistemas')} className="text-gray-400 hover:text-white transition-colors font-medium">
                Comparar Sistemas
            </button>
            <button onClick={() => navigate('/indique-e-ganhe')} className="text-yellow-500 hover:text-yellow-400 transition-colors font-medium">
                Indique e Ganhe
            </button>
          </div>

          <p className="text-gray-500 text-sm mb-2">© {new Date().getFullYear()} DentiHub. Todos os direitos reservados.</p>
          <p className="text-gray-500 text-sm">Contato: <a href="mailto:contato@dentihub.com.br" className="hover:text-white transition-colors">contato@dentihub.com.br</a></p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;