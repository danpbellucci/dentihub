import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardLayout';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building, Users, Lock, Gift, Shield, CreditCard } from 'lucide-react';
import Toast, { ToastType } from './Toast';

// Import New Components
import ClinicProfileSettings from './settings/ClinicProfileSettings';
import TeamAccessSettings from './settings/TeamAccessSettings';
import RolesPermissionsSettings from './settings/RolesPermissionsSettings';
import ReferralSettings from './settings/ReferralSettings';
import SecuritySettings from './settings/SecuritySettings';
import BillingSettings from './settings/BillingSettings';

export default function SettingsPage() {
  const dashboard = useDashboard();
  const contextProfile = dashboard?.userProfile;
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'permissions' | 'security' | 'billing' | 'referrals'>('profile');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => { 
      if (location.state && (location.state as any).openBilling) {
          setActiveTab('billing');
      }
      
      const params = new URLSearchParams(location.search);
      if (params.get('success') === 'true') {
          setActiveTab('billing');
          setToast({ message: "Pagamento confirmado! Sua assinatura está ativa.", type: 'success' });
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
      }
  }, [location.state, location.search]);

  if (!contextProfile) return null;

  return (
    <div className="max-w-7xl mx-auto pb-10">
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
            {activeTab === 'profile' && <ClinicProfileSettings />}
            {activeTab === 'team' && <TeamAccessSettings />}
            {activeTab === 'permissions' && <RolesPermissionsSettings />}
            {activeTab === 'referrals' && <ReferralSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'billing' && <BillingSettings />}
        </div>
      </div>
    </div>
  );
}