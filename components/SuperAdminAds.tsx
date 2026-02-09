
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Monitor, Target, MousePointer, Type, List, Layout, 
  Sparkles, Loader2, Copy, Megaphone, Image as ImageIcon, CheckCircle, Download, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Toast, { ToastType } from './Toast';

const SuperAdminAds: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [campaignData, setCampaignData] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setCampaignData(null);
        try {
            const { data, error } = await supabase.functions.invoke('generate-campaign-content', {
                body: { 
                    taskType: 'google_ads_setup',
                    prompt: 'Crie uma campanha de Pesquisa focada em converter dentistas que ainda usam papel ou planilhas. Enfatize a IA e o Plano Gratuito.' 
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);
            
            setCampaignData(data);
            setToast({ message: "Campanha gerada com sucesso!", type: 'success' });

        } catch (err: any) {
            console.error(err);
            setToast({ message: "Erro ao gerar: " + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (!campaignData) return;

        const wb = XLSX.utils.book_new();
        const campaignName = campaignData.campaign_name || 'Campanha DentiHub';
        const adGroupName = "Grupo de Anúncios 1";
        const finalUrl = "https://dentihub.com.br";

        // --- ABA 1: KW e Anúncios (Formato Google Ads Editor) ---
        const mainData: any[] = [];

        // 1. Linha do Anúncio Responsivo (RSA)
        const adRow: any = {
            'Campaign': campaignName,
            'Ad Group': adGroupName,
            'Final URL': finalUrl,
            'Ad type': 'Responsive search ad'
        };

        // Mapear Títulos (Headline 1 a 15)
        campaignData.ads.headlines.forEach((h: string, i: number) => {
            adRow[`Headline ${i + 1}`] = h;
        });

        // Mapear Descrições (Description 1 a 4)
        campaignData.ads.descriptions.forEach((d: string, i: number) => {
            adRow[`Description ${i + 1}`] = d;
        });

        mainData.push(adRow);

        // 2. Linhas das Palavras-Chave
        campaignData.keywords.forEach((kw: string) => {
            mainData.push({
                'Campaign': campaignName,
                'Ad Group': adGroupName,
                'Keyword': kw,
                'Criterion Type': 'Phrase', // Padrão seguro
                'Final URL': finalUrl
            });
        });

        const wsMain = XLSX.utils.json_to_sheet(mainData);
        XLSX.utils.book_append_sheet(wb, wsMain, "Anuncios_e_KWs");

        // --- ABA 2: Extensões (Sitelinks e Callouts) ---
        const extData: any[] = [];

        // Sitelinks
        if (campaignData.sitelinks) {
            campaignData.sitelinks.forEach((sl: any) => {
                extData.push({
                    'Campaign': campaignName,
                    'Placeholder Type': 'Sitelink',
                    'Link Text': sl.text,
                    'Description 1': sl.description,
                    'Description 2': '', // Google pede 2 linhas, mas a IA retorna 1 concatenada geralmente
                    'Final URL': finalUrl
                });
            });
        }

        // Callouts
        if (campaignData.callouts) {
            campaignData.callouts.forEach((c: string) => {
                extData.push({
                    'Campaign': campaignName,
                    'Placeholder Type': 'Callout',
                    'Callout Text': c
                });
            });
        }

        const wsExt = XLSX.utils.json_to_sheet(extData);
        XLSX.utils.book_append_sheet(wb, wsExt, "Extensoes");

        // Gerar Arquivo
        const fileName = `${campaignName.replace(/\s+/g, '_')}_GoogleAds.xlsx`;
        XLSX.writeFile(wb, fileName);
        setToast({ message: "Arquivo Excel baixado com sucesso!", type: 'success' });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setToast({ message: "Copiado!", type: 'success' });
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-6xl mx-auto p-6 sm:p-10">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/super-admin')} className="p-2 bg-white border rounded-full hover:bg-gray-100 transition shadow-sm">
                                <ArrowLeft size={20} className="text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                                    <Monitor className="text-blue-600" /> Google Ads Generator
                                </h1>
                                <p className="text-gray-500 mt-1">Crie campanhas otimizadas com todas as funcionalidades reais do DentiHub.</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                            {campaignData && (
                                <button 
                                    onClick={handleExportExcel}
                                    className="bg-green-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-700 transition flex items-center gap-2 shadow-sm"
                                    title="Baixar planilha para upload no Google Ads"
                                >
                                    <FileSpreadsheet size={20} /> <span className="hidden sm:inline">Exportar Excel</span>
                                </button>
                            )}
                            
                            <button 
                                onClick={handleGenerate} 
                                disabled={loading}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 flex-1 sm:flex-none justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                                {loading ? 'Consultando IA...' : 'Gerar Nova Campanha'}
                            </button>
                        </div>
                    </div>

                    {!campaignData && !loading && (
                        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Megaphone className="text-blue-500" size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-3">Pronto para anunciar?</h3>
                            <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
                                Clique no botão acima. A IA vai analisar todas as features do DentiHub (Prontuário IA, Agenda, Financeiro) e criar uma estrutura completa de campanha para o Google Ads.
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="space-y-6 animate-pulse">
                            <div className="h-48 bg-white rounded-2xl"></div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="h-96 bg-white rounded-2xl"></div>
                                <div className="h-96 bg-white rounded-2xl"></div>
                            </div>
                        </div>
                    )}

                    {campaignData && (
                        <div className="space-y-8 animate-fade-in-up pb-20">
                            
                            {/* 1. Configurações Gerais */}
                            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                    <Target className="text-gray-500" size={20} />
                                    <h2 className="font-bold text-gray-800">Objetivo e Configurações</h2>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Nome da Campanha</label>
                                        <div className="flex gap-2">
                                            <code className="bg-gray-100 px-3 py-2 rounded border border-gray-300 text-sm flex-1 font-mono text-gray-800">{campaignData.campaign_name}</code>
                                            <button onClick={() => copyToClipboard(campaignData.campaign_name)} className="p-2 hover:bg-gray-100 rounded text-gray-500"><Copy size={16}/></button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Objetivo</label>
                                        <div className="font-bold text-gray-800 text-sm">{campaignData.objective}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Estratégia de Lances</label>
                                        <div className="font-bold text-gray-800 text-sm">{campaignData.bidding_strategy}</div>
                                    </div>
                                </div>
                            </section>

                            {/* 2. Palavras-Chave */}
                            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <List className="text-gray-500" size={20} />
                                        <h2 className="font-bold text-gray-800">Palavras-Chave</h2>
                                    </div>
                                    <button onClick={() => copyToClipboard(campaignData.keywords.join('\n'))} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition flex items-center gap-1"><Copy size={14}/> Copiar Lista</button>
                                </div>
                                <div className="p-6">
                                    <div className="flex flex-wrap gap-2">
                                        {campaignData.keywords.map((kw: string, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm border border-gray-200 font-medium">{kw}</span>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* 3. Anúncios (Headlines & Descriptions) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Type className="text-gray-500" size={20} />
                                            <h2 className="font-bold text-gray-800">Títulos (Headlines)</h2>
                                        </div>
                                        <button onClick={() => copyToClipboard(campaignData.ads.headlines.join('\n'))} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition"><Copy size={14}/></button>
                                    </div>
                                    <div className="p-6 flex-1 bg-gray-50/50">
                                        <ul className="space-y-2">
                                            {campaignData.ads.headlines.map((h: string, i: number) => (
                                                <li key={i} className="flex justify-between items-center bg-white p-3 rounded border border-gray-200 shadow-sm">
                                                    <span className="text-sm text-gray-800 font-medium">{h}</span>
                                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${h.length > 30 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{h.length}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </section>

                                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Layout className="text-gray-500" size={20} />
                                            <h2 className="font-bold text-gray-800">Descrições</h2>
                                        </div>
                                        <button onClick={() => copyToClipboard(campaignData.ads.descriptions.join('\n'))} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition"><Copy size={14}/></button>
                                    </div>
                                    <div className="p-6 flex-1 bg-gray-50/50">
                                        <ul className="space-y-3">
                                            {campaignData.ads.descriptions.map((d: string, i: number) => (
                                                <li key={i} className="flex flex-col bg-white p-3 rounded border border-gray-200 shadow-sm">
                                                    <span className="text-sm text-gray-800 leading-relaxed">{d}</span>
                                                    <span className={`text-[10px] font-mono text-right mt-2 ${d.length > 90 ? 'text-red-600' : 'text-gray-400'}`}>{d.length} / 90</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </section>
                            </div>

                            {/* 4. Sitelinks, Callouts & Images */}
                            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                    <MousePointer className="text-gray-500" size={20} />
                                    <h2 className="font-bold text-gray-800">Recursos (Assets)</h2>
                                </div>
                                <div className="p-6">
                                    <h3 className="font-bold text-gray-700 text-sm mb-3">Sitelinks</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                        {campaignData.sitelinks.map((sl: any, i: number) => (
                                            <div key={i} className="border border-gray-200 bg-gray-50 rounded-lg p-3 hover:border-blue-300 transition">
                                                <div className="font-bold text-blue-600 text-sm mb-1">{sl.text}</div>
                                                <div className="text-xs text-gray-500 leading-tight">{sl.description}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h3 className="font-bold text-gray-700 text-sm mb-3">Frases de Destaque (Callouts)</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {campaignData.callouts.map((c: string, i: number) => (
                                                    <span key={i} className="px-3 py-1.5 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-xs font-bold">{c}</span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2"><ImageIcon size={16}/> Sugestões de Imagens</h3>
                                            <ul className="space-y-2">
                                                {campaignData.image_suggestions?.map((img: string, i: number) => (
                                                    <li key={i} className="text-sm text-gray-600 flex items-start">
                                                        <CheckCircle size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0"/>
                                                        {img}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </section>

                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SuperAdminAds;
