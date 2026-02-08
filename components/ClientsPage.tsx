
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Client } from '../types';
import { Plus, Edit2, Trash2, Search, X, Loader2, User, Phone, Mail, MapPin, Calendar, FileText } from 'lucide-react';
import Toast, { ToastType } from './Toast';
import { useDashboard } from './DashboardLayout';
import { format, parseISO } from 'date-fns';

const ClientsPage: React.FC = () => {
  const { userProfile } = useDashboard() || {};
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      whatsapp: '',
      cpf: '',
      address: '',
      birth_date: '',
      clinical_notes: ''
  });

  useEffect(() => {
    if (userProfile?.clinic_id) {
        fetchClients();
    }
  }, [userProfile?.clinic_id]);

  const fetchClients = async () => {
    if (!userProfile?.clinic_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('clinic_id', userProfile.clinic_id)
      .order('name');
    
    if (error) {
        setToast({ message: 'Erro ao carregar pacientes: ' + error.message, type: 'error' });
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
          setEditingClient(null);
          setFormData({
              name: '',
              email: '',
              whatsapp: '',
              cpf: '',
              address: '',
              birth_date: '',
              clinical_notes: ''
          });
      }
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userProfile?.clinic_id) return;

      if (!formData.name || !formData.cpf || !formData.birth_date) {
          setToast({ message: "Preencha os campos obrigatórios (*)", type: 'warning' });
          return;
      }

      setProcessing(true);
      try {
          const payload = {
              clinic_id: userProfile.clinic_id,
              name: formData.name,
              email: formData.email,
              whatsapp: formData.whatsapp,
              cpf: formData.cpf,
              address: formData.address,
              birth_date: formData.birth_date,
              clinical_notes: formData.clinical_notes
          };

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
          fetchClients();
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
          fetchClients();
      } catch (err: any) {
          setToast({ message: "Erro ao remover: " + err.message, type: 'error' });
      } finally {
          setProcessing(false);
      }
  };

  const filteredClients = clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.cpf && c.cpf.includes(searchTerm))
  );

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User size={24} className="text-primary"/> Pacientes
            <span className="text-sm font-normal bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-white/10">
                {clients.length}
            </span>
        </h1>
        <button onClick={() => handleOpenModal()} className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold w-full sm:w-auto">
            <Plus size={18} className="mr-2" /> Novo Paciente
        </button>
      </div>

      <div className="bg-gray-900/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-white/5 mb-6">
          <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
              <input 
                  type="text" 
                  placeholder="Buscar por nome ou CPF..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary outline-none placeholder-gray-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
      </div>

      <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-lg border border-white/5 overflow-hidden">
          {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>
          ) : filteredClients.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                  <User className="mx-auto mb-3 opacity-20" size={48}/>
                  <p>Nenhum paciente encontrado.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {filteredClients.map(client => (
                      <div key={client.id} className="bg-gray-800/50 border border-white/5 hover:border-white/20 rounded-xl p-4 flex flex-col justify-between transition-all group">
                          <div>
                              <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold text-lg">
                                          {client.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                          <h3 className="font-bold text-white text-base truncate max-w-[150px]" title={client.name}>{client.name}</h3>
                                          <p className="text-xs text-gray-500 font-mono">{client.cpf || 'Sem CPF'}</p>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="space-y-2 text-sm text-gray-400 mb-4">
                                  <div className="flex items-center gap-2">
                                      <Phone size={14} className="text-gray-600"/> {client.whatsapp || '---'}
                                  </div>
                                  <div className="flex items-center gap-2 truncate" title={client.email || ''}>
                                      <Mail size={14} className="text-gray-600"/> {client.email || '---'}
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <Calendar size={14} className="text-gray-600"/> 
                                      {client.birth_date ? format(parseISO(client.birth_date), 'dd/MM/yyyy') : '---'}
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                              <button onClick={() => handleOpenModal(client)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded transition" title="Editar">
                                  <Edit2 size={16}/>
                              </button>
                              <button onClick={() => setDeleteId(client.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition" title="Excluir">
                                  <Trash2 size={16}/>
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                      <h2 className="text-xl font-bold text-white">{editingClient ? 'Editar Paciente' : 'Novo Paciente'}</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  
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
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF *</label>
                              <input required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} placeholder="000.000.000-00"/>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail</label>
                              <input type="email" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Nascimento *</label>
                              <input required type="date" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Endereço</label>
                          <input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Anamnese / Notas Clínicas</label>
                          <textarea 
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary h-24 resize-none" 
                            value={formData.clinical_notes} 
                            onChange={e => setFormData({...formData, clinical_notes: e.target.value})} 
                            placeholder="Histórico médico, alergias, queixa principal..."
                          />
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white font-bold transition">Cancelar</button>
                          <button type="submit" disabled={processing} className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 flex items-center shadow-md">
                              {processing ? <Loader2 className="animate-spin mr-2"/> : 'Salvar'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-900/20 p-3 rounded-full inline-block mb-4"><Trash2 className="text-red-500" size={32} /></div>
             <h3 className="text-lg font-bold text-white mb-2">Excluir Paciente?</h3>
             <p className="text-gray-400 mb-6 text-sm">Tem certeza que deseja remover este paciente? Todo o histórico será perdido.</p>
             <div className="flex space-x-3 w-full">
                <button onClick={() => setDeleteId(null)} disabled={processing} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 font-bold transition">Cancelar</button>
                <button onClick={handleDelete} disabled={processing} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg">{processing ? <Loader2 className="animate-spin" size={20}/> : 'Sim, Excluir'}</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
