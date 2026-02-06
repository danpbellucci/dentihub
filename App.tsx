
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';
import AuthPage from './components/AuthPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import ClientsPage from './components/ClientsPage';
import DentistsPage from './components/DentistsPage';
import CalendarPage from './components/CalendarPage';
import FinancePage from './components/FinancePage';
import PublicBookingPage from './components/PublicBookingPage';
import SettingsPage from './components/SettingsPage';
import RequestsPage from './components/RequestsPage';
import LandingPage from './components/LandingPage';
import FindClinicPage from './components/FindClinicPage';
import SmartRecordPage from './components/SmartRecordPage';
import MessagingPage from './components/MessagingPage';
import GuidePage from './components/GuidePage';
import InventoryPage from './components/InventoryPage'; // New Import
import AppointmentActionPage from './components/AppointmentActionPage';
import LearnMorePage from './components/LearnMorePage';
import SuperAdminPage from './components/SuperAdminPage';
import SuperAdminCampaigns from './components/SuperAdminCampaigns';
import SuperAdminLeads from './components/SuperAdminLeads';
import SuperAdminSubscriptions from './components/SuperAdminSubscriptions'; // New Import
import UpdatePasswordPage from './components/UpdatePasswordPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const PrivateRoute = ({ children }: { children?: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (mounted) {
                setSession(session);
                setLoading(false);
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Erro ao verificar sessão:", error);
            }
            if (mounted) {
                setSession(null);
                setLoading(false);
            }
        }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
          setSession(session);
          setLoading(false);
      }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-gray-500 font-medium">Carregando DentiHub...</span>
        </div>
    </div>
  );

  if (!session) return <Navigate to="/auth" />;

  return <>{children}</>;
};

// Componente de Segurança Específico para o Super Admin
const SuperAdminRoute = ({ children }: { children?: React.ReactNode }) => {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const verifyAdmin = async () => {
            try {
                // 1. Verificação Rápida de E-mail (Front-end First Layer)
                const { data: { user } } = await supabase.auth.getUser();
                
                // Hardcoded para segurança imediata no frontend, deve bater com o SQL is_super_admin()
                if (user?.email !== 'danilobellucci@gmail.com') {
                    setIsAuthorized(false);
                    return;
                }

                // 2. Verificação Robusta via RPC (Back-end Authority)
                const { data: isSuperAdmin, error } = await supabase.rpc('is_super_admin');
                
                if (error || !isSuperAdmin) {
                    setIsAuthorized(false);
                } else {
                    setIsAuthorized(true);
                }
            } catch (err) {
                console.error("Erro ao verificar permissão de admin:", err);
                setIsAuthorized(false);
            }
        };
        verifyAdmin();
    }, []);

    if (isAuthorized === null) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-950">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                    <span className="text-gray-500 font-medium text-sm">Verificando Credenciais de Segurança...</span>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

// Componente Wrapper para detectar eventos de auth
const AuthListener = () => {
    const navigate = useNavigate();
    
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // Se o Supabase detectar recuperação, força a navegação
                navigate('/update-password');
            }
        });
        return () => subscription.unsubscribe();
    }, [navigate]);

    return null;
}

const App: React.FC = () => {
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
      // VERIFICAÇÃO FORÇADA DE URL
      // Se a URL contiver o hash de recuperação do Supabase, ativamos o modo de recuperação
      // antes mesmo do roteador tentar processar.
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery') && hash.includes('access_token')) {
          setIsRecoveryMode(true);
      }
  }, []);

  // Se estiver em modo de recuperação (link do email), exibe APENAS a página de senha
  if (isRecoveryMode) {
      return (
          <ErrorBoundary>
            <HashRouter>
                <UpdatePasswordPage />
            </HashRouter>
          </ErrorBoundary>
      );
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthListener />
        <Routes>
          {/* Landing Page (Public Root) */}
          <Route path="/" element={<LandingPage />} />

          {/* Specific Public Routes */}
          <Route path="/encontrar-clinica" element={<FindClinicPage />} />
          <Route path="/entenda" element={<LearnMorePage />} />
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Rota de senha acessível diretamente */}
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          
          <Route path="/appointment-action" element={<AppointmentActionPage />} />

          {/* Private Dashboard Routes */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="dentists" element={<DentistsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="smart-record" element={<SmartRecordPage />} />
            <Route path="messaging" element={<MessagingPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="guide" element={<GuidePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Super Admin Routes - PROTEGIDAS DUPLAMENTE */}
          <Route path="/super-admin" element={
              <PrivateRoute>
                  <SuperAdminRoute>
                      <SuperAdminPage />
                  </SuperAdminRoute>
              </PrivateRoute>
          } />
          <Route path="/super-admin/campaigns" element={
              <PrivateRoute>
                  <SuperAdminRoute>
                      <SuperAdminCampaigns />
                  </SuperAdminRoute>
              </PrivateRoute>
          } />
          <Route path="/super-admin/leads" element={
              <PrivateRoute>
                  <SuperAdminRoute>
                      <SuperAdminLeads />
                  </SuperAdminRoute>
              </PrivateRoute>
          } />
          <Route path="/super-admin/subscriptions" element={
              <PrivateRoute>
                  <SuperAdminRoute>
                      <SuperAdminSubscriptions />
                  </SuperAdminRoute>
              </PrivateRoute>
          } />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
