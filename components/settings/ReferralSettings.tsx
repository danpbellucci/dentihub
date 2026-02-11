import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useDashboard } from '../DashboardLayout';
import { Gift, Award, Users, Zap, Copy, Loader2 } from 'lucide-react';
import Toast, { ToastType } from '../Toast';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ReferralSettings: React.FC = () => {
  const { userProfile } = useDashboard() || {};
  const [clinicData, setClinicData] = useState<any>({});
  const [referredClinics, setReferredClinics] = useState<any[]>([]);
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
          const { data } = await supabase.from('clinics').select('referral_code, bonus_expires_at').eq('id', userProfile?.clinic_id).single();
          if (data) setClinicData(data);

          const { data: refs, error } = await supabase.rpc('get_my_referrals_stats');
          if (!error && refs) setReferredClinics(refs);
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); setToast({ message: "Copiado!", type: 'success' }); };

  const hasBonus = clinicData.bonus_expires_at && isAfter(new Date(clinicData.bonus_expires_at), new Date());

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <h2 className="text-xl font-bold text-white mb-6 pb-2 border-b border-white/10 flex items-center gap-2">
            <Gift className="text-primary" size={24}/> Programa de Indicações
        </h2>

        {hasBonus && (
            <div className="mb-6 bg-gradient-to-r from-green-900/40 to-green-800/40 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Award size={24}/></div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Bônus Ativo!</h3>
                        <p className="text-xs text-gray-300">Você possui dias de acesso gratuito disponíveis.</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-xs text-gray-400 uppercase font-bold">Expira em</span>
                    <span className="block text-lg font-bold text-green-400">{format(parseISO(clinicData.bonus_expires_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                </div>
            </div>
        )}

        <div className="relative bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-white/10 rounded-2xl p-8 mb-8 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Award size={120} className="text-purple-400"/></div>
            <div className="relative z-10 text-center">
                <h3 className="text-2xl font-black text-white mb-2">Indique e Ganhe!</h3>
                <p className="text-gray-300 max-w-lg mx-auto mb-8">Ajude outros colegas a modernizar suas clínicas e ganhe benefícios exclusivos no DentiHub.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-white/5 flex items-start text-left">
                        <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400 mr-4"><Users size={24}/></div>
                        <div><h4 className="font-bold text-white text-sm">Ganhe 1 Mês de Starter</h4><p className="text-xs text-gray-400 mt-1">Para cada indicação que atingir 10 pacientes cadastrados.</p></div>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-white/5 flex items-start text-left">
                        <div className="p-3 bg-yellow-500/20 rounded-lg text-yellow-400 mr-4"><Zap size={24}/></div>
                        <div><h4 className="font-bold text-white text-sm">Ganhe 1 Mês de Pro</h4><p className="text-xs text-gray-400 mt-1">Para cada indicação que assinar um plano pago.</p></div>
                    </div>
                </div>
            </div>
        </div>

        <div className="text-center mb-12">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">SEU CÓDIGO DE INDICAÇÃO</h3>
            <div className="relative max-w-md mx-auto">
                <div className="border-2 border-dashed border-blue-500/30 bg-blue-900/10 rounded-xl p-4 flex items-center justify-between gap-4">
                    <span className="text-3xl font-mono font-bold text-white tracking-widest w-full text-center">{clinicData.referral_code || '------'}</span>
                    <button onClick={() => copyToClipboard(clinicData.referral_code)} className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white absolute right-4"><Copy size={20} /></button>
                </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">Compartilhe este código com seus colegas. Eles devem inseri-lo no momento do cadastro.</p>
        </div>

        <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><Users size={16}/> Clínicas Indicadas</h3>
            <div className="overflow-x-auto bg-gray-800/30 rounded-lg border border-white/5">
                <table className="min-w-full divide-y divide-white/5">
                    <thead className="bg-gray-800/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Nome da Clínica</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Data Cadastro</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Pacientes</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Plano</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Recompensa</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {referredClinics.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma indicação realizada ainda.</td></tr>
                        ) : (
                            referredClinics.map((clinic) => (
                                <tr key={clinic.id} className="hover:bg-white/5">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{clinic.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-center">{format(parseISO(clinic.created_at), 'dd/MM/yyyy')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center"><span className="bg-gray-800 px-2 py-1 rounded text-white font-mono">{clinic.patient_count || 0}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${clinic.subscription_tier === 'pro' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/20' : clinic.subscription_tier === 'starter' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/20' : 'bg-gray-700 text-gray-300'}`}>{clinic.subscription_tier}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {clinic.bonus_earned ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-900/30 text-green-400 border border-green-500/20"><Award size={10} className="mr-1"/> {clinic.bonus_earned === 'pro' ? 'Pro' : 'Starter'} (+30 Dias)</span> : <span className="text-gray-600 text-xs">-</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default ReferralSettings;