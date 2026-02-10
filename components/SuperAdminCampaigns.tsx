
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Send, Sparkles, User, Users, 
  Eye, Code, Loader2, CheckCircle, AlertTriangle, MessageSquare, X, Mail,
  CalendarClock, Timer, UserX, Clock, PenTool, Facebook, Instagram, Share2, Globe, Upload
} from 'lucide-react';
import Toast, { ToastType } from './Toast';
import DOMPurify from 'dompurify';
import { format, parseISO, isToday } from 'date-fns';

interface Message {
    role: 'user' | 'ai';
    text: string;
}

interface CampaignForecast {
    clinic_name: string;
    user_email: string;
    campaign_type: string;
    scheduled_for: string;
    status: 'Pending' | 'Sent' | 'Ineligible' | 'Missed' | 'Blocked';
    reason?: string;
}

const SuperAdminCampaigns: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false); // Novo estado
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [activeTab, setActiveTab] = useState<'marketing_agent' | 'system_status'>('marketing_agent');

    // --- SYSTEM STATUS STATE ---
    const [forecast, setForecast] = useState<CampaignForecast[]>([]);
    const [loadingForecast, setLoadingForecast] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('Pending');

    // --- MARKETING AGENT STATE ---
    const [contentType, setContentType] = useState<'email' | 'blog_post' | 'social_media' | 'meta_ads'>('email');
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', text: 'Olá! Sou sua IA de Marketing. O que vamos criar hoje? Escolha o tipo de conteúdo acima e me dê o tema.' }
    ]);
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (activeTab === 'system_status') {
            fetchForecast();
        }
    }, [activeTab]);

    const fetchForecast = async () => {
        setLoadingForecast(true);
        try {
            const { data, error } = await supabase.rpc('get_campaign_forecast');
            if (error) throw error;
            setForecast(data || []);
        } catch (err: any) {
            console.error(err);
            setToast({ message: "Erro ao carregar previsão: " + err.message, type: 'error' });
        } finally {
            setLoadingForecast(false);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        
        const userMsg = chatInput;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        setLoading(true);
        setGeneratedContent(null);

        try {
            const { data, error } = await supabase.functions.invoke('generate-campaign-content', {
                body: { 
                    prompt: userMsg,
                    taskType: contentType, 
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);
            
            if (data) {
                setGeneratedContent(data);
                const aiResponseText = "Conteúdo gerado com sucesso! Veja o resultado ao lado.";
                setMessages(prev => [...prev, { role: 'ai', text: aiResponseText }]);
            }

        } catch (err: any) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'ai', text: 'Desculpe, tive um problema ao gerar o conteúdo. Tente novamente.' }]);
        } finally {
            setLoading(false);
        }
    };

    // Nova função para publicar no Blog
    const handlePublishBlogPost = async () => {
        if (!generatedContent || contentType !== 'blog_post') return;
        
        setPublishing(true);
        try {
            // Verifica se o slug já existe e adiciona sufixo se necessário
            let slug = generatedContent.slug;
            const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
            if (existing) {
                slug = `${slug}-${Date.now()}`;
            }

            const { error } = await supabase.from('blog_posts').insert({
                title: generatedContent.title,
                slug: slug,
                excerpt: generatedContent.excerpt,
                content: generatedContent.content_html,
                // Opcional: Se a IA gerar URL de imagem no futuro, mapear aqui. Por enquanto vai null ou placeholder.
                image_url: null, 
                author_name: 'Equipe DentiHub',
                created_at: new Date().toISOString()
            });

            if (error) throw error;

            setToast({ message: "Artigo publicado com sucesso! Veja em /blog", type: 'success' });
            
            // Adiciona mensagem no chat confirmando
            setMessages(prev => [...prev, { role: 'ai', text: `✅ Artigo "${generatedContent.title}" publicado no blog com sucesso!` }]);

        } catch (err: any) {
            console.error(err);
            setToast({ message: "Erro ao publicar: " + err.message, type: 'error' });
        } finally {
            setPublishing(false);
        }
    };

    const getStatusBadge = (status: string, date: string) => {
        const isTodayDate = isToday(parseISO(date));
        
        switch (status) {
            case 'Pending':
                if (isTodayDate) return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit"><Clock size={12} className="mr-1"/> Envia Hoje</span>;
                return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit"><Timer size={12} className="mr-1"/> Agendado</span>;
            case 'Sent': return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit"><CheckCircle size={12} className="mr-1"/> Enviado</span>;
            default: return <span className="bg-gray-200 text-gray-500 px-2 py-1 rounded-full text-xs font-bold">{status}</span>;
        }
    };

    const filteredForecast = forecast.filter(item => {
        if (filterStatus === 'All') return true;
        return item.status === filterStatus;
    });

    return (
        <div className="p-6 bg-gray-50 min-h-screen h-screen flex flex-col overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/super-admin')} className="p-2 bg-white border rounded-full hover:bg-gray-100 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Sparkles className="text-purple-600" /> Marketing Studio
                        </h1>
                        <p className="text-sm text-gray-500">Crie conteúdo para Blog, Redes Sociais e E-mail.</p>
                    </div>
                </div>
                
                <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                    <button onClick={() => setActiveTab('marketing_agent')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'marketing_agent' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}>Estúdio IA</button>
                    <button onClick={() => setActiveTab('system_status')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'system_status' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>Automação</button>
                </div>
            </div>

            {/* --- TAB 1: MARKETING AGENT --- */}
            {activeTab === 'marketing_agent' && (
                <div className="flex flex-1 gap-6 overflow-hidden animate-fade-in">
                    {/* Left Panel: Chat & Settings */}
                    <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                        <div className="p-4 border-b bg-gray-50">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Tipo de Conteúdo</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setContentType('email')} className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-bold border ${contentType === 'email' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white border-gray-200 text-gray-600'}`}><Mail size={14}/> E-mail Marketing</button>
                                <button onClick={() => setContentType('blog_post')} className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-bold border ${contentType === 'blog_post' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white border-gray-200 text-gray-600'}`}><PenTool size={14}/> Blog Post</button>
                                <button onClick={() => setContentType('social_media')} className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-bold border ${contentType === 'social_media' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white border-gray-200 text-gray-600'}`}><Instagram size={14}/> Social Media</button>
                                <button onClick={() => setContentType('meta_ads')} className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-bold border ${contentType === 'meta_ads' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white border-gray-200 text-gray-600'}`}><Facebook size={14}/> Meta Ads</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-gray-100 text-gray-800 rounded-tr-none' : 'bg-purple-50 text-purple-900 rounded-tl-none border border-purple-100'}`}>
                                        {msg.role === 'ai' && <Sparkles size={14} className="mb-1 text-purple-400 inline mr-2" />}
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {loading && <div className="flex justify-start"><div className="bg-purple-50 p-3 rounded-lg rounded-tl-none flex items-center gap-2 text-sm text-purple-800"><Loader2 className="animate-spin" size={16} /> Criando...</div></div>}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-4 border-t bg-gray-50">
                            <div className="flex gap-2">
                                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendMessage()} placeholder="Sobre o que é o conteúdo?" className="flex-1 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" disabled={loading}/>
                                <button onClick={handleSendMessage} disabled={loading || !chatInput.trim()} className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"><Send size={18} /></button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Result Display */}
                    <div className="w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Resultado Gerado</h3>
                            <div className="flex items-center gap-3">
                                {generatedContent && (
                                    <button className="text-xs text-gray-500 hover:text-gray-900 font-bold flex items-center gap-1" onClick={() => {navigator.clipboard.writeText(JSON.stringify(generatedContent, null, 2)); setToast({message: 'JSON Copiado', type:'success'})}}>
                                        <Code size={14}/> JSON
                                    </button>
                                )}
                                {contentType === 'blog_post' && generatedContent && (
                                    <button 
                                        onClick={handlePublishBlogPost}
                                        disabled={publishing}
                                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {publishing ? <Loader2 size={14} className="animate-spin"/> : <Globe size={14}/>}
                                        Aprovar e Publicar
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {!generatedContent ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Sparkles size={48} className="mb-4 opacity-20"/>
                                    <p>O conteúdo gerado pela IA aparecerá aqui.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* RENDERIZAÇÃO DINÂMICA BASEADA NO TIPO */}
                                    
                                    {/* BLOG POST */}
                                    {contentType === 'blog_post' && (
                                        <div className="prose max-w-none">
                                            <h1 className="text-2xl font-bold text-gray-900">{generatedContent.title}</h1>
                                            <div className="text-sm text-gray-500 mb-4 font-mono">Slug: {generatedContent.slug}</div>
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6 text-sm text-blue-800">
                                                <strong>Prompt Imagem:</strong> {generatedContent.image_prompt}
                                            </div>
                                            <div dangerouslySetInnerHTML={{ __html: generatedContent.content_html }} className="text-gray-700 space-y-4" />
                                        </div>
                                    )}

                                    {/* SOCIAL MEDIA */}
                                    {contentType === 'social_media' && (
                                        <div className="flex flex-col gap-6">
                                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm max-w-md mx-auto w-full">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                                    <div className="font-bold text-sm">DentiHub</div>
                                                </div>
                                                <div className="bg-gray-100 aspect-square rounded-lg flex items-center justify-center mb-3 text-gray-400 text-center p-4">
                                                    <p className="text-xs">Ideia Visual: {generatedContent.image_idea}</p>
                                                </div>
                                                <div className="text-sm whitespace-pre-wrap">{generatedContent.caption}</div>
                                                <div className="text-blue-600 text-sm mt-2">{generatedContent.hashtags}</div>
                                            </div>
                                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                                                <strong>Roteiro Stories:</strong> {generatedContent.story_script}
                                            </div>
                                        </div>
                                    )}

                                    {/* META ADS */}
                                    {contentType === 'meta_ads' && (
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm max-w-md mx-auto w-full">
                                            <div className="text-xs text-gray-500 mb-2">Patrocinado</div>
                                            <div className="text-sm mb-3 whitespace-pre-wrap">{generatedContent.primary_text}</div>
                                            <div className="bg-gray-200 aspect-video rounded flex items-center justify-center mb-3 text-gray-500 text-center p-4 text-xs">
                                                Ideia Criativo: {generatedContent.creative_ideas?.[0]}
                                            </div>
                                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                                                <div>
                                                    <div className="font-bold text-sm">{generatedContent.headline}</div>
                                                    <div className="text-xs text-gray-500">{generatedContent.description}</div>
                                                </div>
                                                <button className="bg-gray-300 px-3 py-1.5 rounded text-xs font-bold text-gray-700">{generatedContent.call_to_action}</button>
                                            </div>
                                            <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600 border border-gray-200">
                                                <strong>Interesses Sugeridos:</strong> {generatedContent.audience_interests}
                                            </div>
                                        </div>
                                    )}

                                    {/* EMAIL */}
                                    {contentType === 'email' && (
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="bg-gray-100 px-4 py-2 text-sm border-b border-gray-200 font-bold text-gray-700">Assunto: {generatedContent.subject}</div>
                                            <div className="p-6 bg-white" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedContent.html_content) }} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: SYSTEM STATUS (Mantido conforme original) --- */}
            {activeTab === 'system_status' && (
                <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CalendarClock size={20} className="text-blue-600"/> Previsão de Envios Automáticos</h3>
                            <p className="text-sm text-gray-500">Visualização de quando cada clínica receberá os e-mails do sistema.</p>
                        </div>
                        <div className="flex gap-2">
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="All">Todos Status</option>
                                <option value="Pending">Pendentes</option>
                                <option value="Sent">Enviados</option>
                            </select>
                            <button onClick={fetchForecast} className="p-2 bg-white border rounded-lg hover:bg-gray-100 text-gray-600 transition"><Loader2 size={18} className={loadingForecast ? "animate-spin" : ""}/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4">Data Prevista</th>
                                    <th className="px-6 py-4">Campanha</th>
                                    <th className="px-6 py-4">Clínica</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4">Motivo / Detalhes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loadingForecast ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Carregando previsão...</td></tr>
                                ) : filteredForecast.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                                ) : (
                                    filteredForecast.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                {format(parseISO(item.scheduled_for), "dd/MM/yyyy")}
                                                {isToday(parseISO(item.scheduled_for)) && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">HOJE</span>}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">{item.campaign_type}</td>
                                            <td className="px-6 py-4 font-bold text-gray-800">{item.clinic_name}</td>
                                            <td className="px-6 py-4 flex justify-center">{getStatusBadge(item.status, item.scheduled_for)}</td>
                                            <td className="px-6 py-4 text-xs text-gray-500">{item.reason || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminCampaigns;
