import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { X, Gift, Check, Mail, Loader2 } from 'lucide-react';

interface LeadCaptureModalProps {
  onClose: () => void;
}

const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({ onClose }) => {
  const [leadEmail, setLeadEmail] = useState('');
  const [leadStatus, setLeadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail) return;

    setLeadStatus('loading');
    try {
      const { error } = await supabase.from('leads').insert({ email: leadEmail });
      if (error) throw error;

      supabase.functions.invoke('manage-leads', {
          body: { type: 'welcome_lead', email: leadEmail }
      }).catch(console.error);

      setLeadStatus('success');
      setTimeout(() => onClose(), 3000);
    } catch (err) {
      console.error(err);
      setLeadStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative transform transition-all scale-100 animate-fade-in-up border border-white/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
          <X size={24} />
        </button>
        
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Gift size={32} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Ofertas Exclusivas!</h3>
          <p className="text-blue-100 text-sm">Cadastre-se para receber novidades, dicas de gestão e promoções especiais do DentiHub.</p>
        </div>

        <div className="p-8">
          {leadStatus === 'success' ? (
            <div className="text-center py-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-500/20 mb-4">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <h4 className="text-lg font-bold text-white">Inscrição Confirmada!</h4>
              <p className="text-gray-400 text-sm mt-2">Verifique seu e-mail para mais detalhes.</p>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Seu melhor e-mail</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input 
                    type="email" 
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-500"
                    placeholder="doutor@exemplo.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={leadStatus === 'loading'}
                className="w-full bg-white text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-100 transition shadow-lg shadow-white/10 flex items-center justify-center"
              >
                {leadStatus === 'loading' ? <Loader2 className="animate-spin" size={20} /> : 'Quero receber novidades'}
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-4">
                Respeitamos sua privacidade. Cancele a qualquer momento.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureModal;