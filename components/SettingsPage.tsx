
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { UserProfile, ClinicRole } from '../types';
import { Save, Loader2, Shield, Users, CreditCard, Trash2, AlertTriangle, CheckCircle, X, Building, Upload, Copy, Send, Zap, Settings, Lock, Plus, Pencil, Bell, Folder, Box, Gift, Award } from 'lucide-react';
import Toast, { ToastType } from './Toast';
import SubscriptionPaymentModal from './SubscriptionPaymentModal';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_live_51SlBFr2Obfcu36b5A1xwCAouBbAsnZWRFEOEWYcfOmASaVvaBZM8uMhCCc11M3CNuaprfNXsVS0YnV3mlHQrXXKy00uj8Jzf7g');

const sanitizeSlug = (text: string) => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
};

const APP_MODULES = [
    { key: 'calendar', label: 'Agenda' }, { key: 'clients', label: 'Pacientes' }, { key: 'dentists', label: 'Dentistas' },
    { key: 'smart-record', label: 'Prontuário IA' }, { key: 'messaging', label: 'Mensageria' }, { key: 'finance', label: 'Financeiro' },
    { key: 'inventory', label: 'Estoque' }, { key: 'requests', label: 'Solicitações' }, { key: 'guide', label: 'Guia Prático' }, { key: 'settings', label: 'Configurações' },
];
const NOTIFICATION_TYPES = [
    { key: 'new_request_alert', label: '🔔 Novas Solicitações Online' },
    { key: 'agenda_daily', label: '📧 Resumo da Agenda (Dia Seguinte)' }, 
    { key: 'finance_daily', label: '📧 Previsão Financeira (Dia Seguinte)' }, 
    { key: 'stock_low', label: '📦 Alerta de Estoque Baixo' },
    { key: 'system_campaigns', label: '📢 Campanhas e Avisos do Sistema' }
];
const DEFAULT_ROLES: ClinicRole[] = [ { name: 'dentist', label: 'Dentista' }, { name: 'employee', label: 'Funcionário' } ];

