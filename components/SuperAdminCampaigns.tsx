
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Send, Sparkles, User, Users, 
  Eye, Code, Loader2, CheckCircle, AlertTriangle, MessageSquare, X, Mail
} from 'lucide-react';
import Toast, { ToastType } from './Toast';

interface Message {
    role: 'user' | 'ai';
    text: string;
}

const SuperAdminCampaigns: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Configuração da Campanha
    const [targetRoles, setTargetRoles] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

    // Estado do Modal de Confirmação
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingRecipients, setPendingRecipients] = useState<any[]>([]);
    const [preparingList, setPreparingList] = useState(false);

    // Chat IA
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', text: 'Olá! Sou sua assistente de marketing. O que vamos anunciar hoje? (Ex: "Crie um e-mail sobre novidades do sistema para dentistas")' }
    ]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const rolesOptions = [
        { value: 'administrator', label: 'Administradores (Donos)' },
        { value: 'dentist', label: 'Dentistas' },
        { value: 'employee', label: 'Funcionários' }
    ];

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        
        const userMsg = chatInput;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('generate-campaign-content', {
                body: { 
                    prompt: userMsg,
                    taskType: 'email_campaign_chat', // Tipo específico para este chat
                    currentContent: { subject, htmlContent }
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);
            
            if (data) {
                if (data.subject) setSubject(data.subject);
                if (data.html_content) setHtmlContent(data.html_content);
                
                const aiResponseText = data.rationale || "Conteúdo gerado com sucesso! Veja a prévia ao lado.";
                setMessages(prev => [...prev, { role: 'ai', text: aiResponseText }]);
            }

        } catch (err: any) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'ai', text: 'Desculpe, tive um problema ao gerar o conteúdo. Tente novamente.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handlePrepareSend = async () => {
        if (targetRoles.length === 0) {
            setToast({ message: "Selecione pelo menos um público-alvo.", type: 'warning' });
            return;
        }
        if (!subject || !htmlContent) {
            setToast({ message: "O conteúdo do e-mail não pode estar vazio.", type: 'warning' });
            return;
        }

        setPreparingList(true);
        try {
            const { data: users, error } = await supabase
                .from('user_profiles')
                .select('email')
                .in('role', targetRoles);

            if (error) throw error;

            if (!users || users.length === 0) {
                setToast({ message: "Nenhum usuário encontrado com os perfis selecionados.", type: 'warning' });
                return;
            }

            const uniqueEmails = [...new Set(users.map(u => u.email).filter(Boolean))];
            
            setPendingRecipients(uniqueEmails.map(email => ({ email }))); 
            setShowConfirmModal(true);

        } catch (err: any) {
            setToast({ message: "Erro ao preparar lista: " + err.message, type: 'error' });
        } finally {
            setPreparingList(false);
        }
    };

    const confirmSend = async () => {
        if (pendingRecipients.length === 0) return;
        setSending(true);
        
        try {
            const { data, error } = await supabase.functions.invoke('send-emails', {
                body: {
                    type: 'marketing_campaign',
                    recipients: pendingRecipients,
                    subject,
                    htmlContent 
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            setToast({ message: `Campanha enviada para ${data.results?.count || pendingRecipients.length} usuários!`, type: 'success' });
            setShowConfirmModal(false);
            setPendingRecipients([]);
            
            setMessages(prev => [...prev, { role: 'ai', text: 'Campanha enviada com sucesso! 🚀 Algo mais?' }]);

        } catch (err: any) {
            setToast({ message: "Erro no envio: " + err.message, type: 'error' });
        } finally {
            setSending(false);
        }
    };

    const toggleRole = (role: string) => {
        setTargetRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

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
                            <Sparkles className="text-purple-600" /> Marketing AI
                        </h1>
                        <p className="text-sm text-gray-500">Crie e dispare campanhas para a base de usuários.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                
                {/* Left Panel: Chat & Settings */}
                <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    
                    {/* Audience Selector */}
                    <div className="p-4 border-b bg-gray-50">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Público Alvo</label>
                        <div className="flex flex-wrap gap-2">
                            {rolesOptions.map(role => (
                                <button
                                    key={role.value}
                                    onClick={() => toggleRole(role.value)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                                        targetRoles.includes(role.value) 
                                        ? 'bg-purple-100 text-purple-700 border-purple-300 font-bold' 
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-purple-300'
                                    }`}
                                >
                                    {role.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-gray-100 text-gray-800 rounded-tr-none' 
                                    : 'bg-purple-50 text-purple-900 rounded-tl-none border border-purple-100'
                                }`}>
                                    {msg.role === 'ai' && <Sparkles size={14} className="mb-1 text-purple-400 inline mr-2" />}
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-purple-50 p-3 rounded-lg rounded-tl-none flex items-center gap-2 text-sm text-purple-800">
                                    <Loader2 className="animate-spin" size={16} /> Gerando conteúdo...
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 border-t bg-gray-50">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
                                placeholder="Descreva o e-mail..."
                                className="flex-1 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                disabled={loading}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={loading || !chatInput.trim()}
                                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Preview & Editor */}
                <div className="w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    {/* Editor Toolbar */}
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="flex-1 mr-4">
                            <input 
                                type="text" 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Assunto do E-mail"
                                className="w-full bg-transparent border-none text-lg font-bold text-gray-800 placeholder-gray-400 focus:ring-0 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-gray-200 rounded-lg p-1 mr-2">
                                <button 
                                    onClick={() => setViewMode('preview')}
                                    className={`p-1.5 rounded-md transition ${viewMode === 'preview' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                    title="Visualizar"
                                >
                                    <Eye size={16} />
                                </button>
                                <button 
                                    onClick={() => setViewMode('code')}
                                    className={`p-1.5 rounded-md transition ${viewMode === 'code' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                    title="Código HTML"
                                >
                                    <Code size={16} />
                                </button>
                            </div>
                            <button 
                                onClick={handlePrepareSend}
                                disabled={preparingList}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
                            >
                                {preparingList ? <Loader2 className="animate-spin" size={16}/> : <Mail size={16}/>}
                                Enviar
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative">
                        {viewMode === 'preview' ? (
                            <div className="w-full h-full overflow-y-auto bg-gray-100 p-8 flex justify-center">
                                <div 
                                    className="bg-white w-full max-w-[600px] shadow-lg min-h-[400px] p-0"
                                    dangerouslySetInnerHTML={{ __html: htmlContent || '<div style="padding:40px; text-align:center; color:#ccc;">O conteúdo do e-mail aparecerá aqui.</div>' }}
                                />
                            </div>
                        ) : (
                            <textarea 
                                className="w-full h-full p-4 font-mono text-sm text-gray-700 resize-none focus:outline-none"
                                value={htmlContent}
                                onChange={(e) => setHtmlContent(e.target.value)}
                                placeholder="<!-- HTML do e-mail -->"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Confirm Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex items-center gap-3 mb-4 text-amber-600">
                            <AlertTriangle size={24} />
                            <h3 className="text-xl font-bold text-gray-900">Confirmar Envio</h3>
                        </div>
                        
                        <p className="text-gray-600 mb-4">
                            Você está prestes a enviar esta campanha para <strong>{pendingRecipients.length} usuários</strong>.
                        </p>

                        <div className="bg-gray-50 p-3 rounded-lg mb-6 text-sm border border-gray-200">
                            <p className="font-bold text-gray-700 mb-1">Público:</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {targetRoles.map(r => (
                                    <span key={r} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">{rolesOptions.find(o => o.value === r)?.label || r}</span>
                                ))}
                            </div>
                            <p className="font-bold text-gray-700 mb-1">Assunto:</p>
                            <p className="text-gray-600 truncate">{subject}</p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setShowConfirmModal(false)}
                                disabled={sending}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold transition"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmSend}
                                disabled={sending}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition flex items-center shadow-lg disabled:opacity-50"
                            >
                                {sending ? <Loader2 className="animate-spin mr-2" size={18}/> : <Send className="mr-2" size={18}/>}
                                Confirmar e Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminCampaigns;
