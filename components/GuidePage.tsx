
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Calendar, Users, UserCheck, Mic, MessageSquare, DollarSign, BellRing, Settings, ChevronDown, ChevronUp, BookOpen, X, Send, Loader2, MessageCircle, Box
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useDashboard } from './DashboardLayout'; // Alterado de useOutletContext para useDashboard
import Toast, { ToastType } from './Toast';

interface GuideSectionProps {
  title: string;
  icon: React.ElementType;
  description: string;
  steps: string[];
}

const GuideSection: React.FC<GuideSectionProps> = ({ title, icon: Icon, description, steps }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-lg border border-white/5 overflow-hidden mb-4 transition-all duration-200">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-900/20 text-blue-400 rounded-lg border border-blue-500/20">
            <Icon size={24} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
      </button>
      
      {isOpen && (
        <div className="px-6 pb-6 pt-2 bg-gray-800/20 border-t border-white/5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Passo a Passo</h4>
          <ul className="space-y-3">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start text-sm text-gray-300">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-800 border border-white/10 rounded-full text-xs font-bold text-primary mr-3 shadow-sm">
                  {index + 1}
                </span>
                <span className="mt-0.5">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const GuidePage: React.FC = () => {
  const { userProfile } = useDashboard() || {}; // Uso correto do Hook do Contexto
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: '', message: '', email: '' });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (userProfile?.email) {
      setSupportForm(prev => ({ ...prev, email: userProfile.email }));
    }
  }, [userProfile]);

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.message || !supportForm.email) { setToast({ message: "Preencha a mensagem e e-mail.", type: 'warning' }); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-emails', {
        body: { type: 'support_ticket', contactEmail: supportForm.email, subject: supportForm.subject || 'Dúvida do Guia Prático', message: supportForm.message, userName: userProfile?.email || 'Usuário DentiHub' }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      setToast({ message: "Mensagem enviada!", type: 'success' });
      setIsSupportModalOpen(false);
      setSupportForm(prev => ({ ...prev, subject: '', message: '' })); 
    } catch (err: any) { console.error(err); setToast({ message: "Erro ao enviar.", type: 'error' }); } 
    finally { setSending(false); }
  };

  const guides = [
    { 
        title: 'Visão Geral', 
        icon: LayoutDashboard, 
        description: 'Acompanhe os indicadores chave e a agenda do dia.', 
        steps: [
            'Visualize o total de pacientes, agendamentos e previsão financeira.',
            'Acompanhe a lista de "Próximos Agendamentos" em tempo real para se preparar.',
            'Monitore o fluxo de caixa da semana nos gráficos de Entradas e Saídas.'
        ] 
    },
    { 
        title: 'Agenda', 
        icon: Calendar, 
        description: 'Gerencie compromissos, status e pagamentos.', 
        steps: [
            'Clique em "Novo Agendamento" ou em um horário vazio na grade.',
            'Use os filtros no topo para alternar entre Grade Mensal e Lista.', 
            'Na visualização de Lista, altere rapidamente Status e Pagamento.', 
            'Marcar como "Pago" lança automaticamente o valor no Financeiro.',
            'Ao concluir um atendimento, o sistema sugere agendar o retorno.'
        ] 
    },
    { 
        title: 'Pacientes', 
        icon: Users, 
        description: 'Cadastro completo e histórico clínico.', 
        steps: [
            'Cadastre pacientes com validação automática de CPF.', 
            'Clique no nome para ver perfil e histórico.', 
            'Use botões de ação rápida para verificar agendamentos passados.', 
            'Utilize a busca inteligente por Nome ou CPF.'
        ] 
    },
    { 
        title: 'Dentistas', 
        icon: UserCheck, 
        description: 'Gestão da equipe e profissionais.', 
        steps: [
            'Cadastre profissionais com cor personalizada para a agenda.', 
            'Configure horários de atendimento, pausas e dias de folga (Datas Bloqueadas).', 
            'Defina os procedimentos realizados e valores.', 
            'O sistema envia um convite por e-mail para o dentista criar sua senha e acessar.'
        ] 
    },
    { 
        title: 'Prontuário IA', 
        icon: Mic, 
        description: 'Transcreva consultas automaticamente com IA.', 
        steps: [
            'Selecione o Paciente e o Dentista responsável.', 
            'Clique no microfone e dite a evolução clínica (o que foi feito).', 
            'Clique em "Parar & Processar" para gerar o resumo SOAP.', 
            'Revise o texto gerado e salve no histórico do paciente.'
        ] 
    },
    { 
        title: 'Mensageria', 
        icon: MessageSquare, 
        description: 'Automação de e-mails e Campanhas.', 
        steps: [
            'Acompanhe o histórico de envios automáticos (Lembretes, Aniversários).', 
            'Use a aba "Campanha Manual" para filtrar pacientes ausentes (Recall).', 
            'Envie e-mails de retorno em massa para reativar pacientes.',
            'O sistema notifica os administradores se o estoque estiver baixo.'
        ] 
    },
    { 
        title: 'Financeiro', 
        icon: DollarSign, 
        description: 'Fluxo de caixa e controle de contas.', 
        steps: [
            'Visualize o saldo do período e filtre por data.', 
            'Lance despesas ou receitas avulsas manualmente.', 
            'Vincule lançamentos a um Dentista específico para facilitar o repasse.',
            'Altere o status para "Pago/Recebido" com um clique na tabela.'
        ] 
    },
    { 
        title: 'Estoque', 
        icon: Box, 
        description: 'Gestão de materiais e alertas de reposição.', 
        steps: [
            'Cadastre itens definindo a quantidade mínima para alerta.', 
            'Defina se o item é "Compartilhado" ou de um Dentista específico.', 
            'Use os botões + e - para ajustes rápidos de quantidade no dia a dia.',
            'Receba alertas automáticos por e-mail quando o estoque atingir o mínimo.'
        ] 
    },
    { 
        title: 'Solicitações', 
        icon: BellRing, 
        description: 'Central de notificações e pedidos online.', 
        steps: [
            'Gerencie pedidos de agendamento vindos do Link Público.', 
            'Visualize respostas de pacientes aos lembretes (Confirmou / Cancelou).', 
            'Aceite ou Recuse solicitações com um clique, verificando conflitos de horário.'
        ] 
    },
    { 
        title: 'Configurações', 
        icon: Settings, 
        description: 'Dados da clínica, equipe e assinatura.', 
        steps: [
            'Personalize os dados e a logo da clínica.', 
            'Gerencie a equipe, convide membros e defina perfis de acesso.', 
            'Configure quais notificações cada perfil deve receber.', 
            'Gerencie seu Plano, Assinatura e acompanhe o programa de Indicações.'
        ] 
    }
  ];

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-900/30 text-indigo-400 rounded-xl border border-indigo-500/20">
          <BookOpen size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Guia Prático</h1>
          <p className="text-gray-400">Aprenda a utilizar todos os recursos do DentiHub passo a passo.</p>
        </div>
      </div>

      {/* Vídeo Tutorial Principal */}
      <div className="mb-10 bg-gray-900/40 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/5 bg-gray-900/50 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vídeo Tutorial Completo</span>
        </div>
        <div className="aspect-video w-full">
          <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/UgMxxxstrA8" 
            title="DentiHub Tutorial Completo" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowFullScreen
          ></iframe>
        </div>
      </div>

      <div className="space-y-2">
        {guides.map((guide, index) => <GuideSection key={index} {...guide} />)}
      </div>
      
      <div className="mt-8 bg-blue-900/20 border border-blue-500/20 rounded-lg p-6 text-center">
        <h3 className="font-bold text-blue-300 mb-2">Ainda tem dúvidas ou encontrou um problema?</h3>
        <p className="text-blue-400 text-sm mb-4">Nossa equipe de suporte está pronta para ajudar.</p>
        <button onClick={() => setIsSupportModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-500 transition shadow-sm">Falar com Suporte</button>
      </div>

      {/* MODAL DE SUPORTE */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><MessageCircle className="text-primary" /> Falar com Suporte</h2>
              <button onClick={() => setIsSupportModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSendSupport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Assunto</label>
                <input type="text" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:border-primary outline-none" placeholder="Ex: Erro ao cadastrar" value={supportForm.subject} onChange={e => setSupportForm({...supportForm, subject: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Mensagem *</label>
                <textarea required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:border-primary outline-none h-32 resize-none" placeholder="Detalhes..." value={supportForm.message} onChange={e => setSupportForm({...supportForm, message: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Seu E-mail *</label>
                <input type="email" required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:border-primary outline-none" value={supportForm.email} onChange={e => setSupportForm({...supportForm, email: e.target.value})} />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={sending} className="flex items-center px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-sky-600 font-bold transition shadow-md disabled:opacity-50">
                  {sending ? <Loader2 className="animate-spin mr-2" size={18}/> : <Send className="mr-2" size={18}/>} {sending ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuidePage;
