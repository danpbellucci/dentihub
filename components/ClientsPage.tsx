import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Client } from '../types';
import { 
  User, Plus, Search, Edit2, Trash2, FileText, ClipboardList, Folder, 
  X, Loader2, HelpCircle 
} from 'lucide-react';
import Toast, { ToastType } from './Toast';
import { useDashboard } from './DashboardLayout';

const ClientsPage: React.FC = () => {
  const { userProfile } = useDashboard() || {};
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (userProfile?.clinic_id) {
        fetchClients();
    }
  }, [userProfile?.clinic_id]);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('clinic_id', userProfile?.clinic_id)
        .order('name');
    
    if (error) {
        setToast({ message: 'Erro ao carregar pacientes.', type: 'error' });
    } else {
        setClients(data as Client[]);
    }
    setLoading(false);
  };

  const filteredClients = clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.cpf && c.cpf.includes(searchTerm)) ||
      (c.whatsapp && c.whatsapp.includes(searchTerm))
  );

  const handleOpenModal = (client?: Client) => {
      setEditingClient(client || null);
      setIsModalOpen(true);
  };

  const handleDelete = async () => {
      if (!deleteId) return;
      setProcessing(true);
      try {
          const { error } = await supabase.from('clients').delete().eq('id', deleteId);
          if (error) throw error;
          setToast({ message: 'Paciente removido.', type: 'success' });
          fetchClients();
      } catch (err: any) {
          setToast({ message: 'Erro ao remover: ' + err.message, type: 'error' });
      } finally {
          setProcessing(false);
          setDeleteId(null);
      }
  };

  const handleSuccess = () => {
      setIsModalOpen(false);
      setToast({ message: editingClient ? 'Paciente atualizado!' : 'Paciente cadastrado!', type: 'success' });
      fetchClients();
  };

  // Actions placeholders
  const handleOpenPrescription = (client: Client) => {
      setToast({ message: `Receitas para ${client.name} (Em breve)`, type: 'info' });
  };
  
  const handleOpenRecords = (client: Client) => {
      setToast({ message: `Prontuário de ${client.name} (Em breve)`, type: 'info' });
  };

  const handleOpenFiles = (client: Client) => {
      setToast({ message: `Arquivos de ${client.name} (Em breve)`, type: 'info' });
  };

  // Form for Modal
  const ClientForm = ({ client, onSuccess, onCancel }: { client: Client | null, onSuccess: () => void, onCancel: () => void }) => {
      const [formData, setFormData] = useState({
          name: client?.name || '',
          email: client?.email || '',
          whatsapp: client?.whatsapp || '',
          cpf: client?.cpf || '',
          address: client?.address || '',
          birth_date: client?.birth_date || ''
      });
      const [saving, setSaving] = useState(false);

      const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setSaving(true);
          try {
              const payload = { ...formData, clinic_id: userProfile?.clinic_id };
              if (client) {
                  await supabase.from('clients').update(payload).eq('id', client.id);
              } else {
                  await supabase.from('clients').insert(payload);
              }
              onSuccess();
          } catch (err: any) {
              setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
          } finally {
              setSaving(false);
          }
      };

      return (
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo *</label>
                  <input required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">WhatsApp</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="(00) 00000-0000"/>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} placeholder="000.000.000-00"/>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail</label>
                      <input type="email" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Nascimento</label>
                      <input type="date" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Endereço</label>
                  <input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white font-bold transition">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 flex items-center shadow-md">
                      {saving ? <Loader2 className="animate-spin mr-2"/> : 'Salvar'}
                  </button>
              </div>
          </form>
      );
  };

  return (
    <div className="pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Pacientes</h1>
            <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors"><HelpCircle size={20} /></button>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold w-full sm:w-auto">
            <Plus size={18} className="mr-2" /> Novo Paciente
        </button>
      </div>

      <div className="bg-gray-900/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-white/5 mb-6">
          <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
              <input 
                  type="text" 
                  placeholder="Buscar por nome, CPF ou telefone..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
      </div>

      {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32}/></div>
      ) : (
          /* VIEW LISTA */
          <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-lg border border-white/5 overflow-hidden">
            {filteredClients.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <User size={48} className="mx-auto mb-2 opacity-20"/>
                    <p>Nenhum paciente encontrado.</p>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {filteredClients.map(client => (
                        <div key={client.id} className="p-4 hover:bg-gray-800/50 transition-colors flex flex-col lg:flex-row justify-between items-center gap-4">
                            <div className="flex-1 w-full lg:w-auto">
                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <h3 
                                        onClick={() => handleOpenModal(client)}
                                        className="font-bold text-white text-lg cursor-pointer hover:text-primary transition truncate"
                                    >
                                        {client.name}
                                    </h3>
                                    <div className="text-sm text-gray-500 flex items-center">
                                        <span className="truncate">{client.whatsapp || 'Sem telefone'}</span>
                                        <span className="text-gray-700 mx-2">|</span> 
                                        <span className="truncate">{client.cpf || 'Sem CPF'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-gray-500 w-full lg:w-auto justify-between lg:justify-end">
                                {/* Actions Group */}
                                <div className="flex gap-2 sm:gap-4 justify-center flex-1 sm:flex-none">
                                    <button className="flex flex-col items-center group min-w-[60px]" title="Receita" onClick={() => handleOpenPrescription(client)}>
                                        <div className="p-2 rounded-lg bg-gray-800/50 border border-white/5 group-hover:bg-blue-500/10 text-gray-400 group-hover:text-blue-400 transition">
                                            <FileText size={18} />
                                        </div>
                                        <span className="text-[10px] mt-1 text-gray-500 group-hover:text-gray-300">Receita</span>
                                    </button>
                                    
                                    <button className="flex flex-col items-center group min-w-[60px]" title="Prontuário" onClick={() => handleOpenRecords(client)}>
                                        <div className="p-2 rounded-lg bg-gray-800/50 border border-white/5 group-hover:bg-purple-500/10 text-gray-400 group-hover:text-purple-400 transition">
                                            <ClipboardList size={18} />
                                        </div>
                                        <span className="text-[10px] mt-1 text-gray-500 group-hover:text-gray-300">Prontuário</span>
                                    </button>

                                    <button className="flex flex-col items-center group min-w-[60px]" title="Arquivos" onClick={() => handleOpenFiles(client)}>
                                        <div className="p-2 rounded-lg bg-gray-800/50 border border-white/5 group-hover:bg-yellow-500/10 text-gray-400 group-hover:text-yellow-400 transition">
                                            <Folder size={18} />
                                        </div>
                                        <span className="text-[10px] mt-1 text-gray-500 group-hover:text-gray-300">Arquivos</span>
                                    </button>
                                </div>

                                <div className="w-px h-8 bg-gray-800 mx-2 hidden sm:block"></div>

                                <div className="flex gap-1">
                                    <button onClick={() => handleOpenModal(client)} className="text-gray-500 hover:text-blue-400 transition p-2" title="Editar">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => setDeleteId(client.id)} className="text-gray-500 hover:text-red-400 transition p-2" title="Excluir">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
      )}

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-lg">
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                      <h2 className="text-xl font-bold text-white">{editingClient ? 'Editar Paciente' : 'Novo Paciente'}</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  <ClientForm client={editingClient} onSuccess={handleSuccess} onCancel={() => setIsModalOpen(false)} />
              </div>
          </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-900/20 p-3 rounded-full inline-block mb-4"><Trash2 className="text-red-500" size={32} /></div>
             <h3 className="text-lg font-bold text-white mb-2">Excluir Paciente?</h3>
             <p className="text-gray-400 mb-6 text-sm">Tem certeza que deseja remover este paciente e todos os seus dados?</p>
             <div className="flex space-x-3 w-full">
                <button onClick={() => setDeleteId(null)} disabled={processing} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 font-bold transition">Cancelar</button>
                <button onClick={handleDelete} disabled={processing} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg">{processing ? <Loader2 className="animate-spin" size={20}/> : 'Sim, Excluir'}</button>
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
                <p>Aqui você gerencia todos os pacientes da clínica.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Cadastro:</strong> Adicione novos pacientes clicando no botão "Novo Paciente".</li>
                   <li><strong>Busca:</strong> Utilize a barra de pesquisa para encontrar rapidamente por nome, CPF ou telefone.</li>
                   <li><strong>Ações:</strong> Acesse receitas, prontuários e arquivos diretamente na lista.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;