
import React, { useState, useEffect } from 'react';
import { supabase, SUPABASE_URL } from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Smile, Lock, Mail, ArrowLeft, AlertTriangle, User, KeyRound } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'forgot';

const AuthPage: React.FC = () => {
  const location = useLocation();
  const [view, setView] = useState<AuthView>((location.state as any)?.view || 'login');
  
  // Login & Signup Common
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup Specific
  const [name, setName] = useState(''); // Nome da Clínica/Doutor
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Verification Flow
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const isMisconfigured = SUPABASE_URL.includes('placeholder');

  const getRedirectUrl = () => {
    let url = window.location.origin;
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    return url;
  };

  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Verifica se é Super Admin para redirecionar corretamente
      try {
          const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
          if (isSuperAdmin) {
              navigate('/super-admin');
              return;
          }
      } catch (err) {
          console.error("Erro ao verificar super admin:", err);
      }

      navigate('/dashboard'); 
  };

  const handleForgot = async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getRedirectUrl() + '/#/dashboard/settings', 
      });
      if (error) throw error;
      setMessage('Link de recuperação enviado para seu e-mail!');
  };

  const startSignup = async () => {
      if (!name.trim()) throw new Error("Por favor, informe seu nome ou da clínica.");
      if (!isValidEmail(email)) throw new Error("Por favor, insira um e-mail válido.");
      if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
      if (password !== confirmPassword) throw new Error("As senhas não conferem.");

      // Chama a Edge Function para enviar o código
      const { data, error } = await supabase.functions.invoke('send-signup-code', {
          body: { email, name }
      });

      if (error) throw new Error(error.message || "Erro ao conectar com servidor.");
      if (data && data.error) throw new Error(data.error);

      setIsVerifying(true);
      setMessage('Código enviado para seu e-mail!');
  };

  const completeSignup = async () => {
      if (verificationCode.length !== 6) throw new Error("O código deve ter 6 dígitos.");

      const { data, error } = await supabase.functions.invoke('complete-signup', {
          body: { email, password, code: verificationCode, name }
      });

      if (error) throw new Error(error.message || "Erro de comunicação.");
      if (data && data.error) throw new Error(data.error);

      // Sucesso! Agora faz login automático
      setMessage("Conta criada! Entrando...");
      await handleLogin();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMisconfigured) return;

    setLoading(true);
    setMessage('');

    try {
      if (view === 'login') {
        await handleLogin();
      } else if (view === 'signup') {
        if (isVerifying) {
            await completeSignup();
        } else {
            await startSignup();
        }
      } else if (view === 'forgot') {
        await handleForgot();
      }
    } catch (error: any) {
      console.error("Erro auth:", error);
      let msg = error.message;
      if (msg === 'Failed to fetch') msg = 'Falha na conexão.';
      else if (msg.includes('Invalid login credentials')) msg = 'E-mail ou senha incorretos.';
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-primary cursor-pointer" onClick={() => navigate('/')}>
          <Smile size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {view === 'login' && 'Acesse o DentiHub'}
          {view === 'signup' && (isVerifying ? 'Verificar E-mail' : 'Crie sua conta Grátis')}
          {view === 'forgot' && 'Recuperar Senha'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {view === 'login' && 'Gerencie sua clínica com inteligência.'}
          {view === 'signup' && !isVerifying && 'Comece com 20 clientes gratuitos.'}
          {view === 'signup' && isVerifying && `Enviamos um código para ${email}`}
          {view === 'forgot' && 'Informe seu e-mail para receber o link.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {isMisconfigured && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                <p className="text-sm text-red-700 font-bold">Erro de Configuração (Chaves Ausentes)</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Fluxo de Verificação (Código) */}
            {view === 'signup' && isVerifying ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700 text-center mb-4">
                        Digite o código de 6 dígitos
                    </label>
                    <div className="flex justify-center">
                        <input
                            type="text"
                            maxLength={6}
                            required
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                            className="block w-48 text-center text-2xl tracking-widest border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary py-3 border"
                            placeholder="000000"
                            autoFocus
                        />
                    </div>
                    <div className="text-center mt-4">
                        <button 
                            type="button" 
                            onClick={() => setIsVerifying(false)}
                            className="text-xs text-gray-500 hover:text-primary underline"
                        >
                            Corrigir e-mail ou reenviar
                        </button>
                    </div>
                </div>
            ) : (
                // Fluxo Padrão (Login / Cadastro Inicial / Recuperação)
                <>
                    {view === 'signup' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome (Seu ou da Clínica)</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                                    placeholder="Ex: Dr. Silva"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        E-mail
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                        id="email"
                        type="email"
                        required
                        disabled={isMisconfigured}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border disabled:bg-gray-100"
                        placeholder="admin@clinica.com"
                        />
                    </div>
                    </div>

                    {view !== 'forgot' && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Senha
                        </label>
                        {view === 'login' && (
                            <button 
                            type="button" 
                            disabled={isMisconfigured}
                            onClick={() => { setView('forgot'); setMessage(''); }}
                            className="text-xs text-primary hover:text-sky-700 font-medium"
                            >
                            Esqueceu a senha?
                            </button>
                        )}
                        </div>
                        <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="password"
                            type="password"
                            required
                            disabled={isMisconfigured}
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border disabled:bg-gray-100"
                            placeholder={view === 'signup' ? 'Mínimo 6 caracteres' : ''}
                        />
                        </div>
                    </div>
                    )}

                    {view === 'signup' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirmar Senha</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <KeyRound className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                            placeholder="Repita a senha"
                        />
                        </div>
                    </div>
                    )}
                </>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || isMisconfigured}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processando...' : 
                 view === 'login' ? 'Entrar' : 
                 view === 'signup' ? (isVerifying ? 'Confirmar Código' : 'Continuar') : 
                 'Enviar Link'}
              </button>
            </div>
          </form>

          {message && (
            <div className={`mt-4 text-sm text-center font-medium p-2 rounded ${message.includes('enviado') || message.includes('criada') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {message}
            </div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {view === 'login' ? 'Novo por aqui?' : 'Já tem conta?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              {view === 'forgot' ? (
                 <button
                   onClick={() => { setView('login'); setMessage(''); }}
                   disabled={isMisconfigured}
                   className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                 >
                   <ArrowLeft size={16} className="mr-2" /> Voltar para Login
                 </button>
              ) : (
                <button
                  onClick={() => { 
                      setView(view === 'login' ? 'signup' : 'login'); 
                      setMessage(''); 
                      setConfirmPassword(''); 
                      setIsVerifying(false);
                      setVerificationCode('');
                  }}
                  disabled={isMisconfigured}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {view === 'login' ? 'Criar conta gratuita' : 'Fazer Login'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
