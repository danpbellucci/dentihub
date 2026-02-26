
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, RefreshCw, Save, Edit2, X, Plus, Trash2, CheckCircle, Tag, CreditCard, Menu, Loader2, Users, Database, Zap, Lock, Sliders, Layout, Calculator,
  Activity, BarChart3, Sparkles
} from 'lucide-react';
import Toast, { ToastType } from './Toast';
import { SubscriptionPlan } from '../types';

const SuperAdminPlans: React.FC = () => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Tabs State
    const [activeTab, setActiveTab] = useState<'fixed' | 'custom'>('fixed');

    // Form State
    const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
        name: '',
        slug: '',
        price_monthly: 0,
        stripe_product_id: '',
        stripe_price_id: '',
        features: [],
        is_active: true,
        is_popular: false,
        is_enterprise: false,
        display_order: 0,
        max_dentists: null,
        max_patients: null,
        max_ai_usage: null,
        ai_usage_limit_type: 'daily',
        // Novos campos
        price_per_dentist: 60,
        price_per_ai_block: 15,
        ai_block_size: 5,
        stripe_dentist_price_id: '',
        stripe_ai_price_id: ''
    });
    
    // Feature Input
    const [featureInput, setFeatureInput] = useState('');

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('display_order', { ascending: true });
            
            if (error) throw error;
            
            // Tratamento robusto para features (Array ou String JSON)
            const formattedPlans = (data || []).map((p: any) => {
                let parsedFeatures: string[] = [];
                
                if (Array.isArray(p.features)) {
                    parsedFeatures = p.features;
                } else if (typeof p.features === 'string') {
                    try {
                        const parsed = JSON.parse(p.features);
                        if (Array.isArray(parsed)) parsedFeatures = parsed;
                    } catch (e) {
                        parsedFeatures = [];
                    }
                }

                return {
                    ...p,
                    features: parsedFeatures
                };
            });

            setPlans(formattedPlans);
        } catch (err: any) {
            setToast({ message: "Erro ao carregar planos: " + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (plan?: SubscriptionPlan) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData({
                name: plan.name,
                slug: plan.slug,
                price_monthly: plan.price_monthly,
                stripe_product_id: plan.stripe_product_id || '',
                stripe_price_id: plan.stripe_price_id || '',
                features: plan.features || [],
                is_active: plan.is_active,
                is_popular: plan.is_popular,
                is_enterprise: plan.is_enterprise,
                display_order: plan.display_order,
                max_dentists: plan.max_dentists,
                max_patients: plan.max_patients,
                max_ai_usage: plan.max_ai_usage,
                ai_usage_limit_type: plan.ai_usage_limit_type || 'daily',
                price_per_dentist: plan.price_per_dentist || 60,
                price_per_ai_block: plan.price_per_ai_block || 15,
                ai_block_size: plan.ai_block_size || 5,
                stripe_dentist_price_id: plan.stripe_dentist_price_id || '',
                stripe_ai_price_id: plan.stripe_ai_price_id || ''
            });
            setIsCreating(false);
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                slug: '',
                price_monthly: 0,
                stripe_product_id: '',
                stripe_price_id: '',
                features: [],
                is_active: true,
                is_popular: false,
                is_enterprise: activeTab === 'custom', 
                display_order: plans.length + 1,
                max_dentists: null,
                max_patients: null,
                max_ai_usage: null,
                ai_usage_limit_type: 'daily',
                price_per_dentist: 60,
                price_per_ai_block: 15,
                ai_block_size: 5,
                stripe_dentist_price_id: '',
                stripe_ai_price_id: ''
            });
            setIsCreating(true);
        }
    };

    const handleCloseModal = () => {
        setEditingPlan(null);
        setIsCreating(false);
        setFeatureInput('');
    };

    const handleAddFeature = () => {
        if (!featureInput.trim()) return;
        setFormData(prev => ({
            ...prev,
            features: [...(prev.features || []), featureInput.trim()]
        }));
        setFeatureInput('');
    };

    const handleRemoveFeature = (index: number) => {
        setFormData(prev => ({
            ...prev,
            features: (prev.features || []).filter((_, i) => i !== index)
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.slug) {
            setToast({ message: "Nome e Slug são obrigatórios.", type: 'warning' });
            return;
        }

        setProcessing(true);
        try {
            const payload: any = {
                name: formData.name,
                slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
                price_monthly: Number(formData.price_monthly),
                stripe_product_id: formData.stripe_product_id || null,
                stripe_price_id: formData.stripe_price_id || null,
                features: formData.features, 
                is_active: formData.is_active,
                is_popular: formData.is_popular,
                is_enterprise: formData.is_enterprise,
                display_order: Number(formData.display_order),
                max_dentists: formData.max_dentists === undefined || formData.max_dentists === null || String(formData.max_dentists) === '' ? null : Number(formData.max_dentists),
                max_patients: formData.max_patients === undefined || formData.max_patients === null || String(formData.max_patients) === '' ? null : Number(formData.max_patients),
                max_ai_usage: formData.max_ai_usage === undefined || formData.max_ai_usage === null || String(formData.max_ai_usage) === '' ? null : Number(formData.max_ai_usage),
                ai_usage_limit_type: formData.ai_usage_limit_type,
                // Garantir valores padrão para Enterprise
                price_per_dentist: formData.price_per_dentist ? Number(formData.price_per_dentist) : 60,
                price_per_ai_block: formData.price_per_ai_block ? Number(formData.price_per_ai_block) : 15,
                ai_block_size: formData.ai_block_size ? Number(formData.ai_block_size) : 5,
                stripe_dentist_price_id: formData.stripe_dentist_price_id || null,
                stripe_ai_price_id: formData.stripe_ai_price_id || null,
                updated_at: new Date().toISOString()
            };

            if (isCreating) {
                const { error } = await supabase.from('subscription_plans').insert(payload);
                if (error) throw error;
                setToast({ message: "Plano criado!", type: 'success' });
            } else if (editingPlan) {
                const { error } = await supabase.from('subscription_plans').update(payload).eq('id', editingPlan.id);
                if (error) throw error;
                setToast({ message: "Plano atualizado!", type: 'success' });
            }

            handleCloseModal();
            fetchPlans();
        } catch (err: any) {
            setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza? Isso pode afetar a exibição na Landing Page.")) return;
        setProcessing(true);
        try {
            const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
            if (error) throw error;
            setToast({ message: "Plano removido.", type: 'success' });
            fetchPlans();
        } catch (err: any) {
            setToast({ message: "Erro ao remover: " + err.message, type: 'error' });
        } finally {
            setProcessing(false);
        }
    };

    const filteredPlans = plans.filter(p => activeTab === 'custom' ? p.is_enterprise : !p.is_enterprise);

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
                        <button onClick={() => navigate('/super-admin/subscriptions')} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"><CreditCard size={18} className="mr-3"/> Assinaturas</button>
                        <button className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all bg-primary text-white shadow-lg shadow-blue-900/20"><Tag size={18} className="mr-3"/> Preços e Planos</button>
                    </div>
                </nav>
                <div className="p-4 border-t border-gray-800">
                    <button onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-center px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:text-white hover:border-gray-500 transition text-xs font-bold"><ArrowLeft size={14} className="mr-2"/> Voltar à Clínica</button>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col w-full relative">
                {/* Mobile Header */}
                <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
                    <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><Activity className="text-red-600" size={20} /> God Mode</h2>
                    <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-1"><Menu size={24} /></button>
                </div>

                <div className="p-4 sm:p-8 animate-fade-in w-full">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Tag className="text-blue-600"/> Gestão de Preços e Planos
                            </h1>
                            <p className="text-sm text-gray-500">Configure as ofertas do sistema.</p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button onClick={fetchPlans} className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-500" title="Atualizar">
                                <RefreshCw size={20} className={loading ? "animate-spin" : ""}/>
                            </button>
                            <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition flex items-center gap-2 text-sm shadow-lg shadow-blue-900/20">
                                <Plus size={18}/> Novo Plano
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-white rounded-xl border border-gray-200 mb-8 overflow-hidden shadow-sm">
                        <div className="flex border-b border-gray-100">
                            <button 
                                onClick={() => setActiveTab('fixed')}
                                className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'fixed' ? 'bg-gray-50 text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Layout size={16}/> Planos Fixos (Standard)
                            </button>
                            <button 
                                onClick={() => setActiveTab('custom')}
                                className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'custom' ? 'bg-gray-50 text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Sliders size={16}/> Planos Customizáveis (Enterprise)
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="w-full">
                        {loading ? (
                            <div className="text-center py-12 text-gray-500">Carregando planos...</div>
                        ) : filteredPlans.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                                <p className="text-gray-500 mb-4">Nenhum plano {activeTab === 'fixed' ? 'fixo' : 'customizável'} cadastrado.</p>
                                <button onClick={() => handleOpenModal()} className="text-primary font-bold hover:underline">Criar Primeiro Plano</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPlans.map(plan => (
                                    <div key={plan.id} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col relative transition-all hover:shadow-md ${plan.is_active ? 'border-gray-200' : 'border-red-100 bg-red-50/50'}`}>
                                        {plan.is_popular && <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg">POPULAR</div>}
                                        {!plan.is_active && <div className="absolute top-0 left-0 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-br-lg">INATIVO</div>}
                                        {plan.is_enterprise && <div className="absolute top-0 right-14 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">ENTERPRISE</div>}
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
                                                <p className="text-xs text-gray-500 font-mono">slug: {plan.slug}</p>
                                            </div>
                                            <div className="text-right">
                                                {plan.is_enterprise ? (
                                                    <div className="text-right">
                                                        <span className="text-sm font-black text-purple-600 bg-purple-50 px-2 py-1 rounded block mb-1">R$ {plan.price_per_dentist}/dentista</span>
                                                        <span className="text-[10px] text-gray-500">+ R$ {plan.price_per_ai_block} / {plan.ai_block_size} IA</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-2xl font-black text-gray-900">R$ {plan.price_monthly}</span>
                                                        <span className="text-xs text-gray-500 block">/mês</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {!plan.is_enterprise ? (
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 space-y-1">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><CreditCard size={10}/> Stripe IDs</p>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500">Product:</span>
                                                    <code className="text-gray-700 font-mono break-all">{plan.stripe_product_id || '-'}</code>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500">Price:</span>
                                                    <code className="text-gray-700 font-mono break-all">{plan.stripe_price_id || '-'}</code>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4 space-y-1">
                                                <p className="text-[10px] font-bold text-purple-400 uppercase flex items-center gap-1"><CreditCard size={10}/> Stripe IDs (Dinâmico)</p>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500">Product:</span>
                                                    <code className="text-purple-700 font-mono">{plan.stripe_product_id || '-'}</code>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500">Dentista:</span>
                                                    <code className="text-purple-700 font-mono">{plan.stripe_dentist_price_id || '-'}</code>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500">Bloco IA:</span>
                                                    <code className="text-purple-700 font-mono">{plan.stripe_ai_price_id || '-'}</code>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-4 space-y-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Limites do Sistema</p>
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span className="flex items-center gap-1"><Users size={12}/> Dentistas:</span>
                                                <span className="font-bold">{plan.is_enterprise ? 'Dinâmico' : (plan.max_dentists ?? '∞')}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span className="flex items-center gap-1"><Database size={12}/> Pacientes:</span>
                                                <span className="font-bold">{plan.max_patients ?? '∞'}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span className="flex items-center gap-1"><Zap size={12}/> IA ({plan.ai_usage_limit_type === 'total' ? 'Total' : 'Diária'}):</span>
                                                <span className="font-bold">{plan.is_enterprise ? 'Dinâmico' : (plan.max_ai_usage ?? '∞')}</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 mb-4">
                                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Features (Visual)</p>
                                            <ul className="space-y-1">
                                                {plan.features.slice(0, 4).map((feat, i) => (
                                                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                                        <CheckCircle size={12} className="text-green-500 mt-0.5 shrink-0"/> {feat}
                                                    </li>
                                                ))}
                                                {plan.features.length > 4 && <li className="text-xs text-gray-400 italic">+{plan.features.length - 4} itens...</li>}
                                            </ul>
                                        </div>

                                        <div className="flex gap-2 pt-4 border-t border-gray-100 mt-auto">
                                            <button onClick={() => handleOpenModal(plan)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded text-sm font-bold hover:bg-gray-200 transition flex items-center justify-center gap-1"><Edit2 size={14}/> Editar</button>
                                            <button onClick={() => handleDelete(plan.id)} className="p-2 text-red-400 hover:bg-red-50 rounded transition"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal de Edição/Criação */}
            {(editingPlan || isCreating) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">{isCreating ? 'Novo Plano' : 'Editar Plano'}</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome *</label>
                                    <input required className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Starter"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slug (URL) *</label>
                                    <input required className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="Ex: starter"/>
                                </div>
                            </div>

                            {/* Campo de Product ID (Global) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stripe Product ID</label>
                                <input className="w-full border rounded p-2 text-sm font-mono bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.stripe_product_id || ''} onChange={e => setFormData({...formData, stripe_product_id: e.target.value})} placeholder="prod_..."/>
                                <p className="text-[10px] text-gray-400 mt-1">Opcional: ID do produto no Stripe para referência.</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded border border-gray-200 col-span-2">
                                    <input type="checkbox" checked={formData.is_enterprise} onChange={e => setFormData({...formData, is_enterprise: e.target.checked})} className="rounded text-blue-600"/>
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 block">Plano Enterprise (Customizável)</span>
                                        <span className="text-xs text-gray-500">Habilita a calculadora de preço na Landing Page</span>
                                    </div>
                                </label>
                            </div>

                            {!formData.is_enterprise && (
                                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Mensal (R$)</label>
                                        <input type="number" step="0.01" className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.price_monthly} onChange={e => setFormData({...formData, price_monthly: Number(e.target.value)})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stripe Price ID</label>
                                        <input className="w-full border rounded p-2 text-sm font-mono bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.stripe_price_id || ''} onChange={e => setFormData({...formData, stripe_price_id: e.target.value})} placeholder="price_..."/>
                                    </div>
                                </div>
                            )}

                            {/* CALCULADORA DE PREÇOS (SÓ APARECE SE FOR ENTERPRISE) */}
                            {formData.is_enterprise && (
                                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 animate-fade-in">
                                    <h4 className="text-xs font-bold text-purple-700 uppercase mb-3 flex items-center gap-1"><Calculator size={12}/> Configuração da Calculadora (Stripe)</h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2 border-b border-purple-200 pb-3">
                                            <div>
                                                <label className="text-[10px] text-gray-500 block mb-1">Preço Base Dentista (R$)</label>
                                                <input 
                                                    type="number" step="0.01"
                                                    className="w-full border rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-purple-500" 
                                                    value={formData.price_per_dentist} 
                                                    onChange={e => setFormData({...formData, price_per_dentist: Number(e.target.value)})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 block mb-1">Stripe Price ID (Dentista)</label>
                                                <input 
                                                    className="w-full border rounded p-1.5 text-sm font-mono bg-white outline-none focus:ring-1 focus:ring-purple-500" 
                                                    value={formData.stripe_dentist_price_id || ''} 
                                                    onChange={e => setFormData({...formData, stripe_dentist_price_id: e.target.value})}
                                                    placeholder="price_..."
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 border-b border-purple-200 pb-3">
                                            <div>
                                                <label className="text-[10px] text-gray-500 block mb-1">Preço Bloco IA (R$)</label>
                                                <input 
                                                    type="number" step="0.01"
                                                    className="w-full border rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-purple-500" 
                                                    value={formData.price_per_ai_block} 
                                                    onChange={e => setFormData({...formData, price_per_ai_block: Number(e.target.value)})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 block mb-1">Stripe Price ID (Bloco IA)</label>
                                                <input 
                                                    className="w-full border rounded p-1.5 text-sm font-mono bg-white outline-none focus:ring-1 focus:ring-purple-500" 
                                                    value={formData.stripe_ai_price_id || ''} 
                                                    onChange={e => setFormData({...formData, stripe_ai_price_id: e.target.value})}
                                                    placeholder="price_..."
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">Tamanho do Bloco IA (usos)</label>
                                            <input 
                                                type="number" step="1"
                                                className="w-full border rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-purple-500" 
                                                value={formData.ai_block_size} 
                                                onChange={e => setFormData({...formData, ai_block_size: Number(e.target.value)})} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                <h4 className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center gap-1"><Lock size={12}/> Limites do Sistema</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-gray-600 w-1/2">Máx. Dentistas</label>
                                        <input 
                                            type="number" 
                                            className="w-1/2 border rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100" 
                                            value={formData.max_dentists ?? ''} 
                                            onChange={e => setFormData({...formData, max_dentists: e.target.value === '' ? null : Number(e.target.value)})} 
                                            placeholder={formData.is_enterprise ? "Dinâmico" : "Ilimitado"}
                                            disabled={!!formData.is_enterprise}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-gray-600 w-1/2">Máx. Pacientes</label>
                                        <input 
                                            type="number" 
                                            className="w-1/2 border rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500" 
                                            value={formData.max_patients ?? ''} 
                                            onChange={e => setFormData({...formData, max_patients: e.target.value === '' ? null : Number(e.target.value)})} 
                                            placeholder="Ilimitado"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="w-1/2">
                                            <label className="text-xs text-gray-600 block">Uso IA</label>
                                            <select 
                                                className="text-xs border rounded p-1 mt-1 w-full"
                                                value={formData.ai_usage_limit_type || 'daily'}
                                                onChange={e => setFormData({...formData, ai_usage_limit_type: e.target.value as any})}
                                            >
                                                <option value="daily">Diário / Dentista</option>
                                                <option value="total">Total / Vitalício</option>
                                            </select>
                                        </div>
                                        <input 
                                            type="number" 
                                            className="w-1/2 border rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100" 
                                            value={formData.max_ai_usage ?? ''} 
                                            onChange={e => setFormData({...formData, max_ai_usage: e.target.value === '' ? null : Number(e.target.value)})} 
                                            placeholder={formData.is_enterprise ? "Dinâmico" : "Ilimitado"}
                                            disabled={!!formData.is_enterprise}
                                        />
                                    </div>
                                    {formData.is_enterprise && <p className="text-[10px] text-blue-500 italic text-center">Em planos Enterprise, os limites de Dentistas e IA são definidos pelo cliente na contratação.</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ordem Exibição</label>
                                <input type="number" className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.display_order} onChange={e => setFormData({...formData, display_order: Number(e.target.value)})}/>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Features (Itens do Card)</label>
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        className="flex-1 border rounded p-2 text-sm outline-none" 
                                        placeholder="Ex: Até 3 Dentistas" 
                                        value={featureInput} 
                                        onChange={e => setFeatureInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                                    />
                                    <button type="button" onClick={handleAddFeature} className="bg-blue-600 text-white px-3 rounded text-sm font-bold hover:bg-blue-700">Add</button>
                                </div>
                                <ul className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {(formData.features || []).map((feat, i) => (
                                        <li key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-gray-200">
                                            <span>{feat}</span>
                                            <button type="button" onClick={() => handleRemoveFeature(i)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded text-blue-600"/>
                                    <span className="text-sm text-gray-700">Ativo</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.is_popular} onChange={e => setFormData({...formData, is_popular: e.target.checked})} className="rounded text-blue-600"/>
                                    <span className="text-sm text-gray-700">Destacar (Popular)</span>
                                </label>
                            </div>
                        </form>

                        <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button onClick={handleCloseModal} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded transition">Cancelar</button>
                            <button onClick={handleSave} disabled={processing} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition flex items-center shadow-sm disabled:opacity-50">
                                {processing ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>} Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminPlans;
