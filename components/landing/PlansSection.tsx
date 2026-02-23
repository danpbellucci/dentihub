import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { SubscriptionPlan } from '../../types';
import { Loader2, Crown, CheckCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PlansSection: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  // States for Enterprise Calculator
  const [entDentists, setEntDentists] = useState(6);
  const [entAiUsage, setEntAiUsage] = useState(20);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });
        
        if (error) throw error;
        
        const formatted = (data || []).map((p: any) => {
            let features = [];
            try {
                features = typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []);
            } catch (e) {
                console.error("Erro ao parsear features do plano:", p.slug, e);
                features = Array.isArray(p.features) ? p.features : [];
            }
            return {
                ...p,
                features
            };
        });
        
        setPlans(formatted);
    } catch (err) {
        console.error("Erro ao carregar planos:", err);
    } finally {
        setLoadingPlans(false);
    }
  };

  const goToAuth = (view: 'login' | 'signup' = 'login') => {
    navigate('/auth', { state: { view } });
  };

  const formatMoney = (val: number) => {
    try {
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
        // Fallback para navegadores que não suportam toLocaleString ou o locale pt-BR
        return val.toFixed(2).replace('.', ',');
    }
  };

  return (
    <section className="py-24 relative z-10" id="plans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white">Planos que cabem no seu bolso</h2>
              <p className="text-gray-400 mt-2">Escolha a opção ideal para o tamanho da sua clínica.</p>
          </div>

          {loadingPlans ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-white h-10 w-10"/></div>
          ) : plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                {plans.map((plan) => {
                    if (plan.is_enterprise) {
                        const priceDentist = plan.price_per_dentist || 60;
                        const priceAiBlock = plan.price_per_ai_block || 15;
                        const aiBlockSize = plan.ai_block_size || 5;

                        const baseCost = entDentists * priceDentist;
                        const aiCost = Math.ceil(entAiUsage / aiBlockSize) * priceAiBlock * entDentists;
                        const totalCost = baseCost + aiCost;

                        return (
                            <div key={plan.id} className="border border-purple-500/30 bg-gradient-to-b from-purple-900/20 to-gray-900 rounded-xl p-6 flex flex-col relative overflow-hidden ring-1 ring-purple-500/50">
                                <div className="absolute top-0 right-0 p-2"><Crown size={20} className="text-purple-400"/></div>
                                <h4 className="font-bold text-purple-400 text-lg flex items-center gap-2">{plan.name}</h4>
                                <p className="text-xs text-gray-400 mb-4 mt-1">Acima de 5 dentistas</p>
                                
                                <div className="space-y-4 mb-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Dentistas ({entDentists})</label>
                                        <input 
                                            type="range" min="6" max="50" step="1" 
                                            value={entDentists} 
                                            onChange={(e) => setEntDentists(parseInt(e.target.value))}
                                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                        <div className="text-right text-xs text-purple-300 font-bold">R$ {formatMoney(baseCost)}</div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Usos IA/dia/dentista ({entAiUsage})</label>
                                        <select 
                                            value={entAiUsage} 
                                            onChange={(e) => setEntAiUsage(parseInt(e.target.value))}
                                            className="w-full bg-gray-800 border border-gray-600 rounded text-xs text-white p-1"
                                        >
                                            {[5, 10, 15, 20, 25, 30, 50].map(v => <option key={v} value={v}>{v} usos</option>)}
                                        </select>
                                        <div className="text-right text-xs text-purple-300 font-bold mt-1">
                                            + R$ {formatMoney(aiCost)}
                                        </div>
                                    </div>

                                    <div className="bg-purple-900/30 p-3 rounded border border-purple-500/30 mt-2">
                                        <div className="flex justify-between items-center text-sm font-bold text-white">
                                            <span>Total:</span>
                                            <span>R$ {formatMoney(totalCost)}</span>
                                        </div>
                                        <span className="text-[10px] text-purple-300 block text-right">/mês</span>
                                    </div>
                                </div>

                                <ul className="space-y-3 mb-6 flex-1">
                                    {plan.features.map((feat: string, idx: number) => (
                                        <li key={idx} className="flex items-start text-xs text-gray-400">
                                            <CheckCircle size={14} className="text-purple-500 mr-2 mt-0.5 shrink-0"/>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                                
                                <button onClick={() => goToAuth('signup')} className="w-full py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-500 transition shadow-lg shadow-purple-900/20 text-sm mt-auto">Contratar Enterprise</button>
                            </div>
                        );
                    }

                    let cardClass = "bg-gray-900 rounded-2xl shadow-xl border p-8 relative flex flex-col";
                    let titleColor = "text-white";
                    let btnClass = "w-full py-3 rounded-lg font-bold transition";
                    let icon = null;

                    if (plan.slug === 'free') {
                        cardClass += " bg-gray-900/40 backdrop-blur border-white/5 hover:border-white/20";
                        titleColor = "text-white";
                        btnClass += " border border-white/20 text-white hover:bg-white/5";
                    } else if (plan.slug === 'starter') {
                        cardClass += " bg-gray-900 border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.15)] transform md:-translate-y-4";
                        titleColor = "text-blue-400";
                        btnClass += " bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20";
                    } else if (plan.slug === 'pro') {
                        cardClass += " bg-gradient-to-b from-gray-800 to-gray-900 border-white/10";
                        titleColor = "text-white flex items-center gap-2";
                        btnClass += " bg-white text-gray-900 hover:bg-gray-100";
                        icon = <Zap size={16} className="text-yellow-400 fill-yellow-400"/>;
                    } else {
                        cardClass += " border-white/10";
                        btnClass += " bg-gray-800 text-white hover:bg-gray-700";
                    }

                    return (
                        <div key={plan.id} className={cardClass}>
                            {plan.is_popular && <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">MAIS POPULAR</div>}
                            <h3 className={`text-lg font-bold ${titleColor}`}>{icon} {plan.name}</h3>
                            <p className="text-4xl font-black mt-4 mb-6 text-white">R$ {formatMoney(plan.price_monthly)} <span className="text-base font-normal text-gray-500">/mês</span></p>
                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feat: any, i: number) => (
                                    <li key={i} className="flex items-center text-gray-300">
                                        <CheckCircle size={18} className={`mr-2 ${plan.slug === 'starter' ? 'text-blue-500' : plan.slug === 'pro' ? 'text-green-400' : 'text-gray-600'}`} /> 
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => goToAuth('signup')} className={btnClass}>
                                {plan.slug === 'free' ? 'Começar Grátis' : 'Assinar Agora'}
                            </button>
                        </div>
                    );
                })}
              </div>
          ) : (
              <div className="text-center py-12 bg-gray-900/50 rounded-2xl border border-white/5 max-w-2xl mx-auto">
                  <p className="text-gray-400 mb-4">Não foi possível carregar os planos no momento.</p>
                  <button 
                    onClick={() => { setLoadingPlans(true); fetchPlans(); }}
                    className="text-primary hover:text-sky-400 font-bold flex items-center gap-2 mx-auto"
                  >
                      Tentar novamente
                  </button>
              </div>
          )}
        </div>
        
        <div id="plans-end-trigger" className="h-1 w-full pointer-events-none opacity-0"></div>
    </section>
  );
};

export default PlansSection;