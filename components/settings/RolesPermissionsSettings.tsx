import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useDashboard } from '../DashboardLayout';
import { ClinicRole } from '../../types';
import { Save, Loader2, Plus, Pencil, Bell, Trash2, Settings } from 'lucide-react';
import Toast, { ToastType } from '../Toast';

const sanitizeSlug = (text: string) => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
};

const DEFAULT_ROLES: ClinicRole[] = [ { name: 'dentist', label: 'Dentista' }, { name: 'employee', label: 'Funcionário' } ];

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

const RolesPermissionsSettings: React.FC = () => {
  const { userProfile } = useDashboard() || {};
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [notificationsSettings, setNotificationsSettings] = useState<Record<string, Record<string, boolean>>>({});
  const [availableRoles, setAvailableRoles] = useState<ClinicRole[]>([]);
  
  const [newRoleName, setNewRoleName] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<ClinicRole | null>(null);
  const [editRoleLabel, setEditRoleLabel] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
      if (userProfile?.clinic_id) {
          fetchData();
      }
  }, [userProfile?.clinic_id]);

  const fetchData = async () => {
      setLoading(true);
      try {
          // Roles
          const { data: customRoles } = await supabase.from('clinic_roles').select('name, label').eq('clinic_id', userProfile?.clinic_id);
          const allRoles = [ { name: 'administrator', label: 'Administrador' }, ...DEFAULT_ROLES, ...(customRoles || []) ];
          setAvailableRoles(allRoles);

          // Permissions
          const initialPerms: Record<string, Record<string, boolean>> = {};
          APP_MODULES.forEach(mod => { 
              initialPerms[mod.key] = {}; 
              allRoles.forEach(role => { 
                  if (role.name === 'administrator') initialPerms[mod.key][role.name] = true; 
                  else { 
                      initialPerms[mod.key][role.name] = true; 
                      if (['finance', 'settings', 'messaging', 'inventory'].includes(mod.key) && ['dentist', 'employee'].includes(role.name)) {
                          initialPerms[mod.key][role.name] = false; 
                      }
                  } 
              }); 
          });
          const { data: perms } = await supabase.from('role_permissions').select('*').eq('clinic_id', userProfile?.clinic_id);
          if (perms) perms.forEach(p => { if (initialPerms[p.module]) initialPerms[p.module][p.role] = p.is_allowed; });
          setPermissions(initialPerms);

          // Notifications
          const initialNotifs: Record<string, Record<string, boolean>> = {};
          NOTIFICATION_TYPES.forEach(n => { initialNotifs[n.key] = {}; allRoles.forEach(role => initialNotifs[n.key][role.name] = false); });
          const { data: notifs } = await supabase.from('role_notifications').select('*').eq('clinic_id', userProfile?.clinic_id);
          if (notifs) notifs.forEach(n => { if (initialNotifs[n.notification_type]) initialNotifs[n.notification_type][n.role] = n.is_enabled; });
          setNotificationsSettings(initialNotifs);

      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const handleCreateRole = async () => { 
      if (!newRoleName.trim()) return; 
      setSaving(true); 
      try { 
          const slug = sanitizeSlug(newRoleName).replace(/-/g, '_'); 
          await supabase.from('clinic_roles').insert({ clinic_id: userProfile?.clinic_id, name: slug, label: newRoleName }); 
          setAvailableRoles(prev => [...prev, { name: slug, label: newRoleName }]); 
          setNewRoleName(''); 
          setIsCreatingRole(false); 
          setToast({ message: "Perfil criado!", type: 'success' }); 
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); } 
  };

  const handleUpdateRole = async () => { 
      if (!roleToEdit || !editRoleLabel.trim()) return; 
      setSaving(true); 
      try { 
          await supabase.from('clinic_roles').update({ label: editRoleLabel }).eq('clinic_id', userProfile?.clinic_id).eq('name', roleToEdit.name); 
          setAvailableRoles(prev => prev.map(r => r.name === roleToEdit.name ? { ...r, label: editRoleLabel } : r)); 
          setRoleToEdit(null); 
          setToast({ message: "Atualizado!", type: 'success' }); 
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); } 
  };

  const handleDeleteRole = async () => { 
      if (!roleToEdit) return; 
      setSaving(true); 
      try { 
          await supabase.from('clinic_roles').delete().eq('clinic_id', userProfile?.clinic_id).eq('name', roleToEdit.name); 
          setAvailableRoles(prev => prev.filter(r => r.name !== roleToEdit.name)); 
          setRoleToEdit(null); 
          setToast({ message: "Excluído!", type: 'success' }); 
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); } 
  };

  const handleSavePermissions = async () => {
      setSaving(true);
      try {
          const permUpdates = []; for (const m of Object.keys(permissions)) for (const r of Object.keys(permissions[m])) permUpdates.push({ clinic_id: userProfile?.clinic_id, role: r, module: m, is_allowed: permissions[m][r] });
          await supabase.from('role_permissions').upsert(permUpdates, { onConflict: 'clinic_id,role,module' });
          const notifUpdates = []; for (const n of Object.keys(notificationsSettings)) for (const r of Object.keys(notificationsSettings[n])) notifUpdates.push({ clinic_id: userProfile?.clinic_id, role: r, notification_type: n, is_enabled: notificationsSettings[n][r] });
          await supabase.from('role_notifications').upsert(notifUpdates, { onConflict: 'clinic_id,role,notification_type' });
          setToast({ message: "Configurações salvas!", type: 'success' });
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
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
    </div>
  );
};

export default RolesPermissionsSettings;