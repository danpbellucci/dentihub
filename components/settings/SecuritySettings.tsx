import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { CheckCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import Toast, { ToastType } from '../Toast';
import { useNavigate } from 'react-router-dom';

const SecuritySettings: React.FC = () => {
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const navigate = useNavigate();

  const handlePasswordChange = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (passwordData.newPassword !== passwordData.confirmPassword) { setToast({ message: "Senhas não coincidem.", type: 'warning' }); return; } 
      setSaving(true); 
      try { 
          const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword }); 
          if (error) throw error; 
          setToast({ message: "Senha alterada!", type: 'success' }); 
          setPasswordData({ newPassword: '', confirmPassword: '' }); 
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); } 
  };

  const handleDeleteAccount = async () => { 
      if (!deleteConfirmed) return; 
      setIsDeletingAccount(true); 
      try { 
          const { data: { session } } = await supabase.auth.getSession(); 
          if (!session) throw new Error("Sessão inválida."); 
          const { error } = await supabase.functions.invoke('delete-account', { headers: { Authorization: `Bearer ${session.access_token}` } }); 
          if (error) throw error; 
          await supabase.auth.signOut(); 
          setToast({ message: "Conta excluída. Adeus!", type: 'success' }); 
          setTimeout(() => { navigate('/'); window.location.reload(); }, 2000); 
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); setIsDeletingAccount(false); setShowDeleteAccountModal(false); } 
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5 flex flex-col gap-10">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
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

        {showDeleteAccountModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-md">
                    <h3 className="text-xl font-bold text-red-500 mb-4">Excluir Conta?</h3>
                    <label className="flex items-start cursor-pointer">
                        <input type="checkbox" className="mt-1 mr-3 h-5 w-5 bg-gray-800 border-gray-600 text-red-600" checked={deleteConfirmed} onChange={(e) => setDeleteConfirmed(e.target.checked)} />
                        <span className="text-sm text-gray-300">Estou ciente de que esta ação é <strong>irreversível</strong>.</span>
                    </label>
                    <div className="flex gap-3 justify-end mt-6">
                        <button onClick={() => setShowDeleteAccountModal(false)} disabled={isDeletingAccount} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-bold hover:bg-gray-700">Cancelar</button>
                        <button onClick={handleDeleteAccount} disabled={!deleteConfirmed || isDeletingAccount} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex items-center">
                            {isDeletingAccount ? <Loader2 className="animate-spin mr-2" size={18}/> : <Trash2 className="mr-2" size={18}/>}Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default SecuritySettings;