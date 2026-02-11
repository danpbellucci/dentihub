import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useDashboard } from '../DashboardLayout';
import { ClinicRole } from '../../types';
import { Users, Send, Loader2, Trash2 } from 'lucide-react';
import Toast, { ToastType } from '../Toast';

const DEFAULT_ROLES: ClinicRole[] = [ { name: 'dentist', label: 'Dentista' }, { name: 'employee', label: 'Funcionário' } ];

const TeamAccessSettings: React.FC = () => {
  const { userProfile } = useDashboard() || {};
  const [members, setMembers] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<ClinicRole[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  useEffect(() => {
      if (userProfile?.clinic_id) {
          fetchData();
      }
  }, [userProfile?.clinic_id]);

  const fetchData = async () => {
      setLoading(true);
      try {
          const { data: team } = await supabase.from('user_profiles').select('*').eq('clinic_id', userProfile?.clinic_id);
          if (team) setMembers(team);

          const { data: customRoles } = await supabase.from('clinic_roles').select('name, label').eq('clinic_id', userProfile?.clinic_id);
          const allRoles = [ { name: 'administrator', label: 'Administrador' }, ...DEFAULT_ROLES, ...(customRoles || []) ];
          setAvailableRoles(allRoles);
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const handleInvite = async (e: React.FormEvent) => { 
      e.preventDefault(); if (!inviteEmail) return; 
      setInviting(true); 
      try { 
          const { data: { session } } = await supabase.auth.getSession(); 
          if (!session) throw new Error("Sessão expirada."); 
          
          const { data: clinic } = await supabase.from('clinics').select('name').eq('id', userProfile?.clinic_id).single();
          
          const { data, error } = await supabase.functions.invoke('invite-employee', { 
              body: { email: inviteEmail, clinicName: clinic?.name || 'Clínica', role: inviteRole }, 
              headers: { Authorization: `Bearer ${session.access_token}` } 
          }); 
          
          if (error || (data && data.error)) throw new Error(data?.error || error.message); 
          setToast({ message: "Convite enviado!", type: 'success' }); 
          setInviteEmail(''); 
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setInviting(false); } 
  };

  const handleChangeMemberRole = async (memberId: string, newRole: string) => { 
      try { 
          await supabase.from('user_profiles').update({ role: newRole }).eq('id', memberId); 
          setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m)); 
          setToast({ message: "Perfil alterado.", type: 'success' }); 
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } 
  };

  const confirmDeleteMember = async () => { 
      if (!memberToDelete) return; 
      setDeletingMemberId(memberToDelete.id); 
      try { 
          const { data: { session } } = await supabase.auth.getSession(); 
          if (!session) throw new Error("Sessão expirada."); 
          const { data, error } = await supabase.functions.invoke('delete-team-member', { body: { userId: memberToDelete.id }, headers: { Authorization: `Bearer ${session.access_token}` } }); 
          if (error) throw error; 
          setMembers(prev => prev.filter(m => m.id !== memberToDelete.id)); 
          setToast({ message: "Membro removido.", type: 'success' }); 
          setMemberToDelete(null); 
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setDeletingMemberId(null); } 
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
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
                            <select className="bg-gray-900 border border-gray-700 rounded p-1.5 text-sm text-white" value={member.role} disabled={member.id === userProfile?.id} onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}>
                                <option value="administrator">Administrador</option>
                                {availableRoles.filter(r => r.name !== 'administrator').map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
                            </select>
                            {userProfile?.id !== member.id && <button onClick={() => setMemberToDelete(member)} className="text-gray-500 hover:text-red-500 transition p-2 bg-gray-800 rounded-full"><Trash2 size={16} /></button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {memberToDelete && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Remover Membro?</h3>
                    <div className="flex flex-col gap-3">
                        <button onClick={confirmDeleteMember} disabled={!!deletingMemberId} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-md">{deletingMemberId ? <Loader2 className="animate-spin mr-2" size={18}/> : 'Sim, Remover'}</button>
                        <button onClick={() => setMemberToDelete(null)} disabled={!!deletingMemberId} className="w-full bg-gray-800 text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-700 transition">Cancelar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default TeamAccessSettings;