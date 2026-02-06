
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Search, RefreshCw, CheckCircle, XCircle, 
  Loader2, Edit2, Save, CreditCard, ShieldAlert, Filter, X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Toast, { ToastType } from './Toast';

interface ClinicSubscription {
    id: string;
    name: string;
    email: string; // Email de contato da clínica
    owner_email?: string; // Email do usuário admin
    subscription_tier: 'free' | 'starter' | 'pro';
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    created_at: string;
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Busca clínicas
            const { data: clinicsData, error } = await supabase
                .from('clinics')
                .select('id, name, email, subscription_tier, stripe_customer_id, stripe_subscription_id, created_at')
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
                .update({ subscription_tier: newTier })
                .eq('id', clinicId);

            if (error) throw error;

            setClinics(prev => prev.map(c => c.id === clinicId ? { ...c, subscription_tier: newTier as any } : c));
            setToast({ message: "Plano atualizado com sucesso! (Override Manual)", type: 'success' });
            setEditingId(null);
        } catch (err: any) {
            setToast({ message: "Erro ao atualizar: " + err.message, type: 'error' });
        } finally {
            setProcessing(false);
        }
    };

    const filteredClinics = clinics.filter(c => {
        const matchesSearch = 
            (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
            (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (c.id || '').includes(searchTerm);
        
        const matchesTier = filterTier === 'all' || c.subscription_tier === filterTier;

        return matchesSearch && matchesTier;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/super-admin')} className="p-2 bg-white border rounded-full hover:bg-gray-100 transition">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                                <CreditCard className="text-green-600" /> Gestão de Assinaturas
                            </h1>
                            <p className="text-sm text-gray-500">Controle manual de planos e status.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar clínica ou email..." 
                                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none w-full sm:w-64"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <select 
                                className="pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none appearance-none bg-white w-full sm:w-40"
                                value={filterTier}
                                onChange={e => setFilterTier(e.target.value)}
                            >
                                <option value="all">Todos Planos</option>
                                <option value="free">Free</option>
                                <option value="starter">Starter</option>
                                <option value="pro">Pro</option>
                            </select>
                        </div>
                        <button onClick={fetchData} className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-500" title="Atualizar">
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-4">Clínica / ID</th>
                                    <th className="px-6 py-4">Contato</th>
                                    <th className="px-6 py-4 text-center">Stripe</th>
                                    <th className="px-6 py-4 text-center">Plano Atual</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
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
                                            <td className="px-6 py-4 text-center">
                                                {clinic.stripe_subscription_id ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700" title="Assinatura Stripe Ativa">
                                                        <CheckCircle size={12} className="mr-1"/> Ativo
                                                    </span>
                                                ) : clinic.stripe_customer_id ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700" title="Cliente Stripe (Sem Assinatura Ativa)">
                                                        <CheckCircle size={12} className="mr-1"/> Cliente
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500" title="Sem vínculo Stripe">
                                                        <XCircle size={12} className="mr-1"/> Off
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {editingId === clinic.id ? (
                                                    <select 
                                                        className="border rounded p-1 text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none w-full max-w-[120px]"
                                                        value={newTier}
                                                        onChange={e => setNewTier(e.target.value)}
                                                        autoFocus
                                                    >
                                                        <option value="free">Free</option>
                                                        <option value="starter">Starter</option>
                                                        <option value="pro">Pro</option>
                                                    </select>
                                                ) : (
                                                    <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase w-20 text-center ${
                                                        clinic.subscription_tier === 'pro' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                                        clinic.subscription_tier === 'starter' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                        'bg-gray-100 text-gray-600 border border-gray-200'
                                                    }`}>
                                                        {clinic.subscription_tier}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {editingId === clinic.id ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => handleUpdatePlan(clinic.id)}
                                                            disabled={processing}
                                                            className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                            title="Salvar"
                                                        >
                                                            {processing ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                                        </button>
                                                        <button 
                                                            onClick={() => setEditingId(null)}
                                                            className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition"
                                                            title="Cancelar"
                                                        >
                                                            <X size={16}/>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => { setEditingId(clinic.id); setNewTier(clinic.subscription_tier); }}
                                                        className="text-gray-400 hover:text-blue-600 transition p-2 rounded hover:bg-blue-50"
                                                        title="Alterar Plano Manualmente"
                                                    >
                                                        <Edit2 size={16}/>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredClinics.length > 0 && (
                        <div className="bg-yellow-50 p-3 border-t border-yellow-100 text-xs text-yellow-700 flex items-center justify-center gap-2">
                            <ShieldAlert size={14} />
                            <span>Atenção: Alterar o plano aqui sobrescreve o banco de dados diretamente, independente do pagamento no Stripe.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminSubscriptions;
