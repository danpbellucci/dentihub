import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { UserProfile, ClinicRole } from '../types';
import { 
  Save, Loader2, Shield, Users, CreditCard, Trash2, 
  AlertTriangle, CheckCircle, X, Mail, MapPin, Phone, Building,
  Upload, Copy, Send, Zap, Settings, LogOut, Lock, Plus, Pencil, Bell, Folder
} from 'lucide-react';
import Toast, { ToastType } from './Toast';
import SubscriptionPaymentModal from './SubscriptionPaymentModal';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Inicializa o Stripe fora do componente para evitar recriação
const stripePromise = loadStripe('pk_live_51SlBFr2Obfcu36b5A1xwCAouBbAsnZWRFEOEWYcfOmASaVvaBZM8uMhCCc11M3CNuaprfNXsVS0YnV3mlHQrXXKy00uj8Jzf7g');

const sanitizeSlug = (text: string) => {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD') // Decomposes accents
      .replace(/[\u0300-\u036f]/g, '') // Removes accent marks
      .replace(/[^a-z0-9\s-]/g, '') // Removes special chars
      .trim()
      .replace(/\s+/g, '-'); // Replaces spaces with hyphens
};

// Mapeamento dos módulos/páginas para exibição
const APP_MODULES = [
    { key: 'calendar', label: 'Agenda' },
    { key: 'clients', label: 'Pacientes' },
    { key: 'dentists', label: 'Dentistas' },
    { key: 'smart-record', label: 'Prontuário IA' },
    { key: 'messaging', label: 'Mensageria' },
    { key: 'finance', label: 'Financeiro' },
    { key: 'requests', label: 'Solicitações' },
    { key: 'guide', label: 'Guia Prático' },
    { key: 'settings', label: 'Configurações' },
];

// Mapeamento dos tipos de notificação
const NOTIFICATION_TYPES = [
    { key: 'agenda_daily', label: '📧 Resumo da Agenda (Dia Seguinte)' },
    { key: 'finance_daily', label: '📧 Previsão Financeira (Dia Seguinte)' },
    { key: 'system_campaigns', label: '📢 Campanhas e Avisos do Sistema' }
];

const DEFAULT_ROLES: ClinicRole[] = [
    { name: 'dentist', label: 'Dentista' },
    { name: 'employee', label: 'Funcionário' }
];

