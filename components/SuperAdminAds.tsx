
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Monitor, Target, MousePointer, Type, List, Layout, 
  Sparkles, Loader2, Copy, Megaphone, Image as ImageIcon, CheckCircle, Download, FileSpreadsheet,
  Ban, Star, Box, AlertCircle
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
                    prompt: 'Crie uma campanha de Pesquisa Google Ads completa para o DentiHub. FOCO: Dentistas que buscam inovação e automação. \n\nREQUISITOS OBRIGATÓRIOS:\n- Gere pelo menos 15 palavras-chave de alta intenção.\n- Gere pelo menos 10 palavras-chave negativas (ex: crack, pirata, gratis).\n- Sugira pelo menos 10 Títulos (headlines) persuasivos.\n- Sugira pelo menos 4 Descrições fortes.' 
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);
            
            setCampaignData(data);
            setToast({ message: "Campanha completa gerada!", type: 'success' });

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

        // --- ABA 1: KW e Anúncios ---
        const mainData: any[] = [];
        const adRow: any = {
            'Campaign': campaignName,
            'Ad Group': adGroupName,
            'Final URL': finalUrl,
            'Ad type': 'Responsive search ad'
        };

        (campaignData.ads?.headlines || []).forEach((h: string, i: number) => {
            adRow[`Headline ${i + 1}`] = h;
        });

        (campaignData.ads?.descriptions || []).forEach((d: string, i: number) => {
            adRow[`Description ${i + 1}`] = d;
        });

        mainData.push(adRow);

        (campaignData.keywords || []).forEach((kw: string) => {
            mainData.push({
                'Campaign': campaignName,
                'Ad Group': adGroupName,
                'Keyword': kw,
                'Criterion Type': 'Phrase',
                'Final URL': finalUrl
            });
        });

        const wsMain = XLSX.utils.json_to_sheet(mainData);
        XLSX.utils.book_append_sheet(wb, wsMain, "Anuncios_e_KWs");

        // --- ABA 2: Palavras-Chave Negativas ---
        const negData = (campaignData.negative_keywords || []).map((nkw: string) => ({
            'Campaign': campaignName,
            'Keyword': nkw,
            'Criterion Type': 'Negative Broad'
        }));
        const wsNeg = XLSX.utils.json_to_sheet(negData);
        XLSX.utils.book_append_sheet(wb, wsNeg, "KWs_Negativas");

        // --- ABA 3: Extensões ---
        const extData: any[] = [];
        (campaignData.sitelinks || []).forEach((sl: any) => {
            extData.push({
                'Campaign': campaignName,
                'Placeholder Type': 'Sitelink',
                'Link Text': sl.text,
                'Description 1': sl.description,
                'Final URL': finalUrl
            });
        });

        (campaignData.callouts || []).forEach((c: string) => {
            extData.push({
                'Campaign': campaignName,
                'Placeholder Type': 'Callout',
                'Callout Text': c
            });
        });

        const wsExt = XLSX.utils.json_to_sheet(extData);
        XLSX.utils.book_append_sheet(wb, wsExt, "Extensoes");

        const fileName = `${campaignName.replace(/\s+/g, '_')}_GoogleAds.xlsx`;
        XLSX.writeFile(wb, fileName);
        setToast({ message: "Planilha exportada com sucesso!", type: 'success' });
    };

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setToast({ message: "Copiado!", type: 'success' });
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-6xl mx-auto p-6 sm:p-10">
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/super-admin')} className="p-2 bg-white border rounded-full hover:bg-gray-100 transition shadow-sm">
                                <ArrowLeft size={20} className="text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                                    <Monitor className="text-blue-600" /> Google Ads Generator
                                </h1>
                                <p className="text-gray-500 mt-1">IA treinada especificamente para o mercado odontológico e DentiHub.</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                            {campaignData && (
                                <button 
                                    onClick={handleExportExcel}
                                    className="bg-green-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-700 transition flex items-center gap-2 shadow-sm"
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
                                {loading ? 'Otimizando Conteúdo...' : 'Gerar Campanha'}
                            </button>
                        </div>
                    </div>

                    {!campaignData && !loading && (
                        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <Megaphone className="text-blue-200 mx-auto mb-6" size={80} />
                            <h3 className="text-2xl font-bold text-gray-800 mb-3">Acelere seu Tráfego Pago</h3>
                            <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
                                Clique no botão acima para gerar uma estrutura profissional de Google Ads, focada em converter dentistas donos de clínicas.
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="space-y-6 animate-pulse">
                            <div className="h-24 bg-white rounded-2xl border"></div>
                            <div className="grid grid-cols-2 gap-6"><div className="h-64 bg-white rounded-2xl border"></div><div className="h-64 bg-white rounded-2xl border"></div></div>
                        </div>
                    )}

                    {campaignData && (
                        <div className="space-y-8 animate-fade-in-up pb-20">
                            
                            {/* 1. Produto e Diferenciais */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                                    <div className="flex items-center gap-2 mb-3 text-blue-600">
                                        <Box size={20}/>
                                        <h3 className="font-bold uppercase text-xs tracking-wider">Produto / Serviço Sugerido</h3>
                                    </div>
                                    <p className="text-gray-800 font-medium text-lg leading-relaxed">{campaignData.product_service || 'Sistema de Gestão Odontológica Completo'}</p>
                                </section>
                                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                                    <div className="flex items-center gap-2 mb-3 text-yellow-600">
                                        <Star size={20}/>
                                        <h3 className="font-bold uppercase text-xs tracking-wider">O que nos torna únicos (USP)</h3>
                                    </div>
                                    <p className="text-gray-800 font-medium text-lg leading-relaxed">{campaignData.unique_selling_proposition || 'Prontuário com IA Generativa e Gestão Automatizada sem papel.'}</p>
                                </section>
                            </div>

                            {/* 2. Configurações */}
                            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                                    <Target className="text-gray-500" size={18} />
                                    <h2 className="font-bold text-gray-800 text-sm uppercase">Configurações da Campanha</h2>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nome da Campanha</label>
                                        <div className="font-bold text-gray-900">{campaignData.campaign_name}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Objetivo Google</label>
                                        <div className="font-bold text-gray-900">{campaignData.objective || 'Leads'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Estratégia</label>
                                        <div className="font-bold text-gray-900">{campaignData.bidding_strategy || 'Maximizar Conversões'}</div>
                                    </div>
                                </div>
                            </section>

                            {/* 3. Palavras-Chave (Positivas e Negativas) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <List className="text-green-600" size={18} />
                                            <h2 className="font-bold text-gray-800 text-sm uppercase">Palavras-Chave (+ Intent)</h2>
                                        </div>
                                        <button onClick={() => copyToClipboard(campaignData.keywords?.join('\n'))} className="text-xs font-bold text-blue-600 hover:underline"><Copy size={14} className="inline mr-1"/> Copiar</button>
                                    </div>
                                    <div className="p-6 bg-green-50/10 flex-1">
                                        <div className="flex flex-wrap gap-2">
                                            {(campaignData.keywords || []).length > 0 ? (campaignData.keywords || []).map((kw: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-white text-green-800 rounded-md text-xs border border-green-200 font-medium">{kw}</span>
                                            )) : <span className="text-gray-400 italic text-sm">Gerando...</span>}
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Ban className="text-red-600" size={18} />
                                            <h2 className="font-bold text-gray-800 text-sm uppercase">Keywords Negativas</h2>
                                        </div>
                                        <button onClick={() => copyToClipboard(campaignData.negative_keywords?.join('\n'))} className="text-xs font-bold text-red-600 hover:underline"><Copy size={14} className="inline mr-1"/> Copiar</button>
                                    </div>
                                    <div className="p-6 bg-red-50/10 flex-1">
                                        <div className="flex flex-wrap gap-2">
                                            {(campaignData.negative_keywords || []).length > 0 ? (campaignData.negative_keywords || []).map((kw: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-white text-red-700 rounded-md text-xs border border-red-200 font-medium line-through decoration-red-400">{kw}</span>
                                            )) : <span className="text-gray-400 italic text-sm">Gerando...</span>}
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* 4. Anúncios */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Type className="text-gray-500" size={18} />
                                            <h2 className="font-bold text-gray-800 text-sm uppercase">Títulos (RSA Headlines)</h2>
                                        </div>
                                        <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded font-bold">MÁX 30 CHARS</span>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {(campaignData.ads?.headlines || []).length > 0 ? (campaignData.ads.headlines).map((h: string, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-200 group">
                                                <span className="text-sm font-medium text-gray-700 truncate mr-2">{h}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`text-[10px] font-mono px-1 rounded ${h.length > 30 ? 'bg-red-100 text-red-600' : 'bg-white text-gray-400'}`}>{h.length}</span>
                                                    <button onClick={() => copyToClipboard(h)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition"><Copy size={12}/></button>
                                                </div>
                                            </div>
                                        )) : <p className="text-center py-4 text-gray-400 italic text-sm">Nenhum título gerado.</p>}
                                    </div>
                                </section>

                                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Layout className="text-gray-500" size={18} />
                                            <h2 className="font-bold text-gray-800 text-sm uppercase">Descrições (RSA)</h2>
                                        </div>
                                        <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded font-bold">MÁX 90 CHARS</span>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {(campaignData.ads?.descriptions || []).length > 0 ? (campaignData.ads.descriptions).map((d: string, i: number) => (
                                            <div key={i} className="flex flex-col bg-gray-50 p-3 rounded border border-gray-200 group">
                                                <p className="text-sm text-gray-800 leading-relaxed mb-1">{d}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-[10px] font-mono ${d.length > 90 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>{d.length} / 90</span>
                                                    <button onClick={() => copyToClipboard(d)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition"><Copy size={12}/></button>
                                                </div>
                                            </div>
                                        )) : <p className="text-center py-4 text-gray-400 italic text-sm">Nenhuma descrição gerada.</p>}
                                    </div>
                                </section>
                            </div>

                            {/* 5. Assets Adicionais */}
                            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                                    <MousePointer className="text-gray-500" size={18} />
                                    <h2 className="font-bold text-gray-800 text-sm uppercase">Recursos (Sitelinks & Callouts)</h2>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h3 className="font-bold text-gray-700 text-sm mb-4">Sitelinks Sugeridos</h3>
                                            <div className="space-y-3">
                                                {(campaignData.sitelinks || []).map((sl: any, i: number) => (
                                                    <div key={i} className="p-3 border border-gray-100 bg-gray-50 rounded-lg">
                                                        <div className="text-blue-600 font-bold text-sm">{sl.text}</div>
                                                        <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{sl.description}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-700 text-sm mb-4">Callouts (Frases de Destaque)</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {(campaignData.callouts || []).map((c: string, i: number) => (
                                                    <span key={i} className="px-3 py-1.5 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-xs font-bold">{c}</span>
                                                ))}
                                            </div>
                                            
                                            <h3 className="font-bold text-gray-700 text-sm mt-8 mb-4 flex items-center gap-2"><ImageIcon size={16}/> Ideias para Criativos Visuais</h3>
                                            <ul className="space-y-2">
                                                {(campaignData.image_suggestions || []).map((img: string, i: number) => (
                                                    <li key={i} className="text-xs text-gray-600 flex items-start">
                                                        <CheckCircle size={14} className="text-green-500 mt-0.5 mr-2 shrink-0"/>
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
