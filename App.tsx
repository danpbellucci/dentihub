
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import AppointmentActionPage from './components/AppointmentActionPage';
import LearnMorePage from './components/LearnMorePage';
import SuperAdminPage from './components/SuperAdminPage';
import SuperAdminCampaigns from './components/SuperAdminCampaigns';
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

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Landing Page (Public Root) */}
        <Route path="/" element={<LandingPage />} />

        {/* Specific Public Routes (Must come before /:slug) */}
        <Route path="/encontrar-clinica" element={<FindClinicPage />} />
        <Route path="/entenda" element={<LearnMorePage />} />
        <Route path="/auth" element={<AuthPage />} />
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
          <Route path="requests" element={<RequestsPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Super Admin Routes */}
        <Route path="/super-admin" element={<PrivateRoute><SuperAdminPage /></PrivateRoute>} />
        <Route path="/super-admin/campaigns" element={<PrivateRoute><SuperAdminCampaigns /></PrivateRoute>} />

        {/* Public Booking Page (Dynamic Slug at Root) */}
        <Route path="/:slug" element={<PublicBookingPage />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