const SettingsPage: React.FC = () => {
  // Context & Navigation
  const { userProfile: contextProfile, refreshProfile } = useOutletContext<{ 
      userProfile: UserProfile | null;
      refreshProfile?: () => Promise<void>; 
  }>() || {};
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'permissions' | 'security' | 'billing'>('profile');
  
  // Clinic Data
  const [clinicData, setClinicData] = useState<any>({});
  
  // Permissions State
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [notificationsSettings, setNotificationsSettings] = useState<Record<string, Record<string, boolean>>>({});
  const [availableRoles, setAvailableRoles] = useState<ClinicRole[]>([]); // Includes Admin now
  const [newRoleName, setNewRoleName] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  
  // Edit Role State
  const [roleToEdit, setRoleToEdit] = useState<ClinicRole | null>(null);
  const [editRoleLabel, setEditRoleLabel] = useState('');

  // Team / Access Management
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // Billing
  const [subscription, setSubscription] = useState<any>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{name: string, price: string, priceId: string} | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Security
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  
  // Delete Account State
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // UI
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [contextProfile?.clinic_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
        let targetId = contextProfile?.clinic_id;

        // Fallback: Se não houver perfil no contexto (nova conta), tenta pegar o ID do usuário autenticado
        if (!targetId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) targetId = user.id;
        }

        if (!targetId) {
            setLoading(false);
            return;
        }

        // 1. Clinic Data
        const { data: clinic } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', targetId)
          .maybeSingle(); 
        
        if (clinic) {
            if (clinic.slug === clinic.id) {
                clinic.slug = sanitizeSlug(clinic.name);
            }
            setClinicData(clinic);
        } else {
            setClinicData({ id: targetId, name: '' });
        }

        // 2. Load Custom Roles & Assemble All Roles
        const { data: customRoles } = await supabase
            .from('clinic_roles')
            .select('name, label')
            .eq('clinic_id', targetId);
        
        // Inclui Administrador explicitamente na lista para a tabela
        const allRoles = [
            { name: 'administrator', label: 'Administrador' },
            ...DEFAULT_ROLES, 
            ...(customRoles || [])
        ];
        setAvailableRoles(allRoles);

        // 3. Permissions (Pages)
        const initialPerms: Record<string, Record<string, boolean>> = {};
        
        APP_MODULES.forEach(mod => {
            initialPerms[mod.key] = {};
            allRoles.forEach(role => {
                // Admin always true by default (enforced in toggle logic)
                if (role.name === 'administrator') {
                    initialPerms[mod.key][role.name] = true;
                } else {
                    initialPerms[mod.key][role.name] = true; // Default allow, adjusted below
                    // Default Restrictions for sensitive areas
                    if (mod.key === 'finance' || mod.key === 'settings' || mod.key === 'messaging') {
                        if (role.name === 'dentist' || role.name === 'employee') {
                            initialPerms[mod.key][role.name] = false;
                        }
                    }
                }
            });
        });

        const { data: perms } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('clinic_id', targetId);
        
        if (perms && perms.length > 0) {
            perms.forEach(p => {
                if (initialPerms[p.module]) {
                    initialPerms[p.module][p.role] = p.is_allowed;
                }
            });
        }
        setPermissions(initialPerms);

        // 4. Notification Settings
        const initialNotifs: Record<string, Record<string, boolean>> = {};
        NOTIFICATION_TYPES.forEach(n => {
            initialNotifs[n.key] = {};
            allRoles.forEach(role => {
                initialNotifs[n.key][role.name] = false; // Default OFF
            });
        });

        // Load saved notifications
        const { data: notifs } = await supabase
            .from('role_notifications')
            .select('*')
            .eq('clinic_id', targetId);
        
        if (notifs) {
            notifs.forEach(n => {
                if (initialNotifs[n.notification_type]) {
                    initialNotifs[n.notification_type][n.role] = n.is_enabled;
                }
            });
        }
        setNotificationsSettings(initialNotifs);

        // 5. Members
        const { data: team } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('clinic_id', targetId);
        
        if (team) setMembers(team);

        // 6. Subscription Status
        await fetchSubscription();

    } catch (err) {
        console.error("Erro ao carregar configurações:", err);
    } finally {
        setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      await supabase.functions.invoke('check-subscription');
      const { data, error } = await supabase.functions.invoke('get-subscription-details');
      if (!error && data) {
        setSubscription(data);
        if (data.hasSubscription && data.status === 'active' && refreshProfile) {
            const stripeProductName = (data.product_name || '').toLowerCase();
            const currentTier = contextProfile?.clinics?.subscription_tier || 'free';
            let detectedTier = 'free';
            if (stripeProductName.includes('pro')) detectedTier = 'pro';
            else if (stripeProductName.includes('starter')) detectedTier = 'starter';
            if (currentTier !== detectedTier) await refreshProfile();
        }
      }
    } catch (e) {
      console.error("Erro ao buscar assinatura", e);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Validação de Tamanho
    if (file.size > 2 * 1024 * 1024) { // 2MB
        setToast({ message: "O arquivo deve ter no máximo 2MB.", type: 'warning' });
        return;
    }

    // Validação de Tipo
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setToast({ message: "Formato inválido. Apenas JPG, PNG ou WEBP.", type: 'warning' });
        return;
    }

    setUploadingLogo(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${clinicData.id || 'temp'}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage.from('clinic-logos').upload(filePath, file, { cacheControl: '3600', upsert: true });
        if (uploadError) throw uploadError; 
        const { data: { publicUrl } } = supabase.storage.from('clinic-logos').getPublicUrl(filePath);
        setClinicData({ ...clinicData, logo_url: publicUrl });
        setToast({ message: "Logo carregado! Clique em Salvar Alterações.", type: 'success' });
    } catch (error: any) {
        setToast({ message: "Erro no upload: " + (error.message || "Falha desconhecida"), type: 'error' });
    } finally {
        setUploadingLogo(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const maskPhone = (value: string) => {
    if (!value) return '';
    return value.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicData.name || !clinicData.address || !clinicData.city || !clinicData.state) {
        setToast({ message: "Por favor, preencha todos os campos obrigatórios.", type: 'warning' });
        return;
    }
    setSaving(true);
    try {
      let baseSlug = clinicData.slug;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!baseSlug || baseSlug.trim() === '' || uuidRegex.test(baseSlug)) baseSlug = sanitizeSlug(clinicData.name);
      else baseSlug = sanitizeSlug(baseSlug);

      let uniqueSlug = baseSlug;
      let counter = 0;
      let isUnique = false;
      while (!isUnique) {
          if (counter > 0) uniqueSlug = `${baseSlug}-${counter}`;
          const { data: existing } = await supabase.from('clinics').select('id').eq('slug', uniqueSlug).neq('id', clinicData.id).maybeSingle();
          if (!existing) isUnique = true; else counter++;
      }
      setClinicData((prev: any) => ({ ...prev, slug: uniqueSlug }));

      const { data: existingClinic } = await supabase.from('clinics').select('id').eq('id', clinicData.id).maybeSingle();
      const payload = {
          name: clinicData.name,
          slug: uniqueSlug,
          address: clinicData.address,
          city: clinicData.city,
          state: clinicData.state,
          phone: clinicData.phone,
          whatsapp: clinicData.whatsapp,
          email: clinicData.email,
          observation: clinicData.observation,
          logo_url: clinicData.logo_url
      };

      if (existingClinic) await supabase.from('clinics').update(payload).eq('id', clinicData.id);
      else await supabase.from('clinics').insert({ id: clinicData.id, ...payload, subscription_tier: 'free' });

      setToast({ message: "Perfil atualizado com sucesso!", type: 'success' });
      if (refreshProfile) await refreshProfile();
    } catch (err: any) {
      setToast({ message: "Erro ao atualizar: " + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
      if (!newRoleName.trim()) return;
      setSaving(true);
      try {
          const roleSlug = sanitizeSlug(newRoleName).replace(/-/g, '_');
          const { error } = await supabase.from('clinic_roles').insert({
              clinic_id: clinicData.id,
              name: roleSlug,
              label: newRoleName
          });
          if (error) throw error;
          
          setAvailableRoles(prev => [...prev, { name: roleSlug, label: newRoleName }]);
          setNewRoleName('');
          setIsCreatingRole(false);
          setToast({ message: "Perfil criado com sucesso!", type: 'success' });
          
          // Re-init permissions for new role
          setPermissions(prev => {
              const next = { ...prev };
              APP_MODULES.forEach(mod => {
                  if (!next[mod.key]) next[mod.key] = {};
                  next[mod.key][roleSlug] = false;
              });
              return next;
          });
          // Re-init notifications for new role
          setNotificationsSettings(prev => {
              const next = { ...prev };
              NOTIFICATION_TYPES.forEach(n => {
                  if (!next[n.key]) next[n.key] = {};
                  next[n.key][roleSlug] = false;
              });
              return next;
          });

      } catch (err: any) {
          setToast({ message: "Erro ao criar perfil: " + err.message, type: 'error' });
      } finally {
          setSaving(false);
      }
  };

  const handleRoleClick = (role: ClinicRole) => {
      // Impede edição de roles padrão (incluindo admin)
      if (['dentist', 'employee', 'administrator'].includes(role.name)) return;
      
      setRoleToEdit(role);
      setEditRoleLabel(role.label);
  };

  const handleUpdateRole = async () => {
      if (!roleToEdit || !editRoleLabel.trim()) return;
      setSaving(true);
      try {
          const { error } = await supabase
              .from('clinic_roles')
              .update({ label: editRoleLabel })
              .eq('clinic_id', clinicData.id)
              .eq('name', roleToEdit.name);
          
          if (error) throw error;

          setAvailableRoles(prev => prev.map(r => r.name === roleToEdit.name ? { ...r, label: editRoleLabel } : r));
          setRoleToEdit(null);
          setToast({ message: "Perfil atualizado!", type: 'success' });
      } catch (err: any) {
          setToast({ message: "Erro ao atualizar: " + err.message, type: 'error' });
      } finally {
          setSaving(false);
      }
  };

  const handleDeleteRole = async () => {
      if (!roleToEdit) return;
      setSaving(true);
      try {
          const { error } = await supabase
              .from('clinic_roles')
              .delete()
              .eq('clinic_id', clinicData.id)
              .eq('name', roleToEdit.name);
          
          if (error) throw error;

          setAvailableRoles(prev => prev.filter(r => r.name !== roleToEdit.name));
          setRoleToEdit(null);
          setToast({ message: "Perfil excluído!", type: 'success' });
      } catch (err: any) {
          setToast({ message: "Erro ao excluir: " + err.message, type: 'error' });
      } finally {
          setSaving(false);
      }
  };

  const handleSavePermissions = async () => {
      setSaving(true);
      try {
          // 1. Save Page Permissions
          const permUpdates = [];
          for (const moduleKey of Object.keys(permissions)) {
              for (const roleKey of Object.keys(permissions[moduleKey])) {
                  // Admin is managed implicitly/hardcoded to true, but we can save it too for consistency
                  // though the RLS/UI usually forces it.
                  permUpdates.push({
                      clinic_id: clinicData.id,
                      role: roleKey,
                      module: moduleKey,
                      is_allowed: permissions[moduleKey][roleKey]
                  });
              }
          }
          const { error: permError } = await supabase.from('role_permissions').upsert(permUpdates, { onConflict: 'clinic_id,role,module' });
          if (permError) throw permError;

          // 2. Save Notification Settings
          const notifUpdates = [];
          for (const notifKey of Object.keys(notificationsSettings)) {
              for (const roleKey of Object.keys(notificationsSettings[notifKey])) {
                  notifUpdates.push({
                      clinic_id: clinicData.id,
                      role: roleKey,
                      notification_type: notifKey,
                      is_enabled: notificationsSettings[notifKey][roleKey]
                  });
              }
          }
          const { error: notifError } = await supabase.from('role_notifications').upsert(notifUpdates, { onConflict: 'clinic_id,role,notification_type' });
          if (notifError) throw notifError;

          setToast({ message: "Configurações atualizadas com sucesso!", type: 'success' });
      } catch (err: any) {
          setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
      } finally {
          setSaving(false);
      }
  };

  const togglePermission = (moduleKey: string, roleName: string) => {
      // Bloqueia alteração para admin (sempre true)
      if (roleName === 'administrator') return;

      setPermissions(prev => ({
          ...prev,
          [moduleKey]: {
              ...prev[moduleKey],
              [roleName]: !prev[moduleKey]?.[roleName]
          }
      }));
  };

  const toggleNotification = (typeKey: string, roleName: string) => {
      // Permite alteração para todos, inclusive admin
      setNotificationsSettings(prev => ({
          ...prev,
          [typeKey]: {
              ...prev[typeKey],
              [roleName]: !prev[typeKey]?.[roleName]
          }
      }));
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Recarregue a página.");
      const { data, error } = await supabase.functions.invoke('invite-employee', {
        body: { email: inviteEmail, clinicName: clinicData.name, role: inviteRole },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      setToast({ message: "Convite enviado com sucesso!", type: 'success' });
      setInviteEmail('');
      setInviteRole('employee');
    } catch (err: any) {
      setToast({ message: "Erro ao convidar: " + err.message, type: 'error' });
    } finally {
      setInviting(false);
    }
  };

  const handleChangeMemberRole = async (memberId: string, newRole: string) => {
      try {
          const { error } = await supabase
            .from('user_profiles')
            .update({ role: newRole })
            .eq('id', memberId);
          
          if (error) throw error;
          
          setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
          setToast({ message: "Perfil alterado com sucesso.", type: 'success' });
      } catch (err: any) {
          setToast({ message: "Erro ao alterar perfil: " + err.message, type: 'error' });
      }
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    setDeletingMemberId(memberToDelete.id);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sessão expirada.");
        const { data, error } = await supabase.functions.invoke('delete-team-member', {
            body: { userId: memberToDelete.id },
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (error) {
            const { error: dbError } = await supabase.from('user_profiles').delete().eq('id', memberToDelete.id);
            if (dbError) throw dbError;
        } else if (data && data.error) throw new Error(data.error);
        setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
        setToast({ message: "Membro removido com sucesso.", type: 'success' });
        setMemberToDelete(null);
    } catch (err: any) {
        setToast({ message: "Erro ao remover: " + (err.message || "Falha desconhecida"), type: 'error' });
    } finally {
        setDeletingMemberId(null);
    }
  };

  const processCancellation = async () => {
      if (!subscription?.id) return;
      setProcessing(true);
      try {
          const { data, error } = await supabase.functions.invoke('cancel-subscription', { body: { subscriptionId: subscription.id } });
          if (error) throw error;
          if (data && data.error) throw new Error(data.error);
          setToast({ message: "Assinatura cancelada. O acesso continua até o fim do período.", type: 'info' });
          setShowCancelConfirmation(false);
          fetchSubscription();
      } catch (err: any) {
          setToast({ message: "Erro ao cancelar: " + err.message, type: 'error' });
      } finally {
          setProcessing(false);
      }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordData.newPassword !== passwordData.confirmPassword) {
          setToast({ message: "As senhas não coincidem.", type: 'warning' });
          return;
      }
      setSaving(true);
      try {
          const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
          if (error) throw error;
          setToast({ message: "Senha alterada com sucesso!", type: 'success' });
          setPasswordData({ newPassword: '', confirmPassword: '' });
      } catch (err: any) {
          setToast({ message: "Erro ao alterar senha: " + err.message, type: 'error' });
      } finally {
          setSaving(false);
      }
  };

  const handleDeleteAccount = async () => {
      if (!deleteConfirmed) return;
      setIsDeletingAccount(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Sessão inválida.");
          const { data, error } = await supabase.functions.invoke('delete-account', { headers: { Authorization: `Bearer ${session.access_token}` } });
          if (error) throw error;
          if (data && data.error) throw new Error(data.error);
          await supabase.auth.signOut();
          setToast({ message: "Conta excluída com sucesso. Redirecionando...", type: 'success' });
          setTimeout(() => { navigate('/'); window.location.reload(); }, 2000);
      } catch (err: any) {
          setToast({ message: "Erro ao excluir conta: " + (err.message || "Erro desconhecido"), type: 'error' });
          setIsDeletingAccount(false);
          setShowDeleteAccountModal(false);
      }
  };

  const openPaymentModal = async (planName: string, price: string, priceId: string) => {
      setSelectedPlan({ name: planName, price, priceId });
      setShowPaymentModal(true);
      setLoadingPayment(true);
      setClientSecret(null);
      try {
          const { data, error } = await supabase.functions.invoke('create-subscription', { body: { priceId } });
          if (error) throw error;
          if (data && data.error) throw new Error(data.error);
          if (data?.clientSecret) setClientSecret(data.clientSecret); else throw new Error("Falha ao iniciar pagamento.");
      } catch (err: any) {
          setToast({ message: "Não foi possível iniciar o pagamento: " + err.message, type: 'error' });
          setShowPaymentModal(false);
      } finally {
          setLoadingPayment(false);
      }
  };

  const copyToClipboard = () => {
      const url = `${window.location.origin}/#/${clinicData.slug}`;
      navigator.clipboard.writeText(url);
      setToast({ message: "Link copiado!", type: 'success' });
  };

  const currentTier = contextProfile?.clinics?.subscription_tier || 'free';

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-gray-500 font-medium">Carregando dados...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configurações</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden p-2">
                <nav className="space-y-1">
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Building size={18} className="mr-3" /> Perfil da Clínica
                    </button>
                    <button onClick={() => setActiveTab('team')} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'team' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Users size={18} className="mr-3" /> Gestão de Acessos
                    </button>
                    <button onClick={() => setActiveTab('permissions')} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'permissions' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Lock size={18} className="mr-3" /> Perfis de Acesso
                    </button>
                    <button onClick={() => setActiveTab('security')} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'security' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Shield size={18} className="mr-3" /> Segurança
                    </button>
                    <button onClick={() => setActiveTab('billing')} className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'billing' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <CreditCard size={18} className="mr-3" /> Planos e Assinatura
                    </button>
                </nav>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
                <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b">Dados da Clínica</h2>
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Clínica *</label>
                            <input type="text" required placeholder="Ex: Clínica Sorriso Perfeito" className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-1 focus:ring-primary outline-none" value={clinicData.name || ''} onChange={e => setClinicData({ ...clinicData, name: e.target.value, slug: sanitizeSlug(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço *</label>
                            <input type="text" required placeholder="Rua, Número, Bairro" className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-1 focus:ring-primary outline-none" value={clinicData.address || ''} onChange={e => setClinicData({...clinicData, address: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                                <input type="text" required placeholder="Ex: São Paulo" className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-1 focus:ring-primary outline-none" value={clinicData.city || ''} onChange={e => setClinicData({...clinicData, city: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                                <select required className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-1 focus:ring-primary outline-none bg-white" value={clinicData.state || ''} onChange={e => setClinicData({...clinicData, state: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label><input type="text" className="w-full border rounded p-2.5" value={clinicData.phone || ''} onChange={e => setClinicData({...clinicData, phone: maskPhone(e.target.value)})} maxLength={15}/></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label><input type="text" className="w-full border rounded p-2.5" value={clinicData.whatsapp || ''} onChange={e => setClinicData({...clinicData, whatsapp: maskPhone(e.target.value)})} maxLength={15}/></div>
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Contato</label><input type="email" className="w-full border rounded p-2.5" value={clinicData.email || ''} onChange={e => setClinicData({...clinicData, email: e.target.value})} /></div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Logo da Clínica</label>
                            <div className="flex items-center gap-4">
                                {clinicData.logo_url && (
                                    <div className="h-16 w-16 relative border rounded-lg overflow-hidden group">
                                        <img src={clinicData.logo_url} alt="Logo" className="object-cover h-full w-full" />
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setClinicData({...clinicData, logo_url: null}); }} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition hover:bg-red-600"><X size={12} /></button>
                                    </div>
                                )}
                                <div className={`flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => fileInputRef.current?.click()}>
                                    {uploadingLogo ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <><Upload className="h-6 w-6 mb-1 text-gray-400" /><span className="text-xs">Clique para {clinicData.logo_url ? 'alterar' : 'enviar'}</span></>}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </div>
                            </div>
                        </div>

                        <div><button type="submit" disabled={saving} className="bg-gray-900 text-white px-6 py-2.5 rounded-md font-bold hover:bg-black transition flex items-center shadow-md disabled:opacity-50">{saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}Salvar Alterações</button></div>
                    </form>
                    <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-2"><Copy size={16} /> Link de Agendamento</h4>
                        <div className="flex gap-2">
                            <input type="text" readOnly className="flex-1 border border-blue-200 rounded px-3 py-2 text-sm text-blue-800 bg-white" value={`${window.location.origin}/#/${clinicData.slug}`} />
                            <button onClick={copyToClipboard} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">Copiar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TEAM TAB */}
            {activeTab === 'team' && (
                <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b">Gestão de Acessos</h2>
                    
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Convidar membro</label>
                        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex-1 w-full">
                                <label className="text-xs text-gray-500 mb-1 block">E-mail</label>
                                <input type="email" required placeholder="email@funcionario.com" className="w-full border rounded p-2.5" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                            </div>
                            <div className="w-full sm:w-48">
                                <label className="text-xs text-gray-500 mb-1 block">Perfil</label>
                                <select className="w-full border rounded p-2.5 bg-white" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                                    {contextProfile?.role === 'administrator' && <option value="administrator">Administrador</option>}
                                    {availableRoles.filter(r => r.name !== 'administrator').map(role => (
                                        <option key={role.name} value={role.name}>{role.label}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" disabled={inviting} className="w-full sm:w-auto bg-primary text-white px-6 py-2.5 rounded font-bold hover:bg-sky-600 flex items-center justify-center shadow-md disabled:opacity-50">
                                {inviting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Send className="mr-2" size={18} />} Convidar
                            </button>
                        </form>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Membros ({members.length})</h3>
                        <div className="space-y-3">
                            {members.map(member => (
                                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition bg-white gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">{member.email?.charAt(0).toUpperCase()}</div>
                                        <div><p className="text-sm font-bold text-gray-900">{member.email}</p></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select 
                                            className={`border rounded p-1.5 text-sm bg-white ${contextProfile?.role !== 'administrator' ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                                            value={member.role}
                                            disabled={member.id === contextProfile?.id || contextProfile?.role !== 'administrator'}
                                            onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                                        >
                                            <option value="administrator">Administrador</option>
                                            {availableRoles.filter(r => r.name !== 'administrator').map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
                                        </select>
                                        
                                        {contextProfile?.id !== member.id && contextProfile?.role === 'administrator' && (
                                            <button onClick={() => setMemberToDelete(member)} className="text-gray-400 hover:text-red-500 transition p-2 bg-gray-100 rounded-full">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* PERMISSIONS TAB */}
            {activeTab === 'permissions' && (
                <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Perfis e Permissões</h2>
                        <button onClick={handleSavePermissions} disabled={saving} className="bg-gray-900 text-white px-4 py-2 rounded-md font-bold hover:bg-black transition flex items-center shadow-sm disabled:opacity-50">
                            {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />} Salvar Alterações
                        </button>
                    </div>
                    
                    {/* Create New Role */}
                    <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 mb-2">Criar Novo Perfil</h3>
                        {isCreatingRole ? (
                            <div className="flex gap-2">
                                <input 
                                    className="flex-1 border rounded px-3 py-1.5 text-sm" 
                                    placeholder="Nome do Perfil (ex: Recepcionista)"
                                    value={newRoleName}
                                    onChange={e => setNewRoleName(e.target.value)}
                                    autoFocus
                                />
                                <button onClick={handleCreateRole} disabled={saving} className="bg-primary text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-sky-600">Criar</button>
                                <button onClick={() => setIsCreatingRole(false)} className="text-gray-500 px-3 py-1.5 text-sm hover:text-gray-700">Cancelar</button>
                            </div>
                        ) : (
                            <button onClick={() => setIsCreatingRole(true)} className="flex items-center text-sm text-primary font-bold hover:underline">
                                <Plus size={16} className="mr-1"/> Adicionar Perfil
                            </button>
                        )}
                    </div>

                    <p className="text-gray-600 mb-6 text-sm">
                        Defina o que cada perfil pode acessar e quais notificações devem receber. 
                        <br/>
                        <span className="text-xs text-gray-500 italic">* Administradores sempre têm acesso total a todas as páginas.</span>
                    </p>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Página / Módulo</th>
                                    {availableRoles.map(role => {
                                        const isCustom = !['dentist', 'employee', 'administrator'].includes(role.name);
                                        return (
                                            <th 
                                                key={role.name} 
                                                className={`px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider ${isCustom ? 'cursor-pointer hover:text-primary hover:underline' : ''}`}
                                                onClick={() => handleRoleClick(role)}
                                                title={isCustom ? "Clique para editar ou excluir" : "Perfil padrão"}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    {role.label}
                                                    {isCustom && <Pencil size={12} className="opacity-50" />}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {/* Permissões de Acesso (Páginas) */}
                                {APP_MODULES.map((module) => (
                                    <tr key={module.key}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{module.label}</td>
                                        {availableRoles.map(role => (
                                            <td key={`${module.key}-${role.name}`} className="px-6 py-4 whitespace-nowrap text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={permissions[module.key]?.[role.name] ?? false} 
                                                    onChange={() => togglePermission(module.key, role.name)}
                                                    disabled={role.name === 'administrator'} // Admin sempre acessa tudo
                                                    className={`h-5 w-5 rounded focus:ring-primary cursor-pointer ${role.name === 'administrator' ? 'text-gray-300 cursor-not-allowed bg-gray-100' : 'text-primary border-gray-300'}`}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}

                                {/* Separador Visual */}
                                <tr className="bg-gray-50">
                                    <td colSpan={availableRoles.length + 1} className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
                                        <Bell size={14} className="mr-2"/> Notificações por E-mail
                                    </td>
                                </tr>

                                {/* Notificações (Emails) */}
                                {NOTIFICATION_TYPES.map((notif) => (
                                    <tr key={notif.key}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 flex items-center">
                                            {notif.label}
                                        </td>
                                        {availableRoles.map(role => (
                                            <td key={`${notif.key}-${role.name}`} className="px-6 py-4 whitespace-nowrap text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={notificationsSettings[notif.key]?.[role.name] ?? false} 
                                                    onChange={() => toggleNotification(notif.key, role.name)}
                                                    className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
                <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in h-full flex flex-col gap-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b">Alterar Senha</h2>
                        <form onSubmit={handlePasswordChange} className="max-w-md">
                            <div className="space-y-6">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label><input type="password" required minLength={6} className="w-full border rounded p-2.5" placeholder="Mínimo 6 caracteres" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label><input type="password" required minLength={6} className="w-full border rounded p-2.5" placeholder="Repita a senha" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} /></div>
                                <div><button type="submit" disabled={saving} className="bg-gray-900 text-white px-6 py-2.5 rounded font-bold hover:bg-black transition flex items-center shadow-md disabled:opacity-50">{saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle className="mr-2" size={18} />}Atualizar Senha</button></div>
                            </div>
                        </form>
                    </div>
                    {/* Zona de Perigo - Apenas Administradores */}
                    {contextProfile?.role === 'administrator' && (
                        <div className="border-t pt-8">
                            <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center"><AlertTriangle className="mr-2" size={20}/> Zona de Perigo</h3>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div><h4 className="font-bold text-red-800">Excluir Conta</h4><p className="text-sm text-red-600 mt-1 max-w-lg">Essa ação é irreversível. Todos os dados da clínica serão apagados permanentemente.</p></div>
                                <button onClick={() => { setDeleteConfirmed(false); setShowDeleteAccountModal(true); }} className="bg-white border border-red-300 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-50 transition shadow-sm">Excluir Conta</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* BILLING TAB */}
            {activeTab === 'billing' && (
                <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
                    {/* ... (Existing billing code) ... */}
                    <div className="flex justify-between items-start mb-6">
                        <div><h2 className="text-xl font-bold text-gray-800">Planos e Assinatura</h2><p className="text-gray-500 text-sm">Gerencie seu plano atual.</p></div>
                        <div className="text-right">
                            {currentTier !== 'free' ? (
                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-bold capitalize">{currentTier}</span>
                                        {subscription?.status && (
                                            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {subscription.status === 'active' ? 'Ativo' : subscription.status}
                                            </span>
                                        )}
                                    </div>
                                    {subscription?.current_period_end && <p className={`text-xs ${subscription.cancel_at_period_end ? 'text-red-500 font-bold' : 'text-gray-400'}`}>{subscription.cancel_at_period_end ? 'Expira em:' : 'Renova em:'} {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</p>}
                                    {/* Mostra botão de gerenciar apenas se tiver assinatura ativa no stripe (precisa do ID) */}
                                    {subscription?.id && (
                                        <button onClick={() => setShowSubscriptionDetails(true)} disabled={processing} className="flex items-center text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition shadow-sm disabled:opacity-50">{processing ? <Loader2 className="animate-spin mr-2" size={14}/> : <Settings className="mr-2" size={14}/>}Gerenciar Assinatura</button>
                                    )}
                                </div>
                            ) : (
                                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold uppercase mb-1">Plano Atual: FREE</span>
                            )}
                        </div>
                    </div>
                    {/* ... (Plans Grid) ... */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition bg-white flex flex-col">
                            <h4 className="font-bold text-gray-800 text-lg">Gratuito</h4><div className="my-4"><span className="text-3xl font-black text-gray-900">R$ 0</span><span className="text-gray-500 text-sm">/mês</span></div>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2"/> Até 1 Dentista</li>
                                <li className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2"/> Até 30 Pacientes</li>
                                <li className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2"/> Prontuário IA (3 usos)</li>
                                <li className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2"/> Lembretes por E-mail</li>
                                <li className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2"/> Gestão Financeira</li>
                            </ul>
                            {currentTier === 'free' ? (
                                <button disabled className="w-full py-2 bg-gray-200 text-gray-500 rounded font-bold">Plano Atual</button>
                            ) : (
                                subscription?.cancel_at_period_end ? 
                                    <button disabled className="w-full py-2 bg-yellow-100 text-yellow-800 rounded font-bold">Retorno Agendado</button> :
                                    (subscription?.id ? <button onClick={() => setShowCancelConfirmation(true)} className="w-full py-2 border text-gray-600 rounded font-bold hover:bg-gray-50">Voltar para Grátis</button> : null)
                            )}
                        </div>
                        <div className="border border-blue-100 rounded-xl p-6 hover:shadow-xl transition bg-white flex flex-col"><h4 className="font-bold text-primary text-lg">Starter</h4><div className="my-4"><span className="text-3xl font-black text-gray-900">R$ 100</span><span className="text-gray-500 text-sm">/mês</span></div>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2"/> Até 3 Dentistas</li>
                                <li className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2"/> Até 100 Pacientes</li>
                                <li className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2"/> Prontuário IA (5 usos/dia)</li>
                                <li className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2"/> Lembretes por E-mail</li>
                                <li className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2"/> Todas func. do Gratuito</li>
                            </ul>
                            {currentTier === 'starter' ? <button disabled className="w-full py-2 bg-blue-100 text-blue-700 rounded font-bold">Plano Atual</button> : <button onClick={() => openPaymentModal('Starter', 'R$ 100,00', 'price_1SlMYr2Obfcu36b5HzK9JQPO')} className="w-full py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 shadow-md">Assinar Starter</button>}
                        </div>
                        <div className="border border-gray-800 rounded-xl p-6 hover:shadow-2xl transition bg-gray-900 text-white flex flex-col transform md:-translate-y-2"><div className="absolute top-4 right-4 text-yellow-400"><Zap size={20} fill="currentColor" /></div><h4 className="font-bold text-white text-lg">Pro</h4><div className="my-4"><span className="text-3xl font-black text-white">R$ 300</span><span className="text-gray-400 text-sm">/mês</span></div>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="text-green-400 mr-2"/> Dentistas Ilimitados</li>
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="text-green-400 mr-2"/> Pacientes Ilimitados</li>
                                <li className="flex items-center text-sm text-gray-300"><CheckCircle size={16} className="text-green-400 mr-2"/> Prontuário IA Ilimitado</li>
                                <li className="flex items-center text-sm text-gray-300"><Folder size={16} className="text-green-400 mr-2"/> Arquivos (100MB/paciente)</li>
                            </ul>
                            {currentTier === 'pro' ? <button disabled className="w-full py-2 bg-gray-700 text-white rounded font-bold">Plano Atual</button> : <button onClick={() => openPaymentModal('Pro', 'R$ 300,00', 'price_1SlEBs2Obfcu36b5HrWAo2Fh')} className="w-full py-2 bg-white text-gray-900 rounded font-bold hover:bg-gray-100 shadow-lg">Assinar Pro</button>}
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {/* ROLE EDIT MODAL */}
            {roleToEdit && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-primary"/> Gerenciar Perfil
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Perfil</label>
                                <input 
                                    className="w-full border rounded p-2 text-sm"
                                    value={editRoleLabel} 
                                    onChange={e => setEditRoleLabel(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-2">
                                <button 
                                    onClick={handleUpdateRole} 
                                    disabled={saving}
                                    className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-sky-600 flex items-center justify-center"
                                >
                                    {saving ? <Loader2 className="animate-spin mr-2" size={16}/> : 'Salvar Alterações'}
                                </button>
                                
                                <button 
                                    onClick={handleDeleteRole}
                                    disabled={saving}
                                    className="w-full border border-red-200 text-red-600 bg-red-50 py-2 rounded font-bold hover:bg-red-100 flex items-center justify-center"
                                >
                                    <Trash2 size={16} className="mr-2"/> Excluir Perfil
                                </button>

                                <button 
                                    onClick={() => setRoleToEdit(null)}
                                    className="w-full text-gray-500 py-2 rounded font-bold hover:bg-gray-100"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Existing Modals (Subscription, Cancel, Member Delete) */}
            {/* ... (Existing modals maintained) ... */}
            {showSubscriptionDetails && subscription && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative"><button onClick={() => setShowSubscriptionDetails(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button><div className="p-6"><h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><CreditCard className="text-primary" /> Detalhes da Assinatura</h3><div className="space-y-4"><div className="p-4 bg-gray-50 rounded-lg border border-gray-100"><p className="text-sm text-gray-500 mb-1">Plano Atual</p><p className="font-bold text-lg text-gray-800">{subscription.product_name}</p></div></div><div className="mt-8 flex flex-col gap-3">{!subscription.cancel_at_period_end && <button onClick={() => {setShowSubscriptionDetails(false);setShowCancelConfirmation(true);}} className="w-full py-2.5 border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 transition flex justify-center items-center gap-2"><X size={16} /> Cancelar Assinatura</button>}<button onClick={() => setShowSubscriptionDetails(false)} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition">Fechar</button></div></div></div>
                </div>
            )}
            {showCancelConfirmation && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center"><h3 className="text-xl font-bold text-gray-900 mb-2">Cancelar Assinatura?</h3><p className="text-gray-600 mb-6 text-sm">Você tem certeza?</p><div className="flex flex-col gap-3"><button onClick={processCancellation} disabled={processing} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-md">{processing ? <Loader2 className="animate-spin mr-2" size={18}/> : 'Sim, Cancelar'}</button><button onClick={() => setShowCancelConfirmation(false)} disabled={processing} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition">Manter</button></div></div></div>
            )}
            {memberToDelete && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center"><h3 className="text-xl font-bold text-gray-900 mb-2">Remover Membro?</h3><div className="flex flex-col gap-3"><button onClick={confirmDeleteMember} disabled={!!deletingMemberId} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-md">{deletingMemberId ? <Loader2 className="animate-spin mr-2" size={18}/> : 'Sim, Remover'}</button><button onClick={() => setMemberToDelete(null)} disabled={!!deletingMemberId} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition">Cancelar</button></div></div></div>
            )}
            {showPaymentModal && selectedPlan && clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                    <SubscriptionPaymentModal planName={selectedPlan.name} price={selectedPlan.price} onClose={() => setShowPaymentModal(false)} />
                </Elements>
            )}
            {showDeleteAccountModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"><h3 className="text-xl font-bold text-red-600 mb-4">Excluir Conta?</h3><label className="flex items-start cursor-pointer"><input type="checkbox" className="mt-1 mr-3 h-5 w-5 text-red-600" checked={deleteConfirmed} onChange={(e) => setDeleteConfirmed(e.target.checked)} /><span className="text-sm text-gray-700">Estou ciente de que esta ação é <strong>irreversível</strong>.</span></label><div className="flex gap-3 justify-end mt-6"><button onClick={() => setShowDeleteAccountModal(false)} disabled={isDeletingAccount} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold">Cancelar</button><button onClick={handleDeleteAccount} disabled={!deleteConfirmed || isDeletingAccount} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex items-center">{isDeletingAccount ? <Loader2 className="animate-spin mr-2" size={18}/> : <Trash2 className="mr-2" size={18}/>}Confirmar</button></div></div></div>
            )}
        </div>
        </div>
        </div>
  );
};

export default SettingsPage;