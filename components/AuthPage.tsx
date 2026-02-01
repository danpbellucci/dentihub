
import React, { useState, useEffect } from 'react';
import { supabase, SUPABASE_URL } from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { Smile, Lock, Mail, ArrowLeft, AlertTriangle, User, KeyRound, X, FileText } from 'lucide-react';

const TERMS_OF_USE_TEXT = `TERMOS DE USO – DENTIHUB

1. ACEITAÇÃO DOS TERMOS
Ao acessar, cadastrar-se ou utilizar a plataforma DentiHub, o usuário declara que leu, compreendeu e concorda integralmente com estes Termos de Uso, bem como com a Política de Privacidade associada. Caso não concorde com qualquer condição aqui prevista, o usuário não deverá utilizar a plataforma.

2. SOBRE O DENTIHUB
O DentiHub é um software no modelo SaaS (Software as a Service) destinado à gestão de clínicas odontológicas, incluindo, mas não se limitando a:
- Cadastro e gestão de pacientes;
- Agendamentos;
- Organização de informações administrativas e operacionais;
- Apoio à gestão clínica e financeira.
O DentiHub não presta serviços odontológicos, nem interfere em decisões clínicas, diagnósticos ou tratamentos realizados pelos profissionais de saúde.

3. TITULARIDADE E RESPONSÁVEL LEGAL
O DentiHub é de propriedade da empresa:
Studio X
CNPJ: 44.156.558.0001-36
Sede: Santana de Parnaíba – SP, Brasil
A Studio X é responsável pelo desenvolvimento, manutenção e disponibilização da plataforma.

4. CADASTRO E RESPONSABILIDADE DO USUÁRIO
4.1. Para utilizar o DentiHub, o usuário deverá fornecer informações verdadeiras, completas e atualizadas.
4.2. O usuário é inteiramente responsável:
- Pela confidencialidade de seu login e senha;
- Por todas as atividades realizadas em sua conta;
- Pelos dados inseridos na plataforma, especialmente dados de pacientes.
4.3. O uso do sistema deve respeitar a legislação vigente, incluindo, mas não se limitando à Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).

5. DADOS DE PACIENTES E LGPD
5.1. O usuário reconhece que é o controlador dos dados pessoais e dados sensíveis de pacientes inseridos no sistema.
5.2. O DentiHub atua como operador de dados, tratando as informações conforme as instruções do usuário e de acordo com a legislação aplicável.
5.3. É responsabilidade exclusiva do usuário:
- Obter consentimento dos pacientes, quando necessário;
- Garantir o uso legítimo das informações;
- Atender solicitações de titulares de dados.

6. LIMITAÇÃO DE RESPONSABILIDADE
6.1. A Studio X não se responsabiliza por:
- Erros de diagnóstico, tratamentos ou condutas clínicas;
- Uso indevido da plataforma pelo usuário;
- Perda de dados causada por falhas externas, força maior ou uso inadequado de credenciais;
- Decisões administrativas ou financeiras tomadas com base nas informações do sistema.
6.2. O DentiHub é fornecido “como está”, podendo passar por melhorias, atualizações ou interrupções temporárias.

7. DISPONIBILIDADE DO SERVIÇO
7.1. A Studio X envida esforços para manter a plataforma disponível de forma contínua, mas não garante disponibilidade ininterrupta.
7.2. Poderão ocorrer manutenções programadas ou emergenciais, com ou sem aviso prévio.

8. PLANOS, PAGAMENTOS E CANCELAMENTO
8.1. O uso do DentiHub pode estar condicionado à contratação de planos pagos.
8.2. Valores, funcionalidades e condições estarão descritos no momento da contratação.
8.3. O usuário poderá cancelar o serviço conforme regras do plano contratado, ciente de que:
- O cancelamento não gera reembolso proporcional, salvo disposição expressa em contrário;
- Após o encerramento, os dados poderão ser excluídos conforme a Política de Privacidade.

9. PROPRIEDADE INTELECTUAL
9.1. Todo o software, layout, marca, logotipo, código-fonte e demais elementos do DentiHub são de propriedade exclusiva da Studio X.
9.2. É proibido:
- Copiar, modificar ou distribuir o sistema;
- Realizar engenharia reversa;
- Utilizar a marca sem autorização expressa.

10. SUSPENSÃO OU ENCERRAMENTO DE CONTA
A Studio X poderá suspender ou encerrar contas que:
- Violem estes Termos;
- Utilizem o sistema para fins ilegais;
- Coloquem em risco a segurança da plataforma ou de terceiros.

11. ALTERAÇÕES DOS TERMOS
A Studio X poderá atualizar estes Termos a qualquer momento. A continuidade do uso da plataforma após alterações implica aceitação automática das novas condições.

12. LEGISLAÇÃO E FORO
Estes Termos são regidos pelas leis da República Federativa do Brasil.
Fica eleito o foro da comarca de Santana de Parnaíba – SP, com renúncia a qualquer outro, por mais privilegiado que seja.

13. CONTATO
Para dúvidas, solicitações ou suporte:
📧 contato@dentihub.com.br`;

