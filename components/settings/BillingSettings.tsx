
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useDashboard } from '../DashboardLayout';
import { SubscriptionPlan } from '../../types';
import { CreditCard, Check, Zap, ExternalLink, Loader2, Crown, Clock, RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Toast, { ToastType } from '../Toast';

const BillingSettings: React.FC = () => {
  const { userProfile, refreshProfile } = useDashboard() || {};
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null); // Stores ID of plan being processed
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // States for Enterprise Calculator
  const [entDentists, setEntDentists] = useState(6);
  const [entAiUsage, setEntAiUsage] = useState(20);

  useEffect(() => {
    if (userProfile) {
      fetchData();
      // Tenta sincronizar silenciosamente ao carregar para corrigir discrepâncias
      handleSyncCheck();
    }
  }, [userProfile]);

  const handleSyncCheck = async () => {
      try {
          const { data } = await supabase.functions.invoke('check-subscription');
          // Se houve atualização ou se o tier detectado é diferente do atual
          if (data?.updated || (data?.tier && data.tier !== userProfile?.clinics?.subscription_tier)) {
              if (refreshProfile) await refreshProfile();
              fetchData(); // Recarrega os detalhes da assinatura
          }
      } catch (e) {
          console.error("Auto-sync failed", e);
      }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Plans
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
        
      if (plansData) {
          const formattedPlans = plansData.map((p: any) => ({
              ...p,
              features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || [])
          }));
          setPlans(formattedPlans);
      }

      // 2. Fetch Subscription Details via Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          const { data, error } = await supabase.functions.invoke('get-subscription-details', {
              headers: { Authorization: `Bearer ${session.access_token}` }
          });
          if (!error && data) {
              setSubscription(data);
          }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
      setSyncing(true);
      try {
          const { data, error } = await supabase.functions.invoke('check-subscription');
          if (error) throw error;
          
          if (refreshProfile) await refreshProfile();
          await fetchData();
          
          const tierDisplay = data?.tier ? data.tier.toUpperCase() : (userProfile?.clinics?.subscription_tier?.toUpperCase() || 'FREE');
          setToast({ 
              message: `Sincronizado! Plano atual: ${tierDisplay}`, 
              type: 'success' 
          });
      } catch (err: any) {
          setToast({ message: "Erro ao sincronizar: " + err.message, type: 'error' });
      } finally {
          setSyncing(false);
      }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
      setProcessing(plan.id);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Sessão inválida.");

          // If plan is enterprise, redirect to contact or specific flow
          if (plan.is_enterprise) {
              window.open('https://wa.me/5511999999999?text=Tenho interesse no plano Enterprise do DentiHub', '_blank');
              setProcessing(null);
              return;
          }

          if (!plan.stripe_price_id) {
             throw new Error("ID de preço não configurado.");
          }

          const { data, error } = await supabase.functions.invoke('create-checkout', {
              body: { price_id: plan.stripe_price_id },
              headers: { Authorization: `Bearer ${session.access_token}` }
          });

          if (error) throw error;
          if (data?.url) {
              window.location.href = data.url;
          } else {
              throw new Error("Erro ao gerar checkout.");
          }
      } catch (err: any) {
          setToast({ message: "Erro: " + (err.message || "Falha ao iniciar pagamento."), type: 'error' });
          setProcessing(null);
      }
  };

  const handlePortal = async () => {
      setProcessing('portal');
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Sessão inválida.");

          const { data, error } = await supabase.functions.invoke('customer-portal', {
              headers: { Authorization: `Bearer ${session.access_token}` }
          });

          if (error) throw error;
          if (data?.url) {
              window.location.href = data.url;
          }
      } catch (err: any) {
          setToast({ message: "Erro: " + err.message, type: 'error' });
          setProcessing(null);
      }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32}/></div>;

  const currentTier = userProfile?.clinics?.subscription_tier || 'free';
  
  // Logic to determine if user has a paid/active status
  const isStripeActive = subscription?.hasSubscription && ['active', 'trialing'].includes(subscription?.status);
  const isDbPaidTier = ['starter', 'pro', 'enterprise'].includes(currentTier);
  const showActiveCard = isStripeActive || isDbPaidTier;

  const currentPlanFromDb = plans.find(p => p.slug === currentTier);

  // Fallback for display name if it's a custom Enterprise plan not in the standard list
  // Se o backend detectou Enterprise (via fallback), mas não achou o plano no DB, usamos o nome do produto do Stripe ou "Enterprise (Custom)"
  const displayData = {
      name: subscription?.product_name || currentPlanFromDb?.name || (currentTier === 'enterprise' ? 'Enterprise (Custom)' : currentTier.charAt(0).toUpperCase() + currentTier.slice(1)),
      status: subscription?.status || 'active',
      cancel_at_period_end: subscription?.cancel_at_period_end || false,
      amount: subscription?.amount || currentPlanFromDb?.price_monthly || 0,
      currency: subscription?.currency || 'BRL',
      interval: subscription?.interval || 'mês',
      date: subscription?.current_period_end ? format(parseISO(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : format(addDays(new Date(), 30), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  };

  const formatCurrency = (val: number, currency: string = 'BRL') => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency }).format(val);
  };

  return (
    <div className="space-y-8 animate-fade-in">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Current Subscription Status */}
        <div className={`rounded-xl border overflow-hidden ${currentTier === 'enterprise' ? 'bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-purple-500/30' : 'bg-gray-900/60 backdrop-blur-md border-white/10'}`}>
            <div className="px-6 py-4 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${currentTier === 'enterprise' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-900/20 text-primary'}`}>
                        {currentTier === 'enterprise' ? <Crown size={20}/> : <CreditCard size={20}/>}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">Assinatura Atual</h2>
                        <p className="text-xs text-gray-400">Gerencie seu plano e pagamentos.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleManualSync} 
                        disabled={syncing}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-2 border border-white/10"
                        title="Sincronizar"
                    >
                        <RefreshCw size={14} className={syncing ? "animate-spin" : ""}/> Sync
                    </button>
                    
                    {showActiveCard && (
                        <button 
                            onClick={handlePortal} 
                            disabled={!!processing}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-2 border border-white/10"
                        >
                            {processing === 'portal' ? <Loader2 className="animate-spin" size={14}/> : <ExternalLink size={14}/>}
                            Gerenciar no Stripe
                        </button>
                    )}
                </div>
            </div>

            <div className="px-6 py-4">
                {showActiveCard ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-black text-white">{displayData.name}</h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${displayData.cancel_at_period_end ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' : 'bg-green-900/30 text-green-400 border border-green-500/30'}`}>
                                    {displayData.cancel_at_period_end ? 'Cancela em breve' : 'Ativo'}
                                </span>
                            </div>
                            <div className="text-sm text-gray-400 flex items-center gap-2">
                                <span className="text-gray-300 font-bold">{formatCurrency(displayData.amount, displayData.currency)}</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                <span>Renova: {displayData.date}</span>
                            </div>
                        </div>
                        <div className="hidden sm:block">
                            {currentTier === 'enterprise' ? <Crown size={32} className="text-purple-500 opacity-20"/> : <Zap size={24} className="text-blue-400 fill-current opacity-20"/>}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-800 rounded-full text-gray-400"><CreditCard size={18}/></div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Plano Gratuito</h3>
                            <p className="text-xs text-gray-400">Faça um upgrade para desbloquear mais recursos.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Available Plans */}
        <div>
            <h3 className="text-lg font-bold text-white mb-4">Planos Disponíveis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {plans.map(plan => {
                    const isCurrent = plan.slug === currentTier;
                    
                    // LÓGICA ENTERPRISE
                    if (plan.is_enterprise) {
                        const priceDentist = plan.price_per_dentist || 60;
                        const priceAiBlock = plan.price_per_ai_block || 15;
                        const aiBlockSize = plan.ai_block_size || 5;

                        return (
                            <div key={plan.id} className={`border border-purple-500/30 bg-gradient-to-b from-purple-900/20 to-gray-900 rounded-xl p-6 flex flex-col relative overflow-hidden ring-1 ring-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all ${isCurrent ? 'ring-2 ring-purple-500' : ''}`}>
                                {isCurrent && <div className="absolute top-0 left-0 w-full bg-purple-600 text-white text-[10px] font-bold text-center py-1">SEU PLANO ATUAL</div>}
                                <div className="absolute top-0 right-0 p-3"><Crown size={20} className="text-purple-400"/></div>
                                <h4 className="font-bold text-purple-400 text-lg flex items-center gap-2 mt-2">{plan.name}</h4>
                                <p className="text-xs text-gray-400 mb-4 mt-1">Para grandes clínicas</p>
                                
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Dentistas ({entDentists})</label>
                                        <input 
                                            type="range" min="6" max="50" step="1" 
                                            value={entDentists} 
                                            onChange={(e) => setEntDentists(parseInt(e.target.value))}
                                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                        <div className="text-right text-xs text-purple-300 font-bold">R$ {entDentists * priceDentist},00</div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Usos IA/dia/dentista ({entAiUsage})</label>
                                        <select 
                                            value={entAiUsage} 
                                            onChange={(e) => setEntAiUsage(parseInt(e.target.value))}
                                            className="w-full bg-gray-800 border border-gray-600 rounded text-xs text-white p-1.5 focus:border-purple-500 outline-none"
                                        >
                                            {[5, 10, 15, 20, 25, 30, 50].map(v => <option key={v} value={v}>{v} usos</option>)}
                                        </select>
                                        <div className="text-right text-xs text-purple-300 font-bold mt-1">
                                            + R$ {Math.ceil(entAiUsage / aiBlockSize) * priceAiBlock * entDentists},00
                                        </div>
                                    </div>

                                    <div className="bg-purple-900/30 p-3 rounded border border-purple-500/30 mt-2">
                                        <div className="flex justify-between items-center text-sm font-bold text-white">
                                            <span>Total:</span>
                                            <span>R$ {(entDentists * priceDentist) + (Math.ceil(entAiUsage / aiBlockSize) * priceAiBlock * entDentists)},00</span>
                                        </div>
                                        <span className="text-[10px] text-purple-300 block text-right">/mês</span>
                                    </div>
                                </div>

                                <ul className="space-y-2 mb-6 flex-1">
                                    {plan.features.map((feat: string, idx: number) => (
                                        <li key={idx} className="flex items-start text-xs text-gray-400">
                                            <CheckCircle size={14} className="text-purple-500 mr-2 mt-0.5 shrink-0"/>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                                
                                {isCurrent ? (
                                    <button disabled className="w-full py-2 bg-gray-800 border border-gray-700 text-gray-400 rounded-lg font-bold cursor-default text-xs">Plano Atual</button>
                                ) : (
                                    <button onClick={() => handleSubscribe(plan)} disabled={!!processing} className="w-full py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-500 transition shadow-lg shadow-purple-900/20 text-xs">
                                        Contratar Enterprise
                                    </button>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div key={plan.id} className={`bg-gray-900/40 rounded-xl border p-6 flex flex-col relative transition-all hover:border-primary/50 ${isCurrent ? 'border-primary shadow-[0_0_20px_rgba(14,165,233,0.15)] bg-gray-900/80' : 'border-white/10'}`}>
                            {plan.is_popular && <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>}
                            
                            <div className="mb-4">
                                <h4 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                    {plan.name}
                                </h4>
                                <div className="flex items-end gap-1">
                                    <span className="text-2xl font-black text-gray-200">
                                        R$ {plan.price_monthly}
                                    </span>
                                    <span className="text-sm text-gray-500 mb-1">/mês</span>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature: string, idx: number) => (
                                    <li key={idx} className="flex items-start text-sm text-gray-400">
                                        <Check size={16} className="text-green-500 mr-2 mt-0.5 shrink-0"/>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {isCurrent ? (
                                <button disabled className="w-full py-2 bg-gray-800 border border-gray-700 text-gray-400 rounded-lg font-bold cursor-default">Plano Atual</button>
                            ) : (
                                <button 
                                    onClick={() => handleSubscribe(plan)} 
                                    disabled={!!processing}
                                    className={`w-full py-2 rounded-lg font-bold transition shadow-lg ${plan.is_enterprise ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-primary hover:bg-sky-600 text-white'}`}
                                >
                                    {processing === plan.id ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'Escolher Plano'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default BillingSettings;
