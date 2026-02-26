
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Search, RefreshCw, CheckCircle, XCircle, 
  Loader2, Edit2, Save, CreditCard, ShieldAlert, Filter, X, Lock,
  Activity, BarChart3, Sparkles, Users, Tag, Menu
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Toast, { ToastType } from './Toast';

interface ClinicSubscription {
    id: string;
    name: string;
    email: string;
    subscription_tier: 'free' | 'starter' | 'pro';
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    created_at: string;
    is_manual_override?: boolean;
}

const SuperAdminSubscriptions: React.FC = () => {
    const navigate = useNavigate();
    const [clinics, setClinics] = useState<ClinicSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTier, setFilterTier] = useState<string>('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newTier, setNewTier] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: clinicsData, error } = await supabase
                .from('clinics')
                .select('id, name, email, subscription_tier, stripe_customer_id, stripe_subscription_id, created_at, is_manual_override')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedClinics: ClinicSubscription[] = clinicsData.map((c: any) => ({
                ...c,
                subscription_tier: c.subscription_tier || 'free'
            }));

            setClinics(formattedClinics);

        } catch (err: any) {
            console.error(err);
            setToast({ message: "Erro ao carregar dados: " + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePlan = async (clinicId: string) => {
        if (!newTier) return;
        setProcessing(true);
        try {
            const { error } = await supabase
                .from('clinics')
                .update({ 
                    subscription_tier: newTier,
                    is_manual_override: true 
                })
                .eq('id', clinicId);

            if (error) throw error;

            setClinics(prev => prev.map(c => c.id === clinicId ? { ...c, subscription_tier: newTier as any, is_manual_override: true } : c));
            setToast({ message: "Plano fixado com sucesso! (Override Ativo)", type: 'success' });
            setEditingId(null);
        } catch (err: any) {
            setToast({ message: "Erro ao atualizar: " + err.message, type: 'error' });
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveOverride = async (clinicId: string) => {
        if (!window.confirm("Isso removerá a proteção manual e sincronizará com o Stripe no próximo login do usuário. Confirmar?")) return;
        setProcessing(true);
        try {
            const { error } = await supabase.from('clinics').update({ is_manual_override: false }).eq('id', clinicId);
            if (error) throw error;
            setClinics(prev => prev.map(c => c.id === clinicId ? { ...c, is_manual_override: false } : c));
            setToast({ message: "Proteção manual removida.", type: 'info' });
        } catch (err: any) {
            setToast({ message: "Erro: " + err.message, type: 'error' });
        } finally {
            setProcessing(false);
        }
    };

    const filteredClinics = clinics.filter(c => {
        const matchesSearch = (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (c.id || '').includes(searchTerm);
        const matchesTier = filterTier === 'all' || c.subscription_tier === filterTier;
        return matchesSearch && matchesTier;
    });

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* --- OVERLAY MOBILE --- */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)}></div>}

            {/* --- LEFT SIDEBAR (UNIFIED) --- */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex-shrink-0 flex flex-col border-r border-gray-800 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div><h1 className="text-xl font-black text-white flex items-center gap-2"><Activity className="text-red-600" /> GOD MODE</h1><p className="text-xs text-gray-500 mt-1">Centro de Comando</p></div>
                    <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white md:hidden"><X size={24} /></button>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <button onClick={() => navigate('/super-admin')} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"><BarChart3 size={18} className="mr-3"/> Visão Geral</button>
                    <button onClick={() => navigate('/super-admin')} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"><Sparkles size={18} className="mr-3"/> Agente de Marketing</button>
                    
                    <div className="pt-4 mt-4 border-t border-gray-800">
                        <button onClick={() => navigate('/super-admin/campaigns')} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"><Sparkles size={18} className="mr-3"/> Marketing Studio</button>
                        <button onClick={() => navigate('/super-admin/leads')} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"><Users size={18} className="mr-3"/> Gestão de Leads</button>
                        <button className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all bg-primary text-white shadow-lg shadow-blue-900/20"><CreditCard size={18} className="mr-3"/> Assinaturas</button>
                        <button onClick={() => navigate('/super-admin/plans')} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"><Tag size={18} className="mr-3"/> Preços e Planos</button>
                    </div>
                </nav>
                <div className="p-4 border-t border-gray-800">
                    <button onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-center px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:text-white hover:border-gray-500 transition text-xs font-bold"><ArrowLeft size={14} className="mr-2"/> Voltar à Clínica</button>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col w-full relative">
                <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
                    <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><Activity className="text-red-600" size={20} /> God Mode</h2>
                    <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-1"><Menu size={24} /></button>
                </div>

                <div className="p-4 sm:p-8 animate-fade-in w-full">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Gestão de Assinaturas</h1>
                            <p className="text-sm text-gray-500">Controle manual de planos e status.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input type="text" placeholder="Buscar..." className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none w-full sm:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <select className="pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none appearance-none bg-white w-full sm:w-40" value={filterTier} onChange={e => setFilterTier(e.target.value)}>
                                    <option value="all">Todos Planos</option><option value="free">Free</option><option value="starter">Starter</option><option value="pro">Pro</option>
                                </select>
                            </div>
                            <button onClick={fetchData} className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-500" title="Atualizar"><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold">
                                    <tr><th className="px-6 py-4">Clínica / ID</th><th className="px-6 py-4">Contato</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-center">Plano Atual</th><th className="px-6 py-4 text-center">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {loading ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-green-500"/>Carregando dados...</td></tr>
                                    ) : filteredClinics.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhuma clínica encontrada.</td></tr>
                                    ) : (
                                        filteredClinics.map((clinic) => (
                                            <tr key={clinic.id} className="hover:bg-gray-50 transition group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800">{clinic.name || 'Sem Nome'}</div>
                                                    <div className="text-xs text-gray-400 font-mono mt-1">{clinic.id}</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {clinic.email || <span className="text-gray-400 italic">Não informado</span>}
                                                    <div className="text-xs text-gray-400 mt-1">Desde: {format(parseISO(clinic.created_at), 'dd/MM/yyyy')}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center space-y-1">
                                                    {clinic.stripe_subscription_id ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle size={12} className="mr-1"/> Stripe</span> : clinic.stripe_customer_id ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700"><CheckCircle size={12} className="mr-1"/> Cliente</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500"><XCircle size={12} className="mr-1"/> Off</span>}
                                                    {clinic.is_manual_override && <div className="flex justify-center"><button onClick={() => handleRemoveOverride(clinic.id)} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer border border-purple-200"><Lock size={10} className="mr-1"/> Travado Manual</button></div>}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {editingId === clinic.id ? (
                                                        <select className="border rounded p-1 text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none w-full max-w-[120px]" value={newTier} onChange={e => setNewTier(e.target.value)} autoFocus>
                                                            <option value="free">Free</option><option value="starter">Starter</option><option value="pro">Pro</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase w-20 text-center ${clinic.subscription_tier === 'pro' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : clinic.subscription_tier === 'starter' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{clinic.subscription_tier}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {editingId === clinic.id ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={() => handleUpdatePlan(clinic.id)} disabled={processing} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition">{processing ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}</button>
                                                            <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition"><X size={16}/></button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => { setEditingId(clinic.id); setNewTier(clinic.subscription_tier); }} className="text-gray-400 hover:text-blue-600 transition p-2 rounded hover:bg-blue-50"><Edit2 size={16}/></button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {filteredClinics.length > 0 && <div className="bg-yellow-50 p-3 border-t border-yellow-100 text-xs text-yellow-700 flex items-center justify-center gap-2"><ShieldAlert size={14} /><span>Atenção: Alterar o plano aqui <strong>trava (override)</strong> o status, impedindo que o Stripe o altere automaticamente até que você remova o cadeado.</span></div>}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SuperAdminSubscriptions;