type AuthView = 'login' | 'signup' | 'forgot';

const AuthPage: React.FC = () => {
  const location = useLocation();
  const [view, setView] = useState<AuthView>((location.state as any)?.view || 'login');
  
  // Login & Signup Common
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup Specific
  const [name, setName] = useState(''); 
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Verification Flow
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const isMisconfigured = SUPABASE_URL.includes('placeholder');

  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

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
      // Chama a Edge Function para enviar e-mail personalizado com remetente contato@dentihub.com.br
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
          body: { email }
      });

      if (error) throw new Error(error.message || "Erro de conexão.");
      if (data && data.error) throw new Error(data.error);

      setMessage('Link de recuperação enviado para seu e-mail!');
  };

  const startSignup = async () => {
      if (!name.trim()) throw new Error("Por favor, informe seu nome ou da clínica.");
      if (!isValidEmail(email)) throw new Error("Por favor, insira um e-mail válido.");
      if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
      if (password !== confirmPassword) throw new Error("As senhas não conferem.");
      if (!termsAccepted) throw new Error("Você deve ler e aceitar os Termos de Uso.");

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
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-gray-100 overflow-hidden relative">
      
      {/* BACKGROUND GLOWS */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center cursor-pointer mb-6" onClick={() => navigate('/')}>
          <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-500/20">
            <Logo className="w-10 h-10" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black text-white tracking-tight">
          {view === 'login' && 'Acesse o DentiHub'}
          {view === 'signup' && (isVerifying ? 'Verificar E-mail' : 'Crie sua conta Grátis')}
          {view === 'forgot' && 'Recuperar Senha'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          {view === 'login' && 'Gerencie sua clínica com inteligência.'}
          {view === 'signup' && !isVerifying && 'Comece com 20 clientes gratuitos.'}
          {view === 'signup' && isVerifying && `Enviamos um código para ${email}`}
          {view === 'forgot' && 'Informe seu e-mail para receber o link.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-gray-900/60 backdrop-blur-xl py-8 px-4 shadow-2xl border border-white/10 sm:rounded-2xl sm:px-10">
          
          {isMisconfigured && (
            <div className="mb-6 bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                <p className="text-sm text-red-200 font-bold">Erro de Configuração (Chaves Ausentes)</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Fluxo de Verificação (Código) */}
            {view === 'signup' && isVerifying ? (
                <div>
                    <label className="block text-sm font-medium text-gray-300 text-center mb-4">
                        Digite o código de 6 dígitos
                    </label>
                    <div className="flex justify-center">
                        <input
                            type="text"
                            maxLength={6}
                            required
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                            className="block w-48 text-center text-2xl tracking-widest bg-gray-800 border-gray-700 text-white rounded-xl shadow-sm focus:ring-primary focus:border-primary py-3 border outline-none placeholder-gray-600"
                            placeholder="000000"
                            autoFocus
                        />
                    </div>
                    <div className="text-center mt-4">
                        <button 
                            type="button" 
                            onClick={() => setIsVerifying(false)}
                            className="text-xs text-gray-400 hover:text-primary underline"
                        >
                            Corrigir e-mail ou reenviar
                        </button>
                    </div>
                </div>
            ) : (
                // Fluxo Padrão
                <>
                    {view === 'signup' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nome (Seu ou da Clínica)</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                    placeholder="Ex: Dr. Silva"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                        E-mail
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                        id="email"
                        type="email"
                        required
                        disabled={isMisconfigured}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition disabled:opacity-50"
                        placeholder="admin@clinica.com"
                        />
                    </div>
                    </div>

                    {view !== 'forgot' && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                            Senha
                        </label>
                        {view === 'login' && (
                            <button 
                            type="button" 
                            disabled={isMisconfigured}
                            onClick={() => { setView('forgot'); setMessage(''); }}
                            className="text-xs text-primary hover:text-sky-400 font-medium transition"
                            >
                            Esqueceu a senha?
                            </button>
                        )}
                        </div>
                        <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            id="password"
                            type="password"
                            required
                            disabled={isMisconfigured}
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition disabled:opacity-50"
                            placeholder={view === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
                        />
                        </div>
                    </div>
                    )}

                    {view === 'signup' && (
                    <>
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
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg py-2.5 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                placeholder="Repita a senha"
                            />
                            </div>
                        </div>

                        <div className="flex items-start mt-2">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    name="terms"
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="focus:ring-primary h-4 w-4 text-primary border-gray-600 bg-gray-800 rounded cursor-pointer"
                                />
                            </div>
                            <div className="ml-2 text-sm">
                                <label htmlFor="terms" className="font-medium text-gray-400">
                                    Li e concordo com os{' '}
                                    <button 
                                        type="button" 
                                        onClick={() => setShowTermsModal(true)} 
                                        className="text-primary hover:text-sky-400 font-bold underline"
                                    >
                                        Termos de Uso
                                    </button>
                                </label>
                            </div>
                        </div>
                    </>
                    )}
                </>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || isMisconfigured}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-blue-900/20 text-sm font-bold text-white bg-primary hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
              >
                {loading ? 'Processando...' : 
                 view === 'login' ? 'Entrar' : 
                 view === 'signup' ? (isVerifying ? 'Confirmar Código' : 'Continuar') : 
                 'Enviar Link'}
              </button>
            </div>
          </form>

          {message && (
            <div className={`mt-4 text-sm text-center font-medium p-3 rounded-lg border ${message.includes('enviado') || message.includes('criada') ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
              {message}
            </div>
          )}

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-500 rounded-full border border-gray-700">
                  {view === 'login' ? 'Novo por aqui?' : 'Já tem conta?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              {view === 'forgot' ? (
                 <button
                   onClick={() => { setView('login'); setMessage(''); }}
                   disabled={isMisconfigured}
                   className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-700 rounded-lg shadow-sm bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 transition-colors"
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
                      setTermsAccepted(false);
                  }}
                  disabled={isMisconfigured}
                  className="w-full flex justify-center py-2.5 px-4 border border-gray-700 rounded-lg shadow-sm bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 transition-colors"
                >
                  {view === 'login' ? 'Criar conta gratuita' : 'Fazer Login'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Termos de Uso (Dark Mode) */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-80 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-white/10">
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gray-800/50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="text-primary"/> Termos de Uso
                    </h3>
                    <button onClick={() => setShowTermsModal(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24}/>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto text-sm text-gray-300 leading-relaxed whitespace-pre-wrap custom-scrollbar">
                    {/* (Mantendo texto original por brevidade) */}
                    {TERMS_OF_USE_TEXT}
                </div>
                <div className="p-4 border-t border-white/10 bg-gray-800/50 rounded-b-xl flex justify-end gap-3">
                    <button 
                        onClick={() => setShowTermsModal(false)}
                        className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg font-bold hover:bg-gray-700 transition"
                    >
                        Fechar
                    </button>
                    <button 
                        onClick={() => { setTermsAccepted(true); setShowTermsModal(false); }}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-sky-600 transition shadow-sm"
                    >
                        Li e Concordo
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
