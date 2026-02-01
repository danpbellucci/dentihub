
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Client, UserProfile } from '../types';
import { 
  Plus, Edit2, Trash2, Upload, Search, X, Loader2, User, 
  Phone, Mail, MapPin, FileText, Download, HelpCircle, 
  FileSpreadsheet, ClipboardList, Folder, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Toast, { ToastType } from './Toast';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { validateCPF } from '../utils/validators';

const ClientsPage: React.FC = () => {
  const { userProfile } = useOutletContext<{ userProfile: UserProfile | null }>();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    cpf: '',
    address: '',
    birth_date: '',
    clinical_notes: ''
  });

  // Delete Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Import/Export
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [currentTier, setCurrentTier] = useState('free');
  const [showHelp, setShowHelp] = useState(false);

  const clinicId = userProfile?.clinic_id;

  useEffect(() => {
    if (clinicId) {
      fetchClients(clinicId);
      checkTier(clinicId);
    }
  }, [clinicId]);

  const checkTier = async (id: string) => {
      const { data } = await supabase.from('clinics').select('subscription_tier').eq('id', id).single();
      if (data) setCurrentTier(data.subscription_tier || 'free');
  };

  const fetchClients = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('clinic_id', id)
      .order('name', { ascending: true });
    
    if (error) {
      setToast({ message: "Erro ao carregar pacientes.", type: 'error' });
    } else {
      setClients(data as Client[]);
    }
    setLoading(false);
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email || '',
        whatsapp: client.whatsapp || '',
        cpf: client.cpf || '',
        address: client.address || '',
        birth_date: client.birth_date || '',
        clinical_notes: client.clinical_notes || ''
      });
    } else {
      // Check limits before opening
      let limit = Infinity;
      if (currentTier === 'free') limit = 30;
      if (currentTier === 'starter') limit = 100;
      
      if (clients.length >= limit) {
          setToast({ message: `Limite do plano atingido (${limit} pacientes). Faça upgrade.`, type: 'warning' });
          return;
      }

      setEditingClient(null);
      setFormData({ name: '', email: '', whatsapp: '', cpf: '', address: '', birth_date: '', clinical_notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    
    if (formData.cpf && !validateCPF(formData.cpf)) {
        setToast({ message: "CPF inválido.", type: 'error' });
        return;
    }

    setProcessing(true);
    try {
      const payload = { ...formData, clinic_id: clinicId };
      
      if (editingClient) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
        if (error) throw error;
        setToast({ message: "Paciente atualizado!", type: 'success' });
      } else {
        const { error } = await supabase.from('clients').insert(payload);
        if (error) throw error;
        setToast({ message: "Paciente cadastrado!", type: 'success' });
      }
      
      setIsModalOpen(false);
      fetchClients(clinicId);
    } catch (err: any) {
      setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('clients').delete().eq('id', deleteId);
      if (error) throw error;
      setToast({ message: "Paciente removido.", type: 'success' });
      setDeleteId(null);
      if (clinicId) fetchClients(clinicId);
    } catch (err: any) {
      setToast({ message: "Erro ao excluir: " + err.message, type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
      const ws = XLSX.utils.aoa_to_sheet([
          ["Nome Completo", "Email", "WhatsApp", "CPF", "Data Nascimento (DD/MM/AAAA)", "Endereço", "Observações"],
          ["Exemplo da Silva", "exemplo@email.com", "11999999999", "00000000000", "01/01/1990", "Rua das Flores, 123", "Alergia a dipirona"]
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo");
      XLSX.writeFile(wb, "Modelo_Importacao_DentiHub.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      // (Mantém a lógica de upload existente)
      if (!e.target.files || e.target.files.length === 0) return;
      if (!clinicId) { setToast({message: "Erro de identificação da clínica", type: 'error'}); return; }

      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          
          if (data.length <= 1) {
              setToast({ message: "Arquivo vazio ou inválido.", type: 'warning' });
              return;
          }

          setLoading(true);

          const rows = data.slice(1).filter(r => r[0]);
          const newEntriesCount = rows.length;

          // Verificar Limites do Plano
          let limit = Infinity;
          if (currentTier === 'free') limit = 30;
          if (currentTier === 'starter') limit = 100;

          const { count: currentCount } = await supabase
              .from('clients')
              .select('*', { count: 'exact', head: true })
              .eq('clinic_id', clinicId);
          
          const totalAfterImport = (currentCount || 0) + newEntriesCount;

          if (totalAfterImport > limit) {
              setLoading(false);
              setToast({ 
                  message: `Importação cancelada: O total excede o limite do plano.`, 
                  type: 'error' 
              });
              if (fileInputRef.current) fileInputRef.current.value = "";
              return;
          }
          
          let successCount = 0;
          let errors = 0;
          const newRecipients: { id: string; name: string; email: string }[] = [];
          
          for (const row of rows) {
              let birthDate = null;
              const rawDate = row[4];
              if (rawDate) {
                  if (rawDate instanceof Date) {
                      birthDate = rawDate.toISOString().split('T')[0];
                  } else if (typeof rawDate === 'string') {
                      const parts = rawDate.trim().split('/');
                      if (parts.length === 3) birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                      else birthDate = rawDate;
                  }
              }

              const payload = {
                  clinic_id: clinicId,
                  name: row[0],
                  email: row[1] || null,
                  whatsapp: row[2] || null,
                  cpf: row[3] || null,
                  birth_date: birthDate,
                  address: row[5] || null,
                  clinical_notes: row[6] || null
              };

              try {
                  const { data: insertedClient, error } = await supabase.from('clients').insert(payload).select().single();
                  if (error) throw error;
                  successCount++;
                  if (insertedClient && insertedClient.email) {
                      newRecipients.push({ id: insertedClient.id, name: insertedClient.name, email: insertedClient.email });
                  }
              } catch (err) { errors++; }
          }

          if (newRecipients.length > 0) {
              try {
                  await supabase.functions.invoke('send-emails', {
                      body: { type: 'welcome', recipients: newRecipients, origin: window.location.origin }
                  });
              } catch (mailErr) { console.error(mailErr); }
          }

          setLoading(false);
          setToast({ message: `Importação concluída: ${successCount} salvos.`, type: 'success' });
          fetchClients(clinicId);
          if (fileInputRef.current) fileInputRef.current.value = "";
      };
      
      reader.readAsBinaryString(file);
  };

  const filteredClients = clients
    .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.cpf && c.cpf.includes(searchTerm)))
    .sort((a, b) => sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  if (loading && !processing && clients.length === 0) {
      return (
        <div className="flex h-96 w-full items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold text-white">Pacientes</h1>
            <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors"><HelpCircle size={20} /></button>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleDownloadTemplate} className="flex items-center justify-center px-4 py-2 bg-gray-900 border border-white/10 text-gray-300 rounded hover:bg-gray-800 transition shadow-sm font-bold text-sm">
                <Download size={16} className="mr-2" /> Modelo
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center px-4 py-2 bg-gray-900 border border-white/10 text-gray-300 rounded hover:bg-gray-800 transition shadow-sm font-bold text-sm">
                <Upload size={16} className="mr-2" /> Importar Excel
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            
            <button onClick={() => handleOpenModal()} className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold text-sm">
                <Plus size={16} className="mr-2" /> Novo
            </button>
        </div>
      </div>

      <div className="bg-gray-900/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-white/5 mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou CPF..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:ring-primary outline-none placeholder-gray-500 hover:bg-gray-750 transition"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <select 
                className="border border-white/10 rounded-lg px-4 py-2 bg-gray-800 text-sm text-gray-200 focus:ring-primary outline-none w-full sm:w-auto hover:bg-gray-750 cursor-pointer"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
                <option value="asc">Nome (A-Z)</option>
                <option value="desc">Nome (Z-A)</option>
            </select>
            <button className="border border-white/10 rounded-lg px-4 py-2 bg-gray-800 text-sm font-bold text-gray-300 hover:bg-gray-700 flex items-center whitespace-nowrap">
                <Calendar size={16} className="mr-2"/> Com Retorno
            </button>
        </div>
      </div>

      {/* VIEW LISTA */}
      <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-lg border border-white/5 overflow-hidden">
        {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
                <User size={48} className="mx-auto mb-2 opacity-20"/>
                <p>Nenhum paciente encontrado.</p>
            </div>
        ) : (
            <div className="divide-y divide-white/5">
                {filteredClients.map(client => (
                    <div key={client.id} className="p-4 hover:bg-gray-800/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                            <h3 
                                onClick={() => handleOpenModal(client)}
                                className="font-bold text-white text-lg cursor-pointer hover:text-primary transition truncate"
                            >
                                {client.name}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                {client.whatsapp || 'Sem telefone'} 
                                <span className="text-gray-700">|</span> 
                                {client.cpf || 'Sem CPF'}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-gray-500 self-end sm:self-center">
                            {/* Actions Group */}
                            <button className="flex flex-col items-center group" title="Receita">
                                <div className="p-2 rounded-lg bg-gray-800/50 border border-white/5 group-hover:bg-blue-500/10 text-gray-400 group-hover:text-blue-400 transition">
                                    <FileText size={18} />
                                </div>
                                <span className="text-[10px] mt-1 hidden sm:block text-gray-500 group-hover:text-gray-300">Receita</span>
                            </button>
                            
                            <button 
                                className="flex flex-col items-center group" 
                                title="Prontuário"
                                onClick={() => navigate('/dashboard/smart-record')}
                            >
                                <div className="p-2 rounded-lg bg-gray-800/50 border border-white/5 group-hover:bg-purple-500/10 text-gray-400 group-hover:text-purple-400 transition">
                                    <ClipboardList size={18} />
                                </div>
                                <span className="text-[10px] mt-1 hidden sm:block text-gray-500 group-hover:text-gray-300">Prontuário</span>
                            </button>

                            <button className="flex flex-col items-center group" title="Arquivos">
                                <div className="p-2 rounded-lg bg-gray-800/50 border border-white/5 group-hover:bg-yellow-500/10 text-gray-400 group-hover:text-yellow-400 transition">
                                    <Folder size={18} />
                                </div>
                                <span className="text-[10px] mt-1 hidden sm:block text-gray-500 group-hover:text-gray-300">Arquivos</span>
                            </button>

                            <div className="w-px h-8 bg-gray-800 mx-2 hidden sm:block"></div>

                            <button 
                                onClick={() => handleOpenModal(client)} 
                                className="text-gray-500 hover:text-blue-400 transition p-2"
                                title="Editar"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button 
                                onClick={() => setDeleteId(client.id)} 
                                className="text-gray-500 hover:text-red-400 transition p-2"
                                title="Excluir"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white">
                {editingClient ? 'Editar Paciente' : 'Novo Paciente'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo *</label>
                    <input required className="w-full border border-gray-700 bg-gray-800 text-white rounded p-2 focus:ring-primary focus:border-primary outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">WhatsApp</label>
                        <input className="w-full border border-gray-700 bg-gray-800 text-white rounded p-2 focus:ring-primary outline-none" value={formData.whatsapp} onChange={e => {
                            let v = e.target.value.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15);
                            setFormData({...formData, whatsapp: v});
                        }} maxLength={15} placeholder="(00) 00000-0000" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF</label>
                        <input className="w-full border border-gray-700 bg-gray-800 text-white rounded p-2 focus:ring-primary outline-none" value={formData.cpf} onChange={e => {
                            let v = e.target.value.replace(/\D/g, '');
                            if (v.length > 11) v = v.slice(0, 11);
                            v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                            setFormData({...formData, cpf: v});
                        }} maxLength={14} placeholder="000.000.000-00" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail</label>
                    <input type="email" className="w-full border border-gray-700 bg-gray-800 text-white rounded p-2 focus:ring-primary outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@paciente.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Nascimento</label>
                        <input type="date" className="w-full border border-gray-700 bg-gray-800 text-white rounded p-2 focus:ring-primary outline-none" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Endereço</label>
                    <input className="w-full border border-gray-700 bg-gray-800 text-white rounded p-2 focus:ring-primary outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Rua, Número, Bairro, Cidade" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Anotações Clínicas</label>
                    <textarea className="w-full border border-gray-700 bg-gray-800 text-white rounded p-2 h-20 resize-none focus:ring-primary outline-none" value={formData.clinical_notes} onChange={e => setFormData({...formData, clinical_notes: e.target.value})} placeholder="Histórico, alergias, observações..." />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/10 mt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded font-bold transition">Cancelar</button>
                    <button type="submit" disabled={processing} className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 transition shadow-md flex items-center disabled:opacity-50">
                        {processing ? <Loader2 className="animate-spin mr-2"/> : 'Salvar Paciente'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-100 p-3 rounded-full inline-block mb-4">
                <Trash2 className="text-red-600" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Paciente?</h3>
             <p className="text-gray-600 mb-6 text-sm">
               Tem certeza que deseja remover este paciente? Todo o histórico será perdido.
             </p>
             <div className="flex space-x-3 w-full">
                <button 
                  onClick={() => setDeleteId(null)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg shadow-red-200 flex items-center justify-center"
                >
                  {processing ? <Loader2 className="animate-spin" size={20}/> : 'Sim, Excluir'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="text-xl font-bold flex items-center text-white gap-2"><HelpCircle className="text-primary"/> Gestão de Pacientes</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-400">
                <p>Aqui você centraliza o cadastro dos seus pacientes.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Ações Rápidas:</strong> Use os botões ao lado do nome para emitir receitas, ver o prontuário ou acessar arquivos anexos.</li>
                   <li><strong>Importar Excel:</strong> Traga sua base de dados antiga. A planilha deve ter colunas na ordem: Nome, Email, WhatsApp, CPF, Data Nasc (DD/MM/AAAA), Endereço, Obs.</li>
                   <li><strong>Busca:</strong> Localize rapidamente por nome ou CPF.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
