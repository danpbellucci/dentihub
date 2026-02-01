
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { Lock, KeyRound, CheckCircle, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';

const UpdatePasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Nota: Não usamos useNavigate aqui para sair, pois precisamos forçar um reload
  // para limpar o estado 'isRecoveryMode' no App.tsx.

  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && !window.location.hash.includes('access_token')) {
            setMessage({ text: "Link de recuperação inválido ou expirado. Tente solicitar novamente.", type: 'error' });
        }
        setCheckingSession(false);
    };
    
    setTimeout(checkSession, 500);
  }, []);

  // Função auxiliar para sair do modo de recuperação e ir para outra página
  const hardNavigate = (path: string) => {
      window.location.hash = path;
      window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setMessage({ text: "A senha deve ter pelo menos 6 caracteres.", type: 'error' });
        return;
    }
    if (password !== confirmPassword) {
        setMessage({ text: "As senhas não coincidem.", type: 'error' });
        return;
    }

    setLoading(true);
    setMessage(null);

    try {
        const { error } = await supabase.auth.updateUser({ password: password });
        if (error) throw error;

        setMessage({ text: "Senha alterada com sucesso! Redirecionando...", type: 'success' });
        
        // Força reload para o dashboard após sucesso
        setTimeout(() => {
            hardNavigate('/dashboard');
        }, 2000);

    } catch (error: any) {
        console.error(error);
        let errorMsg = error.message;
        if (errorMsg.includes("different from the old")) errorMsg = "A nova senha deve ser diferente da antiga.";
        if (errorMsg.includes("weak")) errorMsg = "Senha muito fraca.";
        
        setMessage({ text: errorMsg, type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  if (checkingSession) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center text-gray-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Verificando link de segurança...</p>
        </div>
      );
  }

  const isCriticalError = message?.text.includes('Link de recuperação inválido');

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-gray-100 overflow-hidden relative">
      
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center cursor-pointer mb-6" onClick={() => hardNavigate('/')}>
          <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-500/20">
            <Logo className="w-10 h-10" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black text-white tracking-tight">
          Nova Senha
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Defina uma nova senha segura para sua conta.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-gray-900/60 backdrop-blur-xl py-8 px-4 shadow-2xl border border-white/10 sm:rounded-2xl sm:px-10">
          
          {!isCriticalError ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nova Senha</label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); if(message?.type === 'error') setMessage(null); }}
                            className="block w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar Senha</label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <KeyRound className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); if(message?.type === 'error') setMessage(null); }}
                            className="block w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                            placeholder="Repita a senha"
                        />
                    </div>
                </div>

                <div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-blue-900/20 text-sm font-bold text-white bg-primary hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Atualizar Senha'}
                </button>
                </div>
            </form>
          ) : null}

          {message && (
            <div className={`mt-4 text-sm text-center font-medium p-3 rounded-lg border flex items-center justify-center gap-2 ${message.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
              {message.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
              {message.text}
            </div>
          )}

          {(isCriticalError || message?.type === 'success') && (
              <button 
                type="button"
                onClick={() => hardNavigate('/auth')}
                className="mt-4 w-full flex items-center justify-center text-sm text-gray-400 hover:text-white transition cursor-pointer"
              >
                  <ArrowLeft size={14} className="mr-1"/> Voltar para Login
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
