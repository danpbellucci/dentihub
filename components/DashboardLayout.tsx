
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings, 
  Smile, 
  UserCheck,
  Menu, 
  X,
  LogOut,
  BellRing,
  Mic,
  MessageSquare,
  BookOpen,
  AlertTriangle,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { UserProfile } from '../types';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [allowedModules, setAllowedModules] = useState<Set<string>>(new Set());
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // Estado gerenciado pelo Backend

  const navigate = useNavigate();
  const location = useLocation();
  
  // Ref para guardar o canal e evitar recriação desnecessária
  const channelRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);

  // Função auxiliar para buscar contagem
  const fetchCount = async (clinicId: string) => {
    if (!clinicId) return;
    const { count } = await supabase
      .from('appointment_requests')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId) 
      .eq('status', 'pending');
    
    setPendingRequests(count || 0);
  };

  const sendBrowserNotification = (title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico', tag: 'dentihub-notification', requireInteraction: false });
      } catch (e) { console.error("Erro ao exibir notificação:", e); }
    }
  };

  const refreshProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileById } = await supabase.from('user_profiles').select('*, clinics(name, subscription_tier)').eq('id', user.id).maybeSingle();
      if (profileById) setUserProfile(profileById as unknown as UserProfile);
  };

  useEffect(() => {
    let mounted = true;

    const initProfileAndRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) { navigate('/auth'); return; }

        // 1. Verificação de Super Admin via Backend (RPC)
        // Isso esconde o e-mail do código fonte do navegador
        const { data: superAdminStatus } = await supabase.rpc('is_super_admin');
        if (mounted) setIsSuperAdmin(!!superAdminStatus);

        let profileData: UserProfile | null = null;
        const { data: profileById, error: fetchError } = await supabase.from('user_profiles').select('*, clinics(name, subscription_tier)').eq('id', user.id).maybeSingle();

        if (fetchError && fetchError.code === '42P17') {
            setDbError("Erro de configuração no Banco de Dados. Contate o suporte.");
            return;
        }

        if (profileById) {
            profileData = profileById as unknown as UserProfile;
        } else if (user.email) {
            const { data: pendingProfile } = await supabase.from('user_profiles').select('id').eq('email', user.email).maybeSingle();
            if (pendingProfile) {
                await supabase.from('user_profiles').update({ id: user.id }).eq('email', user.email);
                const { data: linked } = await supabase.from('user_profiles').select('*, clinics(name, subscription_tier)').eq('id', user.id).single();
                if (linked) profileData = linked as unknown as UserProfile;
            }
        }

        if (mounted && profileData) {
            setUserProfile(profileData);
            
            // --- LOAD PERMISSIONS ---
            if (profileData.role === 'administrator') {
                setAllowedModules(new Set(['calendar', 'clients', 'dentists', 'smart-record', 'messaging', 'finance', 'requests', 'guide', 'settings']));
            } else {
                const { data: rules } = await supabase
                    .from('role_permissions')
                    .select('module, is_allowed')
                    .eq('clinic_id', profileData.clinic_id)
                    .eq('role', profileData.role);
                
                const allowed = new Set<string>();
                if (!rules || rules.length === 0) {
                    allowed.add('calendar');
                    allowed.add('clients');
                    allowed.add('guide');
                    if (profileData.role === 'dentist') {
                        allowed.add('smart-record');
                        allowed.add('dentists');
                    }
                } else {
                    rules.forEach(r => {
                        if (r.is_allowed) allowed.add(r.module);
                    });
                }
                setAllowedModules(allowed);
            }
            setLoadingPermissions(false);

            if (profileData.clinic_id) {
                // Initial Fetch
                fetchCount(profileData.clinic_id);
                
                // Polling Setup (Every 30s) - Backup for Realtime
                pollIntervalRef.current = setInterval(() => {
                    if (profileData?.clinic_id) fetchCount(profileData.clinic_id);
                }, 30000);

                // Realtime Logic
                if (channelRef.current) supabase.removeChannel(channelRef.current);
                channelRef.current = supabase.channel('global_notifications')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_requests'}, (payload) => { 
                        // Simplified check, let fetchCount handle logic
                        if (profileData?.clinic_id) {
                            fetchCount(profileData.clinic_id); 
                            if (payload.eventType === 'INSERT') sendBrowserNotification('Nova Solicitação', 'Novo agendamento solicitado.');
                        }
                    }).subscribe();
            }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error("Erro ao carregar layout:", err);
      }
    };

    initProfileAndRealtime();
    return () => { 
        mounted = false; 
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []); 

  const handleLogout = async () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const navItems = [
    { to: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard, end: true, key: 'dashboard' }, 
    { to: '/dashboard/calendar', label: 'Agenda', icon: Calendar, key: 'calendar' },
    { to: '/dashboard/clients', label: 'Pacientes', icon: Users, key: 'clients' },
    { to: '/dashboard/dentists', label: 'Dentistas', icon: UserCheck, key: 'dentists' },
    { to: '/dashboard/smart-record', label: 'Prontuário IA', icon: Mic, key: 'smart-record' },
    { to: '/dashboard/messaging', label: 'Mensageria', icon: MessageSquare, key: 'messaging' },
    { to: '/dashboard/finance', label: 'Financeiro', icon: DollarSign, key: 'finance' },
    { to: '/dashboard/requests', label: 'Solicitações', icon: BellRing, badge: true, key: 'requests' },
    { to: '/dashboard/guide', label: 'Guia Prático', icon: BookOpen, key: 'guide' },
    { to: '/dashboard/settings', label: 'Configurações', icon: Settings, key: 'settings' },
  ];

  const visibleNavItems = navItems.filter(item => {
      if (isSuperAdmin) return true; // Super admin vê tudo
      if (item.key === 'dashboard') return true;
      if (userProfile?.role === 'administrator') return true;
      if (loadingPermissions) return false; 
      return allowedModules.has(item.key);
  });

  const clinicName = userProfile?.clinics?.name;

  if (dbError) {
      return (
          <div className="flex h-screen bg-red-50 items-center justify-center p-4">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                      <AlertTriangle className="h-10 w-10 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro de Configuração</h2>
                  <p className="text-gray-600 mb-6">{dbError}</p>
                  <button onClick={handleLogout} className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-black transition">Sair</button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden" onClick={() => setSidebarOpen(false)}></div>}

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2 text-primary font-bold text-xl"><Smile /><span>DentiHub</span></div>
            {isSuperAdmin ? (
                <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold mt-1 inline-flex items-center w-fit">
                    <ShieldAlert size={10} className="mr-1"/> SYSTEM ADMIN
                </span>
            ) : (
                clinicName && <span className="text-xs text-gray-500 font-medium ml-8 truncate max-w-[150px]">{clinicName}</span>
            )}
          </div>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}><X size={24} /></button>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Usuário</p>
            <p className="text-sm font-medium text-gray-800 truncate" title={userProfile?.email}>{userProfile?.email}</p>
            <div className="flex items-center mt-2 space-x-2">
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full inline-block capitalize font-bold border border-blue-200">
                    {userProfile?.role === 'administrator' ? 'Administrador' : 
                     userProfile?.role === 'dentist' ? 'Dentista' : 
                     userProfile?.role === 'employee' ? 'Funcionário' : 
                     userProfile?.role}
                </span>
                {userProfile?.clinics?.subscription_tier && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block uppercase font-bold border ${userProfile.clinics.subscription_tier === 'pro' ? 'bg-black text-white border-black' : userProfile.clinics.subscription_tier === 'starter' ? 'bg-sky-100 text-sky-800 border-sky-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {userProfile.clinics.subscription_tier}
                  </span>
                )}
            </div>
        </div>

        <nav className="mt-2 px-2 space-y-1 pb-20 overflow-y-auto max-h-[calc(100vh-180px)]">
          {visibleNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors relative ${isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <div className="relative mr-4">
                <item.icon className="h-6 w-6" />
                {item.badge && pendingRequests > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-white"></span></span>}
              </div>
              <span className="flex-1">{item.label}</span>
              {item.badge && pendingRequests > 0 && <span className="ml-auto bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs font-bold">{pendingRequests}</span>}
            </NavLink>
          ))}

          {/* Super Admin Link */}
          {isSuperAdmin && (
              <NavLink 
                to="/super-admin" 
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors mt-4 border border-red-200 ${isActive ? 'bg-red-50 text-red-800' : 'text-red-600 hover:bg-red-50'}`}
              >
                  <Activity className="mr-4 h-6 w-6" />
                  <span className="flex-1 font-bold">God Mode</span>
              </NavLink>
          )}
        </nav>

        <div className="absolute bottom-0 w-full border-t border-gray-200 bg-white p-4">
          <button 
            onClick={handleLogout} 
            className="flex items-center w-full px-2 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-4 h-6 w-6" />
            Sair
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center text-primary font-bold"><Smile className="mr-2"/> DentiHub</div>
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
                <Menu size={24} />
            </button>
        </div>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet context={{ userProfile, refreshProfile }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
