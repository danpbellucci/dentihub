
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  UserCheck, 
  Mic, 
  MessageSquare, 
  DollarSign, 
  BellRing, 
  Settings, 
  ChevronDown, 
  ChevronUp,
  BookOpen,
  X,
  Send,
  Loader2,
  MessageCircle
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useOutletContext } from 'react-router-dom';
import { UserProfile } from '../types';
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4 transition-all duration-200">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-50 text-primary rounded-lg">
            <Icon size={24} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="px-6 pb-6 pt-2 bg-gray-50/50 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Passo a Passo</h4>
          <ul className="space-y-3">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-full text-xs font-bold text-primary mr-3 shadow-sm">
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
  const { userProfile } = useOutletContext<{ userProfile: UserProfile | null }>();
  
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
    if (!supportForm.message || !supportForm.email) {
      setToast({ message: "Por favor, preencha a mensagem e seu e-mail de contato.", type: 'warning' });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'support_ticket',
          contactEmail: supportForm.email,
          subject: supportForm.subject || 'Dúvida do Guia Prático',
          message: supportForm.message,
          userName: userProfile?.email || 'Usuário DentiHub' // Fallback se não tiver nome no profile
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      setToast({ message: "Sua mensagem foi enviada! Responderemos em breve.", type: 'success' });
      setIsSupportModalOpen(false);
      setSupportForm(prev => ({ ...prev, subject: '', message: '' })); // Mantém o email preenchido
    } catch (err: any) {
      console.error(err);
      setToast({ message: "Erro ao enviar mensagem. Tente novamente mais tarde.", type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const guides = [
    {
      title: 'Visão Geral',
      icon: LayoutDashboard,
      description: 'Acompanhe os indicadores chave e a agenda do dia.',
      steps: [
        'Ao entrar no sistema, você verá os cards com o total de pacientes, agendamentos do dia e receita mensal.',
        'Use a lista "Agenda de Hoje" para ver rapidamente os próximos atendimentos.',
        'Acompanhe o "Financeiro do Dia" para ver as movimentações recentes de entrada e saída.'
      ]
    },
    {
      title: 'Agenda',
      icon: Calendar,
      description: 'Gerencie compromissos, status e pagamentos.',
      steps: [
        'Clique em "Novo Agendamento" para marcar uma consulta. Selecione o paciente, dentista, serviço e horário.',
        'Use os filtros no topo para alternar entre visualização Mensal (Grade) e Lista.',
        'Para editar um agendamento, basta clicar sobre ele.',
        'Na visualização em Lista, você pode alterar rapidamente o Status (Agendado, Concluído, Cancelado) e o Pagamento.',
        'Ao marcar um agendamento como "Pago", o sistema lançará automaticamente o valor no Financeiro.'
      ]
    },
    {
      title: 'Pacientes',
      icon: Users,
      description: 'Cadastro completo, histórico e prescrições.',
      steps: [
        'Clique em "Novo" para cadastrar um paciente. Preencha os dados pessoais e anamnese básica.',
        'Clique no nome do paciente na lista para ver o perfil completo, histórico clínico e link direto para o WhatsApp.',
        'Use os botões de ação na lista para emitir Receitas (PDF) ou acessar o Prontuário.',
        'Use a barra de busca para encontrar pacientes por nome ou CPF.'
      ]
    },
    {
      title: 'Dentistas',
      icon: UserCheck,
      description: 'Gestão da equipe, serviços e horários de atendimento.',
      steps: [
        'Cadastre seus profissionais definindo especialidades, CRO e cor de identificação na agenda.',
        'Na aba de serviços, adicione os procedimentos que o dentista realiza, definindo preço e duração.',
        'Em "Disponibilidade Semanal", configure os dias e horários de trabalho, incluindo pausas para almoço.',
        'Use "Datas Bloqueadas" para registrar férias ou folgas específicas.'
      ]
    },
    {
      title: 'Prontuário IA',
      icon: Mic,
      description: 'Transcreva consultas e gere resumos SOAP com Inteligência Artificial.',
      steps: [
        'Selecione o Paciente e o Dentista responsável.',
        'Clique no ícone do Microfone para iniciar a gravação durante ou após a consulta (dite os procedimentos e observações).',
        'Clique em "Parar & Processar". A IA irá transcrever o áudio e gerar um resumo técnico no formato SOAP.',
        'Revise o texto gerado e clique em "Salvar no Prontuário" para gravar no histórico do paciente.'
      ]
    },
    {
      title: 'Mensageria',
      icon: MessageSquare,
      description: 'Automação de e-mails e campanhas de retorno.',
      steps: [
        'A aba "Histórico & Automações" mostra os envios automáticos (lembretes de consulta, aniversários) realizados pelo sistema.',
        'Na aba "Boas-vindas", selecione novos pacientes para enviar um e-mail de acolhimento.',
        'Na aba "Campanha Manual (Retorno)", filtre pacientes que não comparecem há mais de X dias e envie um e-mail convidando para um check-up.'
      ]
    },
    {
      title: 'Financeiro',
      icon: DollarSign,
      description: 'Controle de fluxo de caixa e relatórios.',
      steps: [
        'Visualize o saldo total do período selecionado no card à esquerda.',
        'Clique em "Nova Transação" para lançar despesas (ex: luz, aluguel) ou receitas avulsas manualmente.',
        'Use os filtros de data para gerar relatórios de períodos específicos.'
      ]
    },
    {
      title: 'Solicitações',
      icon: BellRing,
      description: 'Aprovação de agendamentos online.',
      steps: [
        'Quando um paciente agenda pelo seu Link Público, o pedido aparece aqui.',
        'Verifique os dados do paciente e o horário solicitado.',
        'Clique em "Aceitar" para confirmar (o agendamento vai para a Agenda oficial) ou "Recusar" para cancelar o pedido.'
      ]
    },
    {
      title: 'Configurações',
      icon: Settings,
      description: 'Dados da clínica, segurança e equipe.',
      steps: [
        'Em "Perfil", atualize os dados da clínica, logo e endereço. O "Slug" define seu link público de agendamento.',
        'Em "Segurança", altere sua senha de acesso.',
        'Em "Funcionários", convide novos membros para a equipe e gerencie permissões (Administrador, Dentista, Funcionário).',
        'Em "Planos", gerencie sua assinatura do DentiHub.'
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <BookOpen size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Guia Prático</h1>
          <p className="text-gray-600">Aprenda a utilizar todos os recursos do DentiHub passo a passo.</p>
        </div>
      </div>

      <div className="space-y-2">
        {guides.map((guide, index) => (
          <GuideSection 
            key={index}
            title={guide.title}
            icon={guide.icon}
            description={guide.description}
            steps={guide.steps}
          />
        ))}
      </div>
      
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-6 text-center">
        <h3 className="font-bold text-blue-900 mb-2">Ainda tem dúvidas ou encontrou um problema?</h3>
        <p className="text-blue-700 text-sm mb-4">Nossa equipe de suporte está pronta para ajudar.</p>
        <button 
          onClick={() => setIsSupportModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm"
        >
          Falar com Suporte
        </button>
      </div>

      {/* MODAL DE SUPORTE */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <MessageCircle className="text-primary" /> Falar com Suporte
              </h2>
              <button 
                onClick={() => setIsSupportModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSendSupport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Ex: Erro ao cadastrar paciente"
                  value={supportForm.subject}
                  onChange={e => setSupportForm({...supportForm, subject: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
                <textarea 
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none h-32 resize-none"
                  placeholder="Descreva sua dúvida ou o problema encontrado com detalhes..."
                  value={supportForm.message}
                  onChange={e => setSupportForm({...supportForm, message: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seu E-mail para Contato *</label>
                <input 
                  type="email" 
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none bg-gray-50"
                  value={supportForm.email}
                  onChange={e => setSupportForm({...supportForm, email: e.target.value})}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={sending}
                  className="flex items-center px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-sky-600 font-bold transition shadow-md disabled:opacity-50"
                >
                  {sending ? <Loader2 className="animate-spin mr-2" size={18}/> : <Send className="mr-2" size={18}/>}
                  {sending ? 'Enviando...' : 'Enviar Solicitação'}
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