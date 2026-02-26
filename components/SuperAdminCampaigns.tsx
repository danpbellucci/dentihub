
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Send, Sparkles, User, Users, 
  Eye, Code, Loader2, CheckCircle, AlertTriangle, MessageSquare, X, Mail,
  Timer, UserX, Clock, PenTool, Facebook, Instagram, Share2, Globe, Upload,
  Users2, Target, Info, Check, Filter,
  Activity, BarChart3, CreditCard, Tag, Menu
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
    const [publishing, setPublishing] = useState(false);
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // --- TARGETING MODAL STATE ---
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<string>('');
    const [manualEmails, setManualEmails] = useState<string>('');
    const [targetedRecipients, setTargetedRecipients] = useState<any[]>([]);
    const [loadingTargets, setLoadingTargets] = useState(false);

    // --- MARKETING AGENT STATE ---
    const [contentType, setContentType] = useState<'email' | 'blog_post' | 'social_media' | 'meta_ads'>('email');
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', text: 'Olá! Sou sua IA de Marketing. O que vamos criar hoje? Escolha o tipo de conteúdo acima e me dê o tema.' }
    ]);
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Busca destinatários quando o segmento muda
    useEffect(() => {
        if (selectedSegment) {
            fetchTargetRecipients();
        } else {
            setTargetedRecipients([]);
        }
    }, [selectedSegment]);

    const fetchTargetRecipients = async () => {
        if (!selectedSegment) return;
        setLoadingTargets(true);
        try {
            const { data, error } = await supabase.rpc('get_clinics_by_segment', { p_segment: selectedSegment });
            if (error) throw error;
            setTargetedRecipients(data || []);
        } catch (err) {
            console.error(err);
            setToast({ message: "Erro ao buscar público.", type: 'error' });
        } finally {
            setLoadingTargets(false);
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

    const handlePublishBlogPost = async () => {
        if (!generatedContent || contentType !== 'blog_post') return;
        
        setPublishing(true);
        try {
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
                image_url: null, 
                author_name: 'Equipe DentiHub',
                created_at: new Date().toISOString()
            });

            if (error) throw error;

            setToast({ message: "Artigo publicado com sucesso! Veja em /blog", type: 'success' });
            setMessages(prev => [...prev, { role: 'ai', text: `✅ Artigo "${generatedContent.title}" publicado no blog com sucesso!` }]);

        } catch (err: any) {
            console.error(err);
            setToast({ message: "Erro ao publicar: " + err.message, type: 'error' });
        } finally {
            setPublishing(false);
        }
    };

    const handleBatchSendEmail = async () => {
        if (!generatedContent || contentType !== 'email') return;

        // Combinar e-mails da segmentação com e-mails manuais
        let finalRecipients = [...targetedRecipients.map(r => ({ email: r.email, name: r.name }))];
        
        if (manualEmails.trim()) {
            const manualList = manualEmails.split(',').map(e => e.trim()).filter(e => e.includes('@'));
            manualList.forEach(email => {
                if (!finalRecipients.some(r => r.email === email)) {
                    finalRecipients.push({ email, name: 'Usuário' });
                }
            });
        }

        if (finalRecipients.length === 0) {
            setToast({ message: "Selecione um público ou insira e-mails manualmente.", type: 'warning' });
            return;
        }

        setSending(true);
        try {
            const { data, error } = await supabase.functions.invoke('send-emails', {
                body: {
                    type: 'marketing_campaign',
                    recipients: finalRecipients,
                    subject: generatedContent.subject,
                    htmlContent: generatedContent.html_content
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            setToast({ message: `E-mail enviado para ${data.results?.count || finalRecipients.length} destinatários!`, type: 'success' });
            setShowTargetModal(false);
            setMessages(prev => [...prev, { role: 'ai', text: `✉️ Campanha enviada com sucesso para ${finalRecipients.length} destinatários.` }]);

        } catch (err: any) {
            console.error(err);
            setToast({ message: "Erro ao enviar: " + err.message, type: 'error' });
        } finally {
            setSending(false);
        }
    };

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
                        <button className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all bg-primary text-white shadow-lg shadow-blue-900/20"><Sparkles size={18} className="mr-3"/> Marketing Studio</button>
                        <button onClick={() => navigate('/super-admin/leads')} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"><Users size={18} className="mr-3"/> Gestão de Leads</button>
                        <button onClick={() => navigate('/super-admin/subscriptions')} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"><CreditCard size={18} className="mr-3"/> Assinaturas</button>
                        <button onClick={() => navigate('/super-admin/plans')} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"><Tag size={18} className="mr-3"/> Preços e Planos</button>
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
                                <Sparkles className="text-blue-600"/> Marketing Studio
                            </h1>
                            <p className="text-sm text-gray-500">Crie conteúdo e dispare para sua base de leads e clientes.</p>
                        </div>
                    </div>

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
                                    <button onClick={handleSendMessage} disabled={loading || !chatInput.trim()} className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition shadow-sm"><Send size={18} /></button>
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
                                    
                                    {contentType === 'email' && generatedContent && (
                                        <button 
                                            onClick={() => setShowTargetModal(true)}
                                            className="text-xs bg-purple-600 text-white px-4 py-1.5 rounded-md font-bold hover:bg-purple-700 transition flex items-center gap-2 shadow-sm"
                                        >
                                            <Users2 size={14}/> Disparar E-mail
                                        </button>
                                    )}

                                    {contentType === 'blog_post' && generatedContent && (
                                        <button 
                                            onClick={handlePublishBlogPost}
                                            disabled={publishing}
                                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50 shadow-sm"
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
                                            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                                <div className="bg-gray-100 px-4 py-2 text-sm border-b border-gray-200 font-bold text-gray-700">Assunto: {generatedContent.subject}</div>
                                                <div className="p-6 bg-white" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedContent.html_content) }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- TARGET SELECTION MODAL --- */}
                {showTargetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Target className="text-purple-600" />
                                <h3 className="font-bold text-lg text-gray-800">Público da Campanha</h3>
                            </div>
                            <button onClick={() => setShowTargetModal(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                            {/* Segment Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Segmentação Inteligente</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setSelectedSegment('incomplete_profile')}
                                        className={`flex flex-col p-3 rounded-xl border text-left transition ${selectedSegment === 'incomplete_profile' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <span className="font-bold text-sm text-gray-800 flex items-center justify-between">
                                            Cadastro Incompleto
                                            {selectedSegment === 'incomplete_profile' && <CheckCircle size={14} className="text-purple-500"/>}
                                        </span>
                                        <span className="text-[10px] text-gray-500 mt-1">Clínicas sem endereço ou cidade definidos.</span>
                                    </button>

                                    <button 
                                        onClick={() => setSelectedSegment('no_dentists')}
                                        className={`flex flex-col p-3 rounded-xl border text-left transition ${selectedSegment === 'no_dentists' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <span className="font-bold text-sm text-gray-800 flex items-center justify-between">
                                            Sem Dentistas
                                            {selectedSegment === 'no_dentists' && <CheckCircle size={14} className="text-purple-500"/>}
                                        </span>
                                        <span className="text-[10px] text-gray-500 mt-1">Contas que ainda não cadastraram profissionais.</span>
                                    </button>

                                    <button 
                                        onClick={() => setSelectedSegment('no_appointments')}
                                        className={`flex flex-col p-3 rounded-xl border text-left transition ${selectedSegment === 'no_appointments' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <span className="font-bold text-sm text-gray-800 flex items-center justify-between">
                                            Agenda Vazia
                                            {selectedSegment === 'no_appointments' && <CheckCircle size={14} className="text-purple-500"/>}
                                        </span>
                                        <span className="text-[10px] text-gray-500 mt-1">Clínicas com zero agendamentos registrados.</span>
                                    </button>

                                    <button 
                                        onClick={() => setSelectedSegment('all_admins')}
                                        className={`flex flex-col p-3 rounded-xl border text-left transition ${selectedSegment === 'all_admins' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <span className="font-bold text-sm text-gray-800 flex items-center justify-between">
                                            Todos os Admins
                                            {selectedSegment === 'all_admins' && <CheckCircle size={14} className="text-purple-500"/>}
                                        </span>
                                        <span className="text-[10px] text-gray-500 mt-1">Disparo para toda a base de proprietários.</span>
                                    </button>
                                </div>
                            </div>

                            {/* Manual Entry */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">E-mails Específicos (Opcional)</label>
                                <textarea 
                                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none h-20 resize-none placeholder-gray-400"
                                    placeholder="Ex: joao@email.com, maria@email.com"
                                    value={manualEmails}
                                    onChange={(e) => setManualEmails(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">Separe os e-mails por vírgula.</p>
                            </div>

                            {/* Preview List */}
                            {selectedSegment && (
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                                            <Info size={14}/> Destinatários Detectados ({targetedRecipients.length})
                                        </h4>
                                        {loadingTargets && <Loader2 size={14} className="animate-spin text-purple-600"/>}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                        {targetedRecipients.length > 0 ? targetedRecipients.map((r, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-200 last:border-0">
                                                <span className="font-bold text-gray-700">{r.name}</span>
                                                <span className="text-gray-500 font-mono">{r.email}</span>
                                            </div>
                                        )) : !loadingTargets && (
                                            <p className="text-center text-xs text-gray-400 py-4 italic">Nenhum usuário encontrado neste segmento.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t bg-gray-50 flex justify-between items-center gap-4">
                             <div className="text-xs text-gray-500">
                                {targetedRecipients.length > 0 && <span className="font-bold text-purple-600">{targetedRecipients.length} e-mails</span>}
                                {targetedRecipients.length > 0 && manualEmails && <span> + </span>}
                                {manualEmails.split(',').filter(e => e.includes('@')).length > 0 && <span className="font-bold text-purple-600">{manualEmails.split(',').filter(e => e.includes('@')).length} manuais</span>}
                             </div>
                             <div className="flex gap-3">
                                <button onClick={() => setShowTargetModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
                                <button 
                                    onClick={handleBatchSendEmail}
                                    disabled={sending || (targetedRecipients.length === 0 && !manualEmails.trim())}
                                    className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    {sending ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                                    {sending ? 'Disparando...' : 'Confirmar e Enviar'}
                                </button>
                             </div>
                        </div>
                    </div>
                </div>
            )}
            </main>
        </div>
    );
};

export default SuperAdminCampaigns;