const SettingsPage: React.FC = () => {
  const { userProfile: contextProfile, refreshProfile } = useOutletContext<{ userProfile: UserProfile | null; refreshProfile?: () => Promise<void>; }>() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'permissions' | 'security' | 'billing' | 'referrals'>('profile');
  const [clinicData, setClinicData] = useState<any>({});
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [notificationsSettings, setNotificationsSettings] = useState<Record<string, Record<string, boolean>>>({});
  const [availableRoles, setAvailableRoles] = useState<ClinicRole[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<ClinicRole | null>(null);
  const [editRoleLabel, setEditRoleLabel] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{name: string, price: string, priceId: string} | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
      fetchData(); 
      if (location.state && (location.state as any).openBilling) {
          setActiveTab('billing');
      }
  }, [contextProfile?.clinic_id, location.state]);

  const fetchData = async () => {
    setLoading(true);
    try {
        let targetId = contextProfile?.clinic_id;
        if (!targetId) { const { data: { user } } = await supabase.auth.getUser(); if (user) targetId = user.id; }
        if (!targetId) { setLoading(false); return; }

        const { data: clinic } = await supabase.from('clinics').select('*').eq('id', targetId).maybeSingle();
        if (clinic) { if (clinic.slug === clinic.id) clinic.slug = sanitizeSlug(clinic.name); setClinicData(clinic); } else setClinicData({ id: targetId, name: '' });

        const { data: customRoles } = await supabase.from('clinic_roles').select('name, label').eq('clinic_id', targetId);
        const allRoles = [ { name: 'administrator', label: 'Administrador' }, ...DEFAULT_ROLES, ...(customRoles || []) ];
        setAvailableRoles(allRoles);

        const initialPerms: Record<string, Record<string, boolean>> = {};
        APP_MODULES.forEach(mod => { initialPerms[mod.key] = {}; allRoles.forEach(role => { if (role.name === 'administrator') initialPerms[mod.key][role.name] = true; else { initialPerms[mod.key][role.name] = true; if (['finance', 'settings', 'messaging', 'inventory'].includes(mod.key) && ['dentist', 'employee'].includes(role.name)) initialPerms[mod.key][role.name] = false; } }); });
        const { data: perms } = await supabase.from('role_permissions').select('*').eq('clinic_id', targetId);
        if (perms) perms.forEach(p => { if (initialPerms[p.module]) initialPerms[p.module][p.role] = p.is_allowed; });
        setPermissions(initialPerms);

        const initialNotifs: Record<string, Record<string, boolean>> = {};
        NOTIFICATION_TYPES.forEach(n => { initialNotifs[n.key] = {}; allRoles.forEach(role => initialNotifs[n.key][role.name] = false); });
        const { data: notifs } = await supabase.from('role_notifications').select('*').eq('clinic_id', targetId);
        if (notifs) notifs.forEach(n => { if (initialNotifs[n.notification_type]) initialNotifs[n.notification_type][n.role] = n.is_enabled; });
        setNotificationsSettings(initialNotifs);

        const { data: team } = await supabase.from('user_profiles').select('*').eq('clinic_id', targetId);
        if (team) setMembers(team);
        await fetchSubscription();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSubscription = async () => {
    try { await supabase.functions.invoke('check-subscription'); const { data, error } = await supabase.functions.invoke('get-subscription-details'); if (!error && data) { setSubscription(data); if (data.hasSubscription && data.status === 'active' && refreshProfile) await refreshProfile(); } } catch (e) { console.error(e); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) { setToast({ message: "Máximo 2MB.", type: 'warning' }); return; }
    setUploadingLogo(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${clinicData.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('clinic-logos').upload(fileName, file, { cacheControl: '3600', upsert: true });
        if (uploadError) throw uploadError; 
        const { data: { publicUrl } } = supabase.storage.from('clinic-logos').getPublicUrl(fileName);
        setClinicData({ ...clinicData, logo_url: publicUrl });
        setToast({ message: "Logo carregado!", type: 'success' });
    } catch (error: any) { setToast({ message: "Erro: " + error.message, type: 'error' }); } finally { setUploadingLogo(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const maskPhone = (value: string) => { if (!value) return ''; return value.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15); };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicData.name || !clinicData.address || !clinicData.city || !clinicData.state) { setToast({ message: "Preencha campos obrigatórios.", type: 'warning' }); return; }
    setSaving(true);
    try {
      let slug = clinicData.slug || sanitizeSlug(clinicData.name);
      if (/^[0-9a-f]{8}-/.test(slug)) slug = sanitizeSlug(clinicData.name);
      const { data: existing } = await supabase.from('clinics').select('id').eq('id', clinicData.id).maybeSingle();
      const payload = { name: clinicData.name, slug, address: clinicData.address, city: clinicData.city, state: clinicData.state, phone: clinicData.phone, whatsapp: clinicData.whatsapp, email: clinicData.email, logo_url: clinicData.logo_url };
      if (existing) await supabase.from('clinics').update(payload).eq('id', clinicData.id); else await supabase.from('clinics').insert({ id: clinicData.id, ...payload, subscription_tier: 'free' });
      setToast({ message: "Perfil atualizado!", type: 'success' }); if (refreshProfile) await refreshProfile();
    } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); }
  };

  const handleCreateRole = async () => { if (!newRoleName.trim()) return; setSaving(true); try { const slug = sanitizeSlug(newRoleName).replace(/-/g, '_'); await supabase.from('clinic_roles').insert({ clinic_id: clinicData.id, name: slug, label: newRoleName }); setAvailableRoles(prev => [...prev, { name: slug, label: newRoleName }]); setNewRoleName(''); setIsCreatingRole(false); setToast({ message: "Perfil criado!", type: 'success' }); } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); } };
  const handleUpdateRole = async () => { if (!roleToEdit || !editRoleLabel.trim()) return; setSaving(true); try { await supabase.from('clinic_roles').update({ label: editRoleLabel }).eq('clinic_id', clinicData.id).eq('name', roleToEdit.name); setAvailableRoles(prev => prev.map(r => r.name === roleToEdit.name ? { ...r, label: editRoleLabel } : r)); setRoleToEdit(null); setToast({ message: "Atualizado!", type: 'success' }); } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); } };
  const handleDeleteRole = async () => { if (!roleToEdit) return; setSaving(true); try { await supabase.from('clinic_roles').delete().eq('clinic_id', clinicData.id).eq('name', roleToEdit.name); setAvailableRoles(prev => prev.filter(r => r.name !== roleToEdit.name)); setRoleToEdit(null); setToast({ message: "Excluído!", type: 'success' }); } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); } };

  const handleSavePermissions = async () => {
      setSaving(true);
      try {
          const permUpdates = []; for (const m of Object.keys(permissions)) for (const r of Object.keys(permissions[m])) permUpdates.push({ clinic_id: clinicData.id, role: r, module: m, is_allowed: permissions[m][r] });
          await supabase.from('role_permissions').upsert(permUpdates, { onConflict: 'clinic_id,role,module' });
          const notifUpdates = []; for (const n of Object.keys(notificationsSettings)) for (const r of Object.keys(notificationsSettings[n])) notifUpdates.push({ clinic_id: clinicData.id, role: r, notification_type: n, is_enabled: notificationsSettings[n][r] });
          await supabase.from('role_notifications').upsert(notifUpdates, { onConflict: 'clinic_id,role,notification_type' });
          setToast({ message: "Configurações salvas!", type: 'success' });
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); }
  };

  const handleInvite = async (e: React.FormEvent) => { e.preventDefault(); if (!inviteEmail) return; setInviting(true); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error("Sessão expirada."); const { data, error } = await supabase.functions.invoke('invite-employee', { body: { email: inviteEmail, clinicName: clinicData.name, role: inviteRole }, headers: { Authorization: `Bearer ${session.access_token}` } }); if (error || (data && data.error)) throw new Error(data?.error || error.message); setToast({ message: "Convite enviado!", type: 'success' }); setInviteEmail(''); } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setInviting(false); } };
  const handleChangeMemberRole = async (memberId: string, newRole: string) => { try { await supabase.from('user_profiles').update({ role: newRole }).eq('id', memberId); setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m)); setToast({ message: "Perfil alterado.", type: 'success' }); } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } };
  const confirmDeleteMember = async () => { if (!memberToDelete) return; setDeletingMemberId(memberToDelete.id); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error("Sessão expirada."); const { data, error } = await supabase.functions.invoke('delete-team-member', { body: { userId: memberToDelete.id }, headers: { Authorization: `Bearer ${session.access_token}` } }); if (error) throw error; setMembers(prev => prev.filter(m => m.id !== memberToDelete.id)); setToast({ message: "Membro removido.", type: 'success' }); setMemberToDelete(null); } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setDeletingMemberId(null); } };
  const processCancellation = async () => { if (!subscription?.id) return; setProcessing(true); try { const { data, error } = await supabase.functions.invoke('cancel-subscription', { body: { subscriptionId: subscription.id } }); if (error) throw error; setToast({ message: "Cancelado com sucesso.", type: 'info' }); setShowCancelConfirmation(false); fetchSubscription(); } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setProcessing(false); } };
  const handlePasswordChange = async (e: React.FormEvent) => { e.preventDefault(); if (passwordData.newPassword !== passwordData.confirmPassword) { setToast({ message: "Senhas não coincidem.", type: 'warning' }); return; } setSaving(true); try { const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword }); if (error) throw error; setToast({ message: "Senha alterada!", type: 'success' }); setPasswordData({ newPassword: '', confirmPassword: '' }); } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); } };
  const handleDeleteAccount = async () => { if (!deleteConfirmed) return; setIsDeletingAccount(true); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error("Sessão inválida."); const { error } = await supabase.functions.invoke('delete-account', { headers: { Authorization: `Bearer ${session.access_token}` } }); if (error) throw error; await supabase.auth.signOut(); setToast({ message: "Conta excluída. Adeus!", type: 'success' }); setTimeout(() => { navigate('/'); window.location.reload(); }, 2000); } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); setIsDeletingAccount(false); setShowDeleteAccountModal(false); } };
  const openPaymentModal = async (planName: string, price: string, priceId: string) => { setSelectedPlan({ name: planName, price, priceId }); setShowPaymentModal(true); setLoadingPayment(true); try { const { data, error } = await supabase.functions.invoke('create-subscription', { body: { priceId } }); if (error || !data?.clientSecret) throw new Error("Falha no pagamento."); setClientSecret(data.clientSecret); } catch (err: any) { setToast({ message: err.message, type: 'error' }); setShowPaymentModal(false); } finally { setLoadingPayment(false); } };
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); setToast({ message: "Copiado para a área de transferência!", type: 'success' }); };
  const currentTier = contextProfile?.clinics?.subscription_tier || 'free';

  if (loading) return <div className="flex h-96 w-full items-center justify-center"><div className="flex flex-col items-center gap-3"><Loader2 className="h-10 w-10 animate-spin text-primary" /><span className="text-gray-500 font-medium">Carregando...</span></div></div>;

  return (
    <div className="max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-2xl font-bold text-white mb-6">Configurações</h1>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm overflow-hidden p-2 border border-white/5">
                <nav className="space-y-1">
                    {['profile', 'team', 'permissions', 'referrals', 'security', 'billing'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab as any)} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                            {tab === 'profile' && <Building size={18} className="mr-3" />}
                            {tab === 'team' && <Users size={18} className="mr-3" />}
                            {tab === 'permissions' && <Lock size={18} className="mr-3" />}
                            {tab === 'referrals' && <Gift size={18} className="mr-3" />}
                            {tab === 'security' && <Shield size={18} className="mr-3" />}
                            {tab === 'billing' && <CreditCard size={18} className="mr-3" />}
                            
                            {tab === 'profile' ? 'Perfil da Clínica' : 
                             tab === 'team' ? 'Gestão de Acessos' : 
                             tab === 'permissions' ? 'Perfis de Acesso' : 
                             tab === 'referrals' ? 'Indicações' :
                             tab === 'security' ? 'Segurança' : 
                             'Planos e Assinatura'}
                        </button>
                    ))}
                </nav>
            </div>
        </div>

        <div className="flex-1">
            {activeTab === 'profile' && (
                <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5">
                    <h2 className="text-xl font-bold text-white mb-6 pb-2 border-b border-white/10">Dados da Clínica</h2>
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div><label className="block text-sm font-medium text-gray-400 mb-1">Nome *</label><input required className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={clinicData.name || ''} onChange={e => setClinicData({ ...clinicData, name: e.target.value })} /></div>
                        <div><label className="block text-sm font-medium text-gray-400 mb-1">Endereço *</label><input required className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={clinicData.address || ''} onChange={e => setClinicData({...clinicData, address: e.target.value})} /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Cidade *</label><input required className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={clinicData.city || ''} onChange={e => setClinicData({...clinicData, city: e.target.value})} /></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Estado *</label>
                                <select required className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={clinicData.state || ''} onChange={e => setClinicData({...clinicData, state: e.target.value})}>
                                    <option value="">UF</option>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Telefone</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" value={clinicData.phone || ''} onChange={e => setClinicData({...clinicData, phone: maskPhone(e.target.value)})} maxLength={15}/></div>
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">WhatsApp</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" value={clinicData.whatsapp || ''} onChange={e => setClinicData({...clinicData, whatsapp: maskPhone(e.target.value)})} maxLength={15}/></div>
                        </div>
                        <div><label className="block text-sm font-medium text-gray-400 mb-1">E-mail</label><input type="email" className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" value={clinicData.email || ''} onChange={e => setClinicData({...clinicData, email: e.target.value})} /></div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Logo</label>
                            <div className="flex items-center gap-4">
                                {clinicData.logo_url && <div className="h-16 w-16 relative border border-white/10 rounded-lg overflow-hidden group"><img src={clinicData.logo_url} className="object-cover h-full w-full" /><button type="button" onClick={(e) => { e.stopPropagation(); setClinicData({...clinicData, logo_url: null}); }} className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition"><X size={12} /></button></div>}
                                <div className={`flex-1 border-2 border-dashed border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-800 transition cursor-pointer ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => fileInputRef.current?.click()}>
                                    {uploadingLogo ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <><Upload className="h-6 w-6 mb-1 text-gray-600" /><span className="text-xs">Clique para {clinicData.logo_url ? 'alterar' : 'enviar'}</span></>}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </div>
                            </div>
                        </div>
                        <div><button type="submit" disabled={saving} className="bg-primary text-white px-6 py-2.5 rounded-md font-bold hover:bg-sky-600 transition flex items-center shadow-md disabled:opacity-50">{saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}Salvar</button></div>
                    </form>
                    <div className="mt-8 bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2 mb-2"><Copy size={16} /> Link de Agendamento</h4>
                        <div className="flex gap-2">
                            <input type="text" readOnly className="flex-1 border border-blue-500/20 rounded px-3 py-2 text-sm text-blue-300 bg-blue-900/10" value={`${window.location.origin}/#/${clinicData.slug}`} />
                            <button onClick={() => copyToClipboard(`${window.location.origin}/#/${clinicData.slug}`)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">Copiar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: REFERRALS (INDICAÇÕES) */}
            {activeTab === 'referrals' && (
                <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5">
                    <h2 className="text-xl font-bold text-white mb-6 pb-2 border-b border-white/10 flex items-center gap-2">
                        <Gift className="text-primary"/> Programa de Indicações
                    </h2>
                    
                    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6 mb-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Award size={100} className="text-white"/></div>
                        <h3 className="text-2xl font-black text-white mb-2">Indique e Ganhe!</h3>
                        <p className="text-gray-300 max-w-2xl mx-auto mb-6">
                            Ajude outros colegas a modernizar suas clínicas e ganhe benefícios exclusivos no DentiHub.
                        </p>
                        
                        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
                            <div className="bg-gray-800/60 p-4 rounded-lg border border-white/10 flex items-start gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Users size={24}/></div>
                                <div>
                                    <h4 className="font-bold text-white">Ganhe 1 Mês de Starter</h4>
                                    <p className="text-sm text-gray-400">Para cada indicação que atingir 10 pacientes cadastrados.</p>
                                </div>
                            </div>
                            <div className="bg-gray-800/60 p-4 rounded-lg border border-white/10 flex items-start gap-3">
                                <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Zap size={24}/></div>
                                <div>
                                    <h4 className="font-bold text-white">Ganhe 1 Mês de Pro</h4>
                                    <p className="text-sm text-gray-400">Para cada indicação que assinar um plano pago.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-xl mx-auto">
                        <label className="block text-sm font-bold text-gray-400 mb-2 text-center uppercase tracking-wide">Seu Código de Indicação</label>
                        <div className="flex gap-2 relative">
                            <input 
                                type="text" 
                                readOnly 
                                value={clinicData.referral_code || '---'} 
                                className="w-full bg-gray-800 border-2 border-primary border-dashed rounded-lg p-4 text-center text-2xl font-mono font-black text-white tracking-widest focus:outline-none"
                            />
                            <button 
                                onClick={() => copyToClipboard(clinicData.referral_code)} 
                                className="absolute right-2 top-2 bottom-2 bg-gray-700 hover:bg-gray-600 text-white px-4 rounded font-bold transition flex items-center"
                                title="Copiar Código"
                            >
                                <Copy size={18}/>
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-3">
                            Compartilhe este código com seus colegas. Eles devem inseri-lo no momento do cadastro.
                        </p>
                    </div>
                </div>
            )}

            {/* ... Other Tabs ... */}
            
            {activeTab === 'team' && (
                <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5">
                    {/* ... (Team Content) ... */}
                    <h2 className="text-xl font-bold text-white mb-6 pb-2 border-b border-white/10">Gestão de Acessos</h2>
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-400 mb-2">Convidar membro</label>
                        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex-1 w-full"><label className="text-xs text-gray-500 mb-1 block">E-mail</label><input type="email" required className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
                            <div className="w-full sm:w-48"><label className="text-xs text-gray-500 mb-1 block">Perfil</label><select className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" value={inviteRole} onChange={e => setInviteRole(e.target.value)}><option value="administrator">Administrador</option>{availableRoles.filter(r => r.name !== 'administrator').map(role => <option key={role.name} value={role.name}>{role.label}</option>)}</select></div>
                            <button type="submit" disabled={inviting} className="w-full sm:w-auto bg-primary text-white px-6 py-2.5 rounded font-bold hover:bg-sky-600 flex items-center justify-center shadow-md disabled:opacity-50">{inviting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Send className="mr-2" size={18} />} Convidar</button>
                        </form>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Membros ({members.length})</h3>
                        <div className="space-y-3">
                            {members.map(member => (
                                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-white/10 rounded-lg hover:bg-gray-800/50 transition bg-gray-800/30 gap-4">
                                    <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 font-bold">{member.email?.charAt(0).toUpperCase()}</div><div><p className="text-sm font-bold text-white">{member.email}</p></div></div>
                                    <div className="flex items-center gap-3">
                                        <select className="bg-gray-900 border border-gray-700 rounded p-1.5 text-sm text-white" value={member.role} disabled={member.id === contextProfile?.id} onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}>
                                            <option value="administrator">Administrador</option>
                                            {availableRoles.filter(r => r.name !== 'administrator').map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
                                        </select>
                                        {contextProfile?.id !== member.id && <button onClick={() => setMemberToDelete(member)} className="text-gray-500 hover:text-red-500 transition p-2 bg-gray-800 rounded-full"><Trash2 size={16} /></button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white">Perfis e Permissões</h2>
                        <button onClick={handleSavePermissions} disabled={saving} className="bg-primary text-white px-4 py-2 rounded-md font-bold hover:bg-sky-600 transition flex items-center shadow-sm disabled:opacity-50">{saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />} Salvar</button>
                    </div>
                    <div className="mb-6 bg-gray-800/50 p-4 rounded-lg border border-white/10">
                        <h3 className="text-sm font-bold text-gray-300 mb-2">Criar Novo Perfil</h3>
                        {isCreatingRole ? (
                            <div className="flex gap-2">
                                <input className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white" placeholder="Nome do Perfil" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} autoFocus />
                                <button onClick={handleCreateRole} disabled={saving} className="bg-primary text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-sky-600">Criar</button>
                                <button onClick={() => setIsCreatingRole(false)} className="text-gray-400 px-3 py-1.5 text-sm hover:text-white">Cancelar</button>
                            </div>
                        ) : <button onClick={() => setIsCreatingRole(true)} className="flex items-center text-sm text-primary font-bold hover:underline"><Plus size={16} className="mr-1"/> Adicionar Perfil</button>}
                    </div>
                    <div className="overflow-x-auto border border-white/10 rounded-lg">
                        <table className="min-w-full divide-y divide-white/10">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-1/3">Página / Módulo</th>
                                    {availableRoles.map(role => {
                                        const isCustom = !['dentist', 'employee', 'administrator'].includes(role.name);
                                        return <th key={role.name} className={`px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider ${isCustom ? 'cursor-pointer hover:text-primary' : ''}`} onClick={() => { if(isCustom) { setRoleToEdit(role); setEditRoleLabel(role.label); }}} title={isCustom ? "Editar" : ""}>{role.label} {isCustom && <Pencil size={12} className="inline ml-1 opacity-50"/>}</th>;
                                    })}
                                </tr>
                            </thead>
                            <tbody className="bg-gray-900/40 divide-y divide-white/5">
                                {APP_MODULES.map((module) => (
                                    <tr key={module.key}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{module.label}</td>
                                        {availableRoles.map(role => (
                                            <td key={`${module.key}-${role.name}`} className="px-6 py-4 whitespace-nowrap text-center">
                                                <input type="checkbox" checked={permissions[module.key]?.[role.name] ?? false} onChange={() => { if (role.name !== 'administrator') setPermissions(prev => ({...prev, [module.key]: {...prev[module.key], [role.name]: !prev[module.key]?.[role.name]}})) }} disabled={role.name === 'administrator'} className={`h-5 w-5 rounded bg-gray-800 border-gray-600 focus:ring-primary ${role.name === 'administrator' ? 'text-gray-500' : 'text-primary'}`}/>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                <tr className="bg-gray-800"><td colSpan={availableRoles.length + 1} className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center"><Bell size={14} className="mr-2"/> Notificações</td></tr>
                                {NOTIFICATION_TYPES.map((notif) => (
                                    <tr key={notif.key}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">{notif.label}</td>
                                        {availableRoles.map(role => (
                                            <td key={`${notif.key}-${role.name}`} className="px-6 py-4 whitespace-nowrap text-center">
                                                <input type="checkbox" checked={notificationsSettings[notif.key]?.[role.name] ?? false} onChange={() => setNotificationsSettings(prev => ({...prev, [notif.key]: {...prev[notif.key], [role.name]: !prev[notif.key]?.[role.name]}}))} className="h-5 w-5 text-green-600 bg-gray-800 border-gray-600 rounded focus:ring-green-500"/>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5 flex flex-col gap-10">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-6 pb-2 border-b border-white/10">Alterar Senha</h2>
                        <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Nova Senha</label><input type="password" required minLength={6} className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} /></div>
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Confirmar Nova Senha</label><input type="password" required minLength={6} className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} /></div>
                            <div><button type="submit" disabled={saving} className="bg-primary text-white px-6 py-2.5 rounded font-bold hover:bg-sky-600 transition flex items-center shadow-md disabled:opacity-50">{saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle className="mr-2" size={18} />}Atualizar Senha</button></div>
                        </form>
                    </div>
                    <div className="border-t border-white/10 pt-8">
                        <h3 className="text-lg font-bold text-red-500 mb-4 flex items-center"><AlertTriangle className="mr-2" size={20}/> Zona de Perigo</h3>
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div><h4 className="font-bold text-red-400">Excluir Conta</h4><p className="text-sm text-red-300 mt-1 max-w-lg">Essa ação é irreversível.</p></div>
                            <button onClick={() => { setDeleteConfirmed(false); setShowDeleteAccountModal(true); }} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition">Excluir Conta</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'billing' && (
                <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5">
                    <div className="flex justify-between items-start mb-6">
                        <div><h2 className="text-xl font-bold text-white">Planos e Assinatura</h2><p className="text-gray-400 text-sm">Gerencie seu plano atual.</p></div>
                        <div className="text-right">
                            {currentTier !== 'free' ? (
                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-sm text-gray-300"><span className="font-bold capitalize">{currentTier}</span>{subscription?.status && <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${subscription.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>{subscription.status}</span>}</div>
                                    {subscription?.id && <button onClick={() => setShowSubscriptionDetails(true)} disabled={processing} className="flex items-center text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition shadow-sm disabled:opacity-50"><Settings className="mr-2" size={14}/>Gerenciar</button>}
                                </div>
                            ) : <span className="inline-block px-3 py-1 bg-gray-800 text-gray-400 rounded text-xs font-bold uppercase mb-1">Plano Atual: FREE</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="border border-white/10 rounded-xl p-6 bg-gray-800/50 flex flex-col relative overflow-hidden">
                            <h4 className="font-bold text-white text-lg">Gratuito</h4>
                            <div className="my-4"><span className="text-3xl font-black text-white">R$ 0</span><span className="text-sm text-gray-500">/mês</span></div>
                            <ul className="space-y-3 mb-6 flex-1">
                                <li className="flex items-center text-sm text-gray-400"><CheckCircle size={16} className="mr-2 text-gray-600"/> 1 Dentista</li>
                                <li className="flex items-center text-sm text-gray-400"><CheckCircle size={16} className="mr-2 text-gray-600"/> Até 30 Pacientes</li>
                                <li className="flex items-center text-sm text-gray-400"><CheckCircle size={16} className="mr-2 text-gray-600"/> Prontuário IA (3 usos totais)</li>
                                <li className="flex items-center text-sm text-gray-400"><CheckCircle size={16} className="mr-2 text-gray-600"/> Agenda & Financeiro</li>
                            </ul>
                            <button disabled className="w-full py-2 bg-gray-700 text-gray-400 rounded font-bold">Plano Atual</button>
                        </div>
                        <div className="border border-blue-500/30 rounded-xl p-6 bg-gray-800/50 flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-l border-b border-blue-500/30">POPULAR</div>
                            <h4 className="font-bold text-blue-400 text-lg">Starter</h4>
                            <div className="my-4"><span className="text-3xl font-black text-white">R$ 100</span><span className="text-sm text-gray-500">/mês</span></div>
                            <ul className="space-y-3 mb-6 flex-1">
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="mr-2 text-blue-500"/> Até 3 Dentistas</li>
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="mr-2 text-blue-500"/> Até 100 Pacientes</li>
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="mr-2 text-blue-500"/> Prontuário IA (5 usos/dia/dentista)</li>
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="mr-2 text-blue-500"/> Lembretes de Urgência</li>
                            </ul>
                            {currentTier === 'starter' ? <button disabled className="w-full py-2 bg-blue-900/30 text-blue-400 rounded font-bold">Plano Atual</button> : <button onClick={() => openPaymentModal('Starter', 'R$ 100,00', 'price_1SlMYr2Obfcu36b5HzK9JQPO')} className="w-full py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 shadow-lg shadow-blue-900/20">Assinar Starter</button>}
                        </div>
                        <div className="border border-yellow-500/30 rounded-xl p-6 bg-gray-800/50 flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100} className="text-yellow-500"/></div>
                            <h4 className="font-bold text-yellow-400 text-lg flex items-center gap-2"><Zap size={18} fill="currentColor"/> Pro</h4>
                            <div className="my-4"><span className="text-3xl font-black text-white">R$ 300</span><span className="text-sm text-gray-500">/mês</span></div>
                            <ul className="space-y-3 mb-6 flex-1 relative z-10">
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="mr-2 text-yellow-500"/> Até 5 Dentistas</li>
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="mr-2 text-yellow-500"/> Pacientes Ilimitados</li>
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="mr-2 text-yellow-500"/> Prontuário IA (10 usos/dia/dentista)</li>
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="mr-2 text-yellow-500"/> Arquivos (100MB/paciente)</li>
                            </ul>
                            {currentTier === 'pro' ? <button disabled className="w-full py-2 bg-yellow-900/30 text-yellow-400 rounded font-bold">Plano Atual</button> : <button onClick={() => openPaymentModal('Pro', 'R$ 300,00', 'price_1SlEBs2Obfcu36b5HrWAo2Fh')} className="w-full py-2 bg-white text-gray-900 rounded font-bold hover:bg-gray-200 shadow-lg">Assinar Pro</button>}
                        </div>
                    </div>
                </div>
            )}

            {/* Role Edit Modal */}
            {roleToEdit && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Settings size={20} className="text-primary"/> Gerenciar Perfil</h3>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" value={editRoleLabel} onChange={e => setEditRoleLabel(e.target.value)} /></div>
                            <div className="flex flex-col gap-2 pt-2">
                                <button onClick={handleUpdateRole} disabled={saving} className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-sky-600">{saving ? <Loader2 className="animate-spin mr-2" size={16}/> : 'Salvar'}</button>
                                <button onClick={handleDeleteRole} disabled={saving} className="w-full border border-red-500/30 text-red-400 bg-red-900/20 py-2 rounded font-bold hover:bg-red-900/40 flex items-center justify-center"><Trash2 size={16} className="mr-2"/> Excluir</button>
                                <button onClick={() => setRoleToEdit(null)} className="w-full text-gray-400 py-2 rounded font-bold hover:bg-gray-800">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Modals (Payment, Cancel, Delete Member/Account) */}
            {showPaymentModal && selectedPlan && clientSecret && <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}><SubscriptionPaymentModal planName={selectedPlan.name} price={selectedPlan.price} onClose={() => setShowPaymentModal(false)} /></Elements>}
            {showSubscriptionDetails && subscription && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6 relative"><button onClick={() => setShowSubscriptionDetails(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button><h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><CreditCard className="text-primary" /> Detalhes</h3><div className="p-4 bg-gray-800 rounded-lg border border-white/5 mb-4"><p className="text-sm text-gray-400 mb-1">Plano Atual</p><p className="font-bold text-lg text-white">{subscription.product_name}</p></div>{!subscription.cancel_at_period_end && <button onClick={() => {setShowSubscriptionDetails(false);setShowCancelConfirmation(true);}} className="w-full py-2.5 border border-red-500/30 text-red-400 rounded-lg font-bold hover:bg-red-900/20 flex justify-center items-center gap-2"><X size={16} /> Cancelar Assinatura</button>}</div></div>}
            {showCancelConfirmation && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-sm text-center"><h3 className="text-xl font-bold text-white mb-2">Cancelar Assinatura?</h3><p className="text-gray-400 mb-6 text-sm">Você tem certeza?</p><div className="flex flex-col gap-3"><button onClick={processCancellation} disabled={processing} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-md">{processing ? <Loader2 className="animate-spin mr-2" size={18}/> : 'Sim, Cancelar'}</button><button onClick={() => setShowCancelConfirmation(false)} disabled={processing} className="w-full bg-gray-800 text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-700 transition">Manter</button></div></div></div>}
            {memberToDelete && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-sm text-center"><h3 className="text-xl font-bold text-white mb-2">Remover Membro?</h3><div className="flex flex-col gap-3"><button onClick={confirmDeleteMember} disabled={!!deletingMemberId} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-md">{deletingMemberId ? <Loader2 className="animate-spin mr-2" size={18}/> : 'Sim, Remover'}</button><button onClick={() => setMemberToDelete(null)} disabled={!!deletingMemberId} className="w-full bg-gray-800 text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-700 transition">Cancelar</button></div></div></div>}
            {showDeleteAccountModal && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-md"><h3 className="text-xl font-bold text-red-500 mb-4">Excluir Conta?</h3><label className="flex items-start cursor-pointer"><input type="checkbox" className="mt-1 mr-3 h-5 w-5 bg-gray-800 border-gray-600 text-red-600" checked={deleteConfirmed} onChange={(e) => setDeleteConfirmed(e.target.checked)} /><span className="text-sm text-gray-300">Estou ciente de que esta ação é <strong>irreversível</strong>.</span></label><div className="flex gap-3 justify-end mt-6"><button onClick={() => setShowDeleteAccountModal(false)} disabled={isDeletingAccount} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-bold hover:bg-gray-700">Cancelar</button><button onClick={handleDeleteAccount} disabled={!deleteConfirmed || isDeletingAccount} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex items-center">{isDeletingAccount ? <Loader2 className="animate-spin mr-2" size={18}/> : <Trash2 className="mr-2" size={18}/>}Confirmar</button></div></div></div>}
        </div>
        </div>
        </div>
  );
};

export default SettingsPage;
