
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Transaction, Dentist } from '../types';
import { format, endOfMonth, startOfMonth } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, Plus, Edit2, Trash2, X, Filter, HelpCircle, Loader2, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Toast, { ToastType } from './Toast';

const FinancePage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [canDelete, setCanDelete] = useState(true); // Default true: Acesso ao módulo = Permissão total
  const [showHelp, setShowHelp] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const navigate = useNavigate();

  // Form States
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [status, setStatus] = useState<'pending' | 'completed'>('completed');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [observation, setObservation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [dentistId, setDentistId] = useState(''); // '' means Clinic/Shared

  const incomeCategories = ['Consulta', 'Outros'];
  const expenseCategories = ['Aluguel Imóvel', 'Água', 'Luz', 'Telefone', 'Internet', 'Despesa Pessoal', 'Impostos', 'Fornecedores Gerais', 'Outros'];
  const paymentMethods = ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência', 'Convênio'];

  useEffect(() => { initialize(); }, [startDate, endDate, filterStatus]);

  const initialize = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    let targetClinicId = user.id;
    const { data: profile } = await supabase.from('user_profiles').select('clinic_id, role').eq('id', user.id).maybeSingle();
    if (profile) {
        targetClinicId = profile.clinic_id;
        setCanDelete(true);
    }
    setClinicId(targetClinicId);
    
    await Promise.all([
        fetchTransactions(targetClinicId), 
        fetchDentists(targetClinicId),
        checkSubscription(targetClinicId)
    ]);
    setLoading(false);
  };

  const checkSubscription = async (targetId: string) => {
      const { data } = await supabase.from('clinics').select('subscription_tier').eq('id', targetId).single();
      if (data) setCurrentTier(data.subscription_tier || 'free');
  };

  const fetchDentists = async (targetId: string) => {
      const { data } = await supabase.from('dentists').select('id, name').eq('clinic_id', targetId).order('name');
      if (data) setDentists(data as Dentist[]);
  };

  const fetchTransactions = async (targetId: string) => {
    let query = supabase
        .from('transactions')
        .select('*, dentist:dentists(name)')
        .eq('clinic_id', targetId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
    
    if (filterStatus !== 'all') query = query.eq('status', filterStatus as any);
    const { data } = await query;
    if (data) setTransactions(data as Transaction[]);
  };

  const formatDateAdjusted = (dateString: string) => {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return format(new Date(date.getTime() + userTimezoneOffset), 'dd/MM/yyyy');
  };

  const handleOpenModal = (t?: Transaction) => {
    if (t) {
      setEditingTransaction(t); 
      setAmount(t.amount.toString()); 
      setCategory(t.category); 
      setType(t.type); 
      setStatus(t.status); 
      setDate(new Date(t.date).toISOString().split('T')[0]); 
      setObservation(t.observation || ''); 
      setPaymentMethod(t.payment_method || 'Pix');
      setDentistId(t.dentist_id || '');
    } else {
      setEditingTransaction(null); 
      setAmount(''); 
      setType('expense'); 
      setCategory(expenseCategories[0]); 
      setStatus('completed'); 
      setDate(new Date().toISOString().split('T')[0]); 
      setObservation(''); 
      setPaymentMethod('Pix');
      setDentistId('');
    }
    setIsModalOpen(true);
  };

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    if (newType === 'income') setCategory(incomeCategories[0]); else setCategory(expenseCategories[0]);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setProcessing(true);
    try {
        const { error } = await supabase.from('transactions').delete().eq('id', deleteId);
        if (error) throw error;
        setToast({ message: "Transação excluída.", type: 'success' });
        if (clinicId) await fetchTransactions(clinicId);
    } catch (err: any) { setToast({ message: "Erro ao excluir: " + err.message, type: 'error' }); } 
    finally { setProcessing(false); setDeleteId(null); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    try {
      const payload = { 
          clinic_id: clinicId, 
          amount: parseFloat(amount), 
          category, 
          type, 
          status, 
          date: new Date(date).toISOString(), 
          observation: observation || null, 
          payment_method: paymentMethod,
          dentist_id: dentistId || null // Send null if empty string
      };
      
      if (editingTransaction) await supabase.from('transactions').update(payload).eq('id', editingTransaction.id);
      else await supabase.from('transactions').insert(payload);
      
      setIsModalOpen(false);
      setToast({ message: "Salvo com sucesso!", type: 'success' });
      await fetchTransactions(clinicId);
    } catch (error: any) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); }
  };

  const handleQuickStatusUpdate = async (t: Transaction, newStatus: 'pending' | 'completed') => {
      const previousTransactions = [...transactions];
      setTransactions(prev => prev.map(item => item.id === t.id ? { ...item, status: newStatus } : item));
      try {
          const { error } = await supabase.from('transactions').update({ status: newStatus }).eq('id', t.id);
          if (error) throw error;
      } catch (err: any) {
          setTransactions(previousTransactions);
          setToast({ message: "Erro ao atualizar: " + err.message, type: 'error' });
      }
  };

  const balance = transactions.reduce((acc, curr) => curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0);

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Fluxo de Caixa</h1>
            <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors"><HelpCircle size={20} /></button>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold w-full sm:w-auto">
            <Plus size={18} className="mr-2" /> Nova Transação
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-lg shadow border-l-8 border-primary flex flex-col justify-center lg:col-span-1 border-y border-r border-white/5">
          <p className="text-gray-400 font-medium text-sm">Saldo (Período)</p>
          <p className={`text-3xl font-black ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-lg shadow border border-white/5 lg:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center text-gray-400 min-w-fit self-start sm:self-center"><Filter size={18} className="mr-2" /> <span className="font-bold text-sm uppercase">Filtros:</span></div>
            <div className="flex flex-wrap items-center gap-3 w-full justify-end">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-800 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-800 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-800 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none">
                <option value="all">Todos</option><option value="completed">Realizados</option><option value="pending">Pendentes</option>
              </select>
            </div>
        </div>
      </div>

      <div className="bg-gray-900/60 backdrop-blur-md shadow overflow-hidden sm:rounded-lg border border-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Categoria / Responsável</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase">Valor</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">Carregando...</td></tr> : transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4 text-sm text-gray-400">{formatDateAdjusted(t.date)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col">
                        <div className="flex items-center font-medium text-gray-200">
                            {t.type === 'income' ? <ArrowUpCircle size={16} className="text-green-500 mr-2" /> : <ArrowDownCircle size={16} className="text-red-500 mr-2" />}
                            {t.category}
                        </div>
                        <div className="ml-6 mt-1">
                            {t.dentist ? (
                                <span className="inline-flex items-center text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">
                                    <User size={10} className="mr-1"/> {t.dentist.name}
                                </span>
                            ) : (
                                <span className="inline-flex items-center text-[10px] bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded border border-white/5">
                                    <Users size={10} className="mr-1"/> Clínica (Geral)
                                </span>
                            )}
                        </div>
                    </div>
                  </td>
                   <td className="px-6 py-4 text-sm text-center">
                        <select
                            value={t.status}
                            onChange={(e) => handleQuickStatusUpdate(t, e.target.value as 'pending' | 'completed')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase cursor-pointer outline-none appearance-none text-center min-w-[90px] border border-transparent transition-colors ${
                                t.status === 'completed' 
                                    ? (t.type === 'income' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400') 
                                    : 'bg-yellow-900/30 text-yellow-400'
                            }`}
                        >
                            <option value="pending" className="bg-gray-800 text-white">Pendente</option>
                            <option value="completed" className="bg-gray-800 text-white">
                                {t.type === 'income' ? 'Recebido' : 'Pago'}
                            </option>
                        </select>
                   </td>
                  <td className={`px-6 py-4 text-sm text-right font-black ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-center text-sm font-medium">
                    <div className="flex justify-center space-x-2">
                      <button onClick={() => handleOpenModal(t)} className="text-gray-500 hover:text-blue-400"><Edit2 size={16} /></button>
                      {canDelete && <button onClick={() => setDeleteId(t.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="flex gap-4 mb-2">
                <button type="button" onClick={() => handleTypeChange('expense')} className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase border transition-all ${type === 'expense' ? 'bg-red-900/30 border-red-500 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>Despesa</button>
                <button type="button" onClick={() => handleTypeChange('income')} className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase border transition-all ${type === 'income' ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>Receita</button>
              </div>

              {/* Dentist / Owner Selection */}
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Responsável / Vínculo</label>
                  <select 
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary"
                      value={dentistId}
                      onChange={(e) => setDentistId(e.target.value)}
                  >
                      <option value="">Clínica (Geral)</option>
                      {dentists.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                  </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" required placeholder="0,00" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-lg font-medium text-white outline-none focus:border-primary" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                    <input type="date" required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                <select required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {(type === 'income' ? incomeCategories : expenseCategories).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Forma Pagto.</label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Situação</label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary" value={status} onChange={(e) => setStatus(e.target.value as 'pending' | 'completed')}>
                        <option value="completed">{type === 'income' ? 'Recebido' : 'Pago'}</option>
                        <option value="pending">Pendente</option>
                    </select>
                  </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observação (Opcional)</label>
                <textarea rows={3} placeholder="Detalhes adicionais..." className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-primary resize-none placeholder-gray-500" value={observation} onChange={(e) => setObservation(e.target.value)} />
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 border-t border-white/10 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 font-bold hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-sky-600 transition shadow-md">Confirmar Lançamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-900/20 p-3 rounded-full inline-block mb-4"><Trash2 className="text-red-500" size={32} /></div>
             <h3 className="text-lg font-bold text-white mb-2">Excluir Transação?</h3>
             <p className="text-gray-400 mb-6 text-sm">Tem certeza que deseja remover este lançamento? Essa ação não pode ser desfeita.</p>
             <div className="flex space-x-3 w-full">
                <button onClick={() => setDeleteId(null)} disabled={processing} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 font-bold transition">Cancelar</button>
                <button onClick={confirmDelete} disabled={processing} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg">{processing ? <Loader2 className="animate-spin" size={20}/> : 'Sim, Excluir'}</button>
             </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="text-xl font-bold flex items-center text-white gap-2"><HelpCircle className="text-primary"/> Fluxo de Caixa</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-400">
                <p>Gerencie as finanças da sua clínica de forma simples.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Vínculo:</strong> Você pode atribuir uma receita ou despesa a um dentista específico ou deixá-la como geral da clínica.</li>
                   <li><strong>Edição Rápida:</strong> Clique no status ("Pendente" ou "Recebido/Pago") na tabela para alterá-lo rapidamente.</li>
                   <li><strong>Receitas:</strong> O sistema lança automaticamente pagamentos de consultas quando você marca como "Pago" na Agenda (geralmente atribuídas ao dentista do agendamento).</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
