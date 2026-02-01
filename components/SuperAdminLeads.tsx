
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, Mail, RefreshCw, CheckCircle, XCircle, 
  Loader2, Send, Users, Filter, Rocket, AlertTriangle, X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Toast, { ToastType } from './Toast';

interface LeadAnalysis {
    id: string;
    email: string;
    source: string;
    created_at: string;
    has_account: boolean;
    clinic_name?: string;
}

const SuperAdminLeads: React.FC = () => {
    const navigate = useNavigate();
    const [leads, setLeads] = useState<LeadAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'converted'>('all');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    
    // Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_leads_analysis');
            if (error) throw error;
            setLeads(data || []);
        } catch (err: any) {
            console.error(err);
            setToast({ message: "Erro ao carregar leads.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const pendingLeads = leads.filter(l => !l.has_account);
    const displayedLeads = leads.filter(l => {
        if (filter === 'pending') return !l.has_account;
        if (filter === 'converted') return l.has_account;
        return true;
    });

    const handleOpenConfirmModal = () => {
        if (pendingLeads.length === 0) {
            setToast({ message: "Não há leads pendentes para enviar.", type: 'warning' });
            return;
        }
        setShowConfirmModal(true);
    };

    const executeBatchSend = async () => {
        setSending(true);
        try {
            const recipients = pendingLeads.map(l => ({ email: l.email }));
            
            const subject = "🎁 Convite Exclusivo: Modernize sua Clínica Gratuitamente";
            const htmlContent = `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
                    <div style="background-color: #0ea5e9; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">DentiHub</h1>
                    </div>
                    
                    <div style="padding: 40px 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="font-size: 18px; margin-bottom: 20px; color: #0f172a;">Olá!</p>
                        
                        <p>Notamos que você demonstrou interesse no DentiHub, mas ainda não ativou sua conta.</p>
                        
                        <p>Queremos te ajudar a eliminar a papelada e organizar seu consultório hoje mesmo. Veja o que você está perdendo:</p>
                        
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                <li style="margin-bottom: 10px; padding-left: 25px; position: relative;">
                                    ✅ <strong>Agenda Inteligente:</strong> Confirmação automática por e-mail.
                                </li>
                                <li style="margin-bottom: 10px; padding-left: 25px; position: relative;">
                                    ✅ <strong>Prontuário com IA:</strong> Fale e o sistema escreve (SOAP).
                                </li>
                                <li style="margin-bottom: 10px; padding-left: 25px; position: relative;">
                                    ✅ <strong>Financeiro Completo:</strong> Controle entradas e saídas.
                                </li>
                                <li style="padding-left: 25px; position: relative;">
                                    ✅ <strong>Acesso Remoto:</strong> Use no celular ou computador.
                                </li>
                            </ul>
                        </div>

                        <p style="text-align: center; font-weight: bold; color: #0ea5e9; font-size: 16px;">
                            O melhor de tudo? É Grátis para começar.
                        </p>
                        <p style="text-align: center; font-size: 14px; color: #64748b; margin-top: 5px;">
                            Sem necessidade de cartão de crédito.
                        </p>

                        <div style="text-align: center; margin-top: 35px;">
                            <a href="https://dentihub.com.br/#/auth?view=signup" style="background-color: #0ea5e9; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2);">
                                Criar Minha Conta Grátis
                            </a>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
                        <p>DentiHub - O sistema do dentista moderno.</p>
                    </div>
                </div>
            `;

            const { data, error } = await supabase.functions.invoke('send-emails', {
                body: {
                    type: 'marketing_campaign',
                    recipients,
                    subject,
                    htmlContent
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            setToast({ message: `E-mail enviado para ${data.results?.count || recipients.length} leads!`, type: 'success' });
            setShowConfirmModal(false);

        } catch (err: any) {
            console.error(err);
            setToast({ message: "Erro no envio: " + err.message, type: 'error' });
        } finally {
            setSending(false);
        }
    };

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
                                <Users className="text-orange-500" /> Gestão de Leads
                            </h1>
                            <p className="text-sm text-gray-500">Monitore e converta interessados em usuários.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="bg-white p-1 rounded-lg border shadow-sm flex">
                            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded text-sm font-bold ${filter === 'all' ? 'bg-gray-100' : 'text-gray-500 hover:bg-gray-50'}`}>Todos</button>
                            <button onClick={() => setFilter('pending')} className={`px-3 py-1.5 rounded text-sm font-bold ${filter === 'pending' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-50'}`}>Pendentes</button>
                            <button onClick={() => setFilter('converted')} className={`px-3 py-1.5 rounded text-sm font-bold ${filter === 'converted' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>Convertidos</button>
                        </div>
                        <button onClick={fetchLeads} className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-500" title="Atualizar">
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-full mr-4"><Filter size={24}/></div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold uppercase">Total Leads</p>
                            <p className="text-2xl font-black text-gray-800">{leads.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
                        <div className="p-4 bg-orange-50 text-orange-600 rounded-full mr-4"><Rocket size={24}/></div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold uppercase">Pendentes</p>
                            <p className="text-2xl font-black text-gray-800">{pendingLeads.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
                        <div className="p-4 bg-green-50 text-green-600 rounded-full mr-4"><CheckCircle size={24}/></div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold uppercase">Convertidos</p>
                            <p className="text-2xl font-black text-gray-800">
                                {leads.filter(l => l.has_account).length}
                                <span className="text-sm font-normal text-gray-400 ml-2">
                                    ({leads.length > 0 ? Math.round((leads.filter(l => l.has_account).length / leads.length) * 100) : 0}%)
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Action Area */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center bg-gray-50">
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">Base de Contatos</h3>
                            <p className="text-sm text-gray-500">Gerencie quem demonstrou interesse mas não finalizou o cadastro.</p>
                        </div>
                        {pendingLeads.length > 0 && (
                            <button 
                                onClick={handleOpenConfirmModal}
                                disabled={sending}
                                className="mt-4 md:mt-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2.5 rounded-lg font-bold hover:shadow-lg transition flex items-center disabled:opacity-50"
                            >
                                <Send className="mr-2" size={18}/>
                                Enviar Convite para {pendingLeads.length} Pendentes
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-4">Lead (E-mail)</th>
                                    <th className="px-6 py-4">Origem</th>
                                    <th className="px-6 py-4">Data Cadastro</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4">Clínica (Se conv.)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando dados...</td></tr>
                                ) : displayedLeads.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum lead encontrado com o filtro atual.</td></tr>
                                ) : (
                                    displayedLeads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 font-medium text-gray-800 flex items-center">
                                                <Mail size={16} className="text-gray-400 mr-2"/> {lead.email}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 capitalize">
                                                {lead.source.replace(/_/g, ' ')}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {format(parseISO(lead.created_at), 'dd/MM/yyyy HH:mm')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {lead.has_account ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                        <CheckCircle size={12} className="mr-1"/> Convertido
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                                        <XCircle size={12} className="mr-1"/> Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                                {lead.clinic_name || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                        <button onClick={() => setShowConfirmModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-4 text-amber-600">
                            <AlertTriangle size={24} />
                            <h3 className="text-xl font-bold text-gray-900">Confirmar Disparo</h3>
                        </div>
                        
                        <p className="text-gray-600 mb-6">
                            Você está prestes a enviar e-mails de convite para <strong>{pendingLeads.length} leads</strong> que ainda não criaram conta.
                        </p>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 text-sm">
                            <p className="font-bold text-gray-700 mb-1">Assunto do E-mail:</p>
                            <p className="text-gray-600 italic">"🎁 Convite Exclusivo: Modernize sua Clínica Gratuitamente"</p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setShowConfirmModal(false)}
                                disabled={sending}
                                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={executeBatchSend}
                                disabled={sending}
                                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold hover:shadow-lg transition flex items-center shadow-md disabled:opacity-50"
                            >
                                {sending ? <Loader2 className="animate-spin mr-2" size={18}/> : <Send className="mr-2" size={18}/>}
                                Confirmar Envio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminLeads;
