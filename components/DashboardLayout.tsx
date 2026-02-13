
import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings, 
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
  Activity,
  Box,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle,
  Megaphone,
  Bug,
  Database,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { UserProfile } from '../types';

// Context Definition
export interface DashboardContextType {
  userProfile: UserProfile | null;
  refreshProfile: () => Promise<void>;
  refreshNotifications?: () => void;
}
export const DashboardContext = createContext<DashboardContextType | null>(null);
export const useDashboard = () => useContext(DashboardContext);

const DashboardLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop pinned state
  const [isHovered, setIsHovered] = useState(false); // Desktop hover state
  
  const [pendingRequests, setPendingRequests] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [allowedModules, setAllowedModules] = useState<Set<string>>(new Set());
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [announcement, setAnnouncement] = useState<any>(null);

  // DEBUG MODAL STATE
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [loadingDebug, setLoadingDebug] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  
  const channelRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);

  // Computed state for desktop sidebar width/mode
  const isNarrow = isCollapsed && !isHovered;

  const fetchCount = async (clinicId: string) => {
    if (!clinicId) return;
    
    const { count: requestsCount } = await supabase
      .from('appointment_requests')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId) 
      .eq('status', 'pending');
    
    const { count: updatesCount } = await supabase
      .from('appointment_status_updates')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    setPendingRequests((requestsCount || 0) + (updatesCount || 0));
  };

  const fetchAnnouncement = async () => {
      const { data } = await supabase
        .from('system_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) setAnnouncement(data);
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

  const refreshNotifications = () => {
      if (userProfile?.clinic_id) fetchCount(userProfile.clinic_id);
  };

  const runDiagnostics = async () => {
      setLoadingDebug(true);
      try {
          console.log("Iniciando diagnóstico...");
          const { data, error } = await supabase.functions.invoke('check-subscription');
          console.log("Resposta diagnóstico:", data, error);
          
          if (data && data.debug) {
              setDebugData(data.debug);
              setShowDebug(true);
          } else {
              alert("A função rodou mas não retornou dados de debug. Verifique o console.");
          }
      } catch (e: any) {
          console.error("Erro diagnóstico:", e);
          alert("Erro ao rodar diagnóstico: " + e.message);
      } finally {
          setLoadingDebug(false);
      }
  };

  useEffect(() => {
    let mounted = true;

    const initProfileAndRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) { navigate('/auth'); return; }

        // Tenta rodar automaticamente na montagem
        runDiagnostics();

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
            fetchAnnouncement();
            
            if (profileData.role === 'administrator') {
                setAllowedModules(new Set(['calendar', 'clients', 'dentists', 'smart-record', 'messaging', 'finance', 'inventory', 'requests', 'guide', 'settings']));
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
                fetchCount(profileData.clinic_id);
                pollIntervalRef.current = setInterval(() => {
                    if (profileData?.clinic_id) fetchCount(profileData.clinic_id);
                }, 30000);

                if (channelRef.current) supabase.removeChannel(channelRef.current);
                channelRef.current = supabase.channel('global_notifications')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_requests'}, (payload) => { 
                        if (profileData?.clinic_id) {
                            fetchCount(profileData.clinic_id); 
                            if (payload.eventType === 'INSERT') sendBrowserNotification('Nova Solicitação', 'Novo agendamento solicitado.');
                        }
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_status_updates'}, (payload) => {
                        if (profileData?.clinic_id) {
                            fetchCount(profileData.clinic_id);
                            if (payload.eventType === 'INSERT') sendBrowserNotification('Atualização', 'Um paciente respondeu ao lembrete.');
                        }
                    })
                    .subscribe();
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
    { to: '/dashboard/inventory', label: 'Estoque', icon: Box, key: 'inventory' },
    { to: '/dashboard/requests', label: 'Solicitações', icon: BellRing, badge: true, key: 'requests' },
    { to: '/dashboard/guide', label: 'Guia Prático', icon: BookOpen, key: 'guide' },
    { to: '/dashboard/settings', label: 'Configurações', icon: Settings, key: 'settings' },
  ];

  const visibleNavItems = navItems.filter(item => {
      if (isSuperAdmin) return true;
      if (item.key === 'dashboard') return true;
      if (userProfile?.role === 'administrator') return true;
      if (loadingPermissions) return false; 
      return allowedModules.has(item.key);
  });

  const clinicName = userProfile?.clinics?.name;

  if (dbError) {
      return (
          <div className="flex h-[100dvh] bg-gray-950 items-center justify-center p-4">
              <div className="bg-gray-900 border border-red-900/50 p-8 rounded-lg shadow-xl max-w-lg text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-900/20 mb-6">
                      <AlertTriangle className="h-10 w-10 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Erro de Configuração</h2>
                  <p className="text-gray-400 mb-6">{dbError}</p>
                  <button onClick={handleLogout} className="bg-white text-gray-900 px-6 py-2 rounded hover:bg-gray-200 transition font-bold">Sair</button>
              </div>
          </div>
      );
  }

  const getAnnouncementStyle = (type: string) => {
      switch(type) {
          case 'warning': return 'bg-yellow-900/30 text-yellow-300 border-yellow-500/30';
          case 'error': return 'bg-red-900/30 text-red-300 border-red-500/30';
          case 'success': return 'bg-green-900/30 text-green-300 border-green-500/30';
          default: return 'bg-blue-900/30 text-blue-300 border-blue-500/30';
      }
  };

  const getAnnouncementIcon = (type: string) => {
      switch(type) {
          case 'warning': return <AlertTriangle size={18} className="shrink-0"/>;
          case 'error': return <ShieldAlert size={18} className="shrink-0"/>;
          case 'success': return <CheckCircle size={18} className="shrink-0"/>;
          default: return <Info size={18} className="shrink-0"/>;
      }
  };

  return (
    <DashboardContext.Provider value={{ userProfile, refreshProfile, refreshNotifications }}>
        <div className="flex h-screen h-[100dvh] bg-gray-950 text-gray-100 overflow-hidden font-sans">
        
        {/* DIAGNOSTIC MODAL */}
        {showDebug && debugData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-lg animate-fade-in">
                <div className="bg-gray-900 w-full max-w-5xl h-[90vh] rounded-2xl border border-yellow-500/30 shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-yellow-900/10 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                            <Bug size={24}/> Diagnóstico de Assinatura
                        </h2>
                        <button onClick={() => setShowDebug(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                    </div>
                    <div className="flex-1 overflow-auto p-6 grid grid-cols-2 gap-6">
                        
                        {/* COLUNA 1: DADOS NO BANCO */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                                <Database size={18} className="text-blue-400"/> Dados no Banco (Supabase)
                            </h3>
                            {debugData.database_record ? (
                                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 font-mono text-xs text-blue-200 space-y-2">
                                    <div className="flex justify-between border-b border-white/10 pb-1">
                                        <span className="text-gray-400">Customer ID:</span>
                                        <span className="font-bold text-white">{debugData.database_record.stripe_customer_id}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-1">
                                        <span className="text-gray-400">Subscription ID:</span>
                                        <span className="font-bold text-white">{debugData.database_record.stripe_subscription_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Plano Atual (Tier):</span>
                                        <span className="font-bold text-green-400 uppercase">{debugData.database_record.current_tier}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-red-400">Registro da clínica não encontrado no banco.</div>
                            )}
                        </div>

                        {/* COLUNA 2: DADOS NO STRIPE */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                                <CreditCard size={18} className="text-green-400"/> Dados no Stripe (Ao Vivo)
                            </h3>
                            
                            {debugData.stripe_check ? (
                                debugData.stripe_check.error ? (
                                    <div className="bg-red-900/20 p-4 rounded border border-red-500/30 text-red-300 text-xs">
                                        Erro ao consultar Stripe: {debugData.stripe_check.error}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="text-xs text-gray-400 mb-2">
                                            Consultando pelo Customer ID: <span className="text-white font-mono">{debugData.stripe_check.customer_id_used}</span>
                                        </div>
                                        
                                        {debugData.stripe_check.subscriptions_found?.length > 0 ? (
                                            debugData.stripe_check.subscriptions_found.map((sub: any, i: number) => (
                                                <div key={i} className={`p-3 rounded border text-xs font-mono ${sub.status === 'active' || sub.status === 'trialing' ? 'bg-green-900/20 border-green-500/30 text-green-300' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                                    <div>ID: {sub.id}</div>
                                                    <div>Status: <span className="uppercase font-bold">{sub.status}</span></div>
                                                    <div>Produto: {sub.product_name}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-yellow-400 text-sm bg-yellow-900/20 p-3 rounded border border-yellow-500/30">
                                                Nenhuma assinatura encontrada para este Customer ID.
                                            </div>
                                        )}
                                        
                                        <div className="mt-4 pt-2 border-t border-white/10">
                                            <span className="text-xs text-gray-400 block mb-1">Ação do Sistema:</span>
                                            <span className="text-xs font-bold bg-gray-700 px-2 py-1 rounded text-white">{debugData.action_taken || 'Nenhuma'}</span>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="text-gray-500 italic">Aguardando consulta...</div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 bg-gray-800 border-t border-white/10 text-center flex justify-center gap-4">
                        <button onClick={runDiagnostics} disabled={loadingDebug} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                            {loadingDebug ? <Bug className="animate-spin" size={16}/> : <RefreshCw size={16}/>} Rodar Novamente
                        </button>
                        <button onClick={() => setShowDebug(false)} className="bg-white text-gray-900 px-6 py-2 rounded-lg font-bold hover:bg-gray-200">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Otimização Mobile: Efeitos ocultos (hidden md:block) */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 hidden md:block">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]"></div>
        </div>

        {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}></div>}

        <div 
            className={`fixed inset-y-0 left-0 z-50 bg-gray-900/95 backdrop-blur-xl border-r border-white/5 shadow-2xl transform transition-all duration-300 ease-in-out 
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:relative md:translate-x-0 ${isNarrow ? 'md:w-20' : 'md:w-64'}
            `}
            onMouseEnter={() => isCollapsed && setIsHovered(true)}
            onMouseLeave={() => isCollapsed && setIsHovered(false)}
        >
            <div className={`flex items-center p-4 border-b border-white/5 ${isNarrow ? 'justify-center' : 'justify-between'}`}>
                <div className={`flex flex-col w-full ${isNarrow ? 'items-center' : ''}`}>
                    <div className="flex items-center space-x-2 text-white font-bold text-xl mb-1 cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-purple-500/20 shrink-0">
                            <Logo className="w-5 h-5 text-white" />
                        </div>
                        {!isNarrow && (
                            <span className="whitespace-nowrap transition-opacity duration-300">
                                Denti<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hub</span>
                            </span>
                        )}
                    </div>
                    {!isNarrow && isSuperAdmin && (
                        <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold mt-1 inline-flex items-center w-fit whitespace-nowrap">
                            <ShieldAlert size={10} className="mr-1"/> SYSTEM ADMIN
                        </span>
                    )}
                    {!isNarrow && !isSuperAdmin && clinicName && (
                        <span className="text-xs text-gray-500 font-medium ml-9 truncate max-w-[180px]">{clinicName}</span>
                    )}
                </div>
                
                {/* Mobile Close Button */}
                <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}><X size={24} /></button>
                
                {/* Desktop Collapse Button */}
                <button 
                    className={`hidden md:flex text-gray-500 hover:text-white transition-colors items-center justify-center p-1 rounded-md hover:bg-white/5 ${isNarrow ? 'hidden' : 'block'}`}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expandir" : "Recolher"}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <div className={`px-4 py-4 bg-gray-900/50 border-b border-white/5 ${isNarrow ? 'flex flex-col items-center' : ''}`}>
                {!isNarrow ? (
                    <>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Logado como</p>
                        <p className="text-sm font-medium text-white truncate" title={userProfile?.email}>{userProfile?.email}</p>
                        <div className="flex items-center mt-2 space-x-2">
                            <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full inline-block capitalize font-bold border border-blue-500/20">
                                {userProfile?.role === 'administrator' ? 'Administrador' : 
                                userProfile?.role === 'dentist' ? 'Dentista' : 
                                userProfile?.role === 'employee' ? 'Funcionário' : 
                                userProfile?.role}
                            </span>
                            {userProfile?.clinics?.subscription_tier && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block uppercase font-bold border ${userProfile.clinics.subscription_tier === 'pro' ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 text-yellow-200 border-yellow-500/30' : userProfile.clinics.subscription_tier === 'starter' ? 'bg-blue-900/30 text-blue-300 border-blue-500/20' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                {userProfile.clinics.subscription_tier}
                            </span>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-900/30 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs" title={userProfile?.email}>
                        {userProfile?.email?.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <nav className="mt-4 px-3 space-y-1 pb-20 overflow-y-auto max-h-[calc(100vh-180px)] custom-scrollbar">
            {visibleNavItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden ${
                    isActive 
                    ? 'bg-primary text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] border border-primary/50' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white hover:border hover:border-white/5 border border-transparent'
                } ${isNarrow ? 'justify-center' : ''}`}
                title={isNarrow ? item.label : ''}
                >
                <div className={`relative ${isNarrow ? '' : 'mr-3'}`}>
                    <item.icon className={`h-5 w-5 ${item.key === 'smart-record' ? 'text-purple-400' : ''}`} />
                    {item.badge && pendingRequests > 0 && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span>}
                </div>
                {!isNarrow && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
                {!isNarrow && item.badge && pendingRequests > 0 && <span className="ml-auto bg-red-500 text-white py-0.5 px-1.5 rounded-md text-[10px] font-bold min-w-[18px] text-center">{pendingRequests}</span>}
                </NavLink>
            ))}

            {isSuperAdmin && (
                <NavLink 
                    to="/super-admin" 
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors mt-6 border border-red-500/30 ${isActive ? 'bg-red-500/20 text-red-200' : 'text-red-400 hover:bg-red-500/10'} ${isNarrow ? 'justify-center' : ''}`}
                    title={isNarrow ? 'God Mode' : ''}
                >
                    <Activity className={`${isNarrow ? '' : 'mr-3'} h-5 w-5`} />
                    {!isNarrow && <span className="flex-1 font-bold whitespace-nowrap">God Mode</span>}
                </NavLink>
            )}
            </nav>

            <div className="absolute bottom-0 w-full border-t border-white/5 bg-gray-900/95 p-4 backdrop-blur-sm">
            <button 
                onClick={handleLogout} 
                className={`flex items-center w-full px-3 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors ${isNarrow ? 'justify-center' : ''}`}
                title={isNarrow ? "Sair" : ""}
            >
                <LogOut className={`${isNarrow ? '' : 'mr-3'} h-5 w-5`} />
                {!isNarrow && "Sair"}
            </button>
            </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
            {/* ANNOUNCEMENT BANNER */}
            {announcement && (
                <div className={`w-full px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold border-b backdrop-blur-md z-50 ${getAnnouncementStyle(announcement.type)}`}>
                    {getAnnouncementIcon(announcement.type)}
                    <span className="truncate max-w-xl text-center">
                        <strong className="uppercase mr-2">{announcement.title}:</strong>
                        {announcement.message}
                    </span>
                    <button onClick={() => setAnnouncement(null)} className="ml-4 opacity-70 hover:opacity-100"><X size={16}/></button>
                </div>
            )}

            <div className="bg-gray-900 border-b border-white/5 p-4 flex items-center justify-between">
                <div className="flex items-center text-white font-bold gap-2">
                    <span className="md:hidden flex items-center gap-2">
                        <Logo className="w-6 h-6" /> 
                        <span>Denti<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hub</span></span>
                    </span>
                    {/* Botão de Debug Manual no Header (Desktop & Mobile) */}
                    <button 
                        onClick={runDiagnostics} 
                        disabled={loadingDebug}
                        className="ml-4 flex items-center gap-1 bg-red-900/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-900/50 transition"
                    >
                        <Bug size={14} className={loadingDebug ? "animate-spin" : ""} />
                        <span className="hidden sm:inline">Diagnóstico</span>
                        <span className="sm:hidden">Debug</span>
                    </button>
                </div>
                <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-400 hover:text-white">
                    <Menu size={24} />
                </button>
            </div>
            
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 custom-scrollbar">
                {children}
            </main>
        </div>
        </div>
    </DashboardContext.Provider>
  );
};

export default DashboardLayout;
