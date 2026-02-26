import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  Play, Mail, FileText, CreditCard, Users, 
  BarChart3, CalendarClock, AlertTriangle, CheckCircle, Loader2, Send
} from 'lucide-react';
import Toast, { ToastType } from './Toast';

const SuperAdminTestFunctions: React.FC = () => {
    const [loading, setLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [testEmail, setTestEmail] = useState('danilobellucci@gmail.com');

    const invokeFunction = async (name: string, body: any = {}) => {
        setLoading(name);
        try {
            const { data, error } = await supabase.functions.invoke(name, {
                body: { ...body, testMode: true, testEmail }
            });

            if (error) throw error;
            
            setToast({ 
                message: `Função ${name} executada com sucesso! ${data?.message || ''}`, 
                type: 'success' 
            });
            console.log(`Response from ${name}:`, data);
        } catch (err: any) {
            console.error(`Erro ao invocar ${name}:`, err);
            setToast({ message: `Erro em ${name}: ${err.message}`, type: 'error' });
        } finally {
            setLoading(null);
        }
    };

    const functions = [
        {
            id: 'send-super-admin-daily-report',
            name: 'Relatório Diário Super Admin',
            description: 'Envia o resumo de métricas globais para o admin.',
            icon: BarChart3,
            color: 'bg-blue-500',
            action: () => invokeFunction('send-super-admin-daily-report')
        },
        {
            id: 'send-daily-finance',
            name: 'Previsão Financeira (7 dias)',
            description: 'Envia o fluxo de caixa previsto para as clínicas configuradas.',
            icon: CreditCard,
            color: 'bg-emerald-500',
            action: () => invokeFunction('send-daily-finance')
        },
        {
            id: 'send-monthly-report',
            name: 'Relatório Mensal',
            description: 'Envia o resumo mensal completo para as clínicas.',
            icon: FileText,
            color: 'bg-indigo-500',
            action: () => invokeFunction('send-monthly-report')
        },
        {
            id: 'send-system-campaigns',
            name: 'Campanhas de Sistema (Ativação)',
            description: 'Dispara e-mails de onboarding e retenção baseados no uso.',
            icon: Send,
            color: 'bg-purple-500',
            action: () => invokeFunction('send-system-campaigns')
        },
        {
            id: 'manage-leads',
            name: 'Processamento de Leads',
            description: 'Processa novos leads e envia sequências de e-mails.',
            icon: Users,
            color: 'bg-orange-500',
            action: () => invokeFunction('manage-leads', { type: 'process' })
        },
        {
            id: 'send-reminders',
            name: 'Lembretes de Agendamento',
            description: 'Envia lembretes padrão (24h antes).',
            icon: CalendarClock,
            color: 'bg-sky-500',
            action: () => invokeFunction('send-reminders')
        },
        {
            id: 'send-urgent-reminders',
            name: 'Lembretes Urgentes',
            description: 'Envia lembretes de última hora (2h antes).',
            icon: AlertTriangle,
            color: 'bg-red-500',
            action: () => invokeFunction('send-urgent-reminders')
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Play className="text-primary" size={20} /> Teste de Funções (Edge Functions)
                        </h2>
                        <p className="text-sm text-gray-500">Invoque manualmente as funções que foram alteradas para validar os novos links sem hashes.</p>
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail de Teste</label>
                        <div className="flex gap-2">
                            <input 
                                type="email" 
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary w-full md:w-64"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {functions.map((func) => (
                        <div key={func.id} className="border border-gray-100 rounded-xl p-4 hover:border-primary/30 transition-all group bg-gray-50/50">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg ${func.color} text-white shadow-sm`}>
                                    <func.icon size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 text-sm truncate">{func.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                        {func.description}
                                    </p>
                                    <button
                                        onClick={func.action}
                                        disabled={loading !== null}
                                        className="mt-4 w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-primary hover:text-primary py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        {loading === func.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Play size={14} />
                                        )}
                                        {loading === func.id ? 'Executando...' : 'Testar Agora'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                    <AlertTriangle className="text-blue-500 flex-shrink-0" size={20} />
                    <div className="text-xs text-blue-700 leading-relaxed">
                        <strong>Nota Importante:</strong> Algumas funções podem não enviar e-mails se não houver dados correspondentes no banco de dados (ex: agendamentos para hoje). No entanto, a invocação retornará sucesso se a lógica for processada corretamente. Verifique os logs no dashboard do Supabase para detalhes técnicos.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminTestFunctions;
