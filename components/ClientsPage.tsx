
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Client, ClinicalRecord } from '../types';
import { 
  Plus, Edit2, Trash2, Search, X, Loader2, User, Phone, Mail, 
  Calendar, FileText, Folder, Upload, Download, CheckCircle, 
  ClipboardList, Printer, Eye
} from 'lucide-react';
import Toast, { ToastType } from './Toast';
import { useDashboard } from './DashboardLayout';
import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';

interface FileObject {
  name: string;
  id: string; // ou created_at / metadata para key
  updated_at: string;
  metadata: any;
}

const ClientsPage: React.FC = () => {
  const { userProfile } = useDashboard() || {};
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais Principais (CRUD Paciente)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Modais de Ação (Novos)
  const [actionClient, setActionClient] = useState<Client | null>(null);
  const [activeActionModal, setActiveActionModal] = useState<'prescription' | 'records' | 'files' | null>(null);
  
  // Dados Auxiliares para Modais
  const [clientRecords, setClientRecords] = useState<ClinicalRecord[]>([]);
  const [clientFiles, setClientFiles] = useState<FileObject[]>([]);
  const [loadingAux, setLoadingAux] = useState(false);
  
  // Estado para Receita
  const [prescriptionText, setPrescriptionText] = useState('');

  // Estado para Novo Prontuário Rápido
  const [newRecordText, setNewRecordText] = useState('');

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State (CRUD)
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

  // --- AÇÕES DOS NOVOS MODAIS ---

  const openActionModal = async (client: Client, type: 'prescription' | 'records' | 'files') => {
      setActionClient(client);
      setActiveActionModal(type);
      
      if (type === 'records') {
          fetchRecords(client.id);
      } else if (type === 'files') {
          fetchFiles(client.id);
      } else if (type === 'prescription') {
          setPrescriptionText(`Receituário\n\nPaciente: ${client.name}\n\nUso Oral:\n\n1. ________________________\n   Tomar 1 comprimido de 8 em 8 horas por 3 dias.\n\n\nData: ${new Date().toLocaleDateString('pt-BR')}`);
      }
  };

  const fetchRecords = async (clientId: string) => {
      setLoadingAux(true);
      const { data } = await supabase
          .from('clinical_records')
          .select('*, dentist:dentists(name)')
          .eq('client_id', clientId)
          .order('date', { ascending: false });
      if (data) setClientRecords(data as unknown as ClinicalRecord[]);
      setLoadingAux(false);
  };

  const saveQuickRecord = async () => {
      if (!newRecordText.trim() || !actionClient || !userProfile?.clinic_id) return;
      setProcessing(true);
      try {
          const { error } = await supabase.from('clinical_records').insert({
              clinic_id: userProfile.clinic_id,
              client_id: actionClient.id,
              date: new Date().toISOString().split('T')[0],
              description: newRecordText,
              created_at: new Date().toISOString()
          });
          if (error) throw error;
          setToast({ message: "Anotação salva!", type: 'success' });
          setNewRecordText('');
          fetchRecords(actionClient.id);
      } catch (err: any) {
          setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
      } finally {
          setProcessing(false);
      }
  };

  const fetchFiles = async (clientId: string) => {
      if (!userProfile?.clinic_id) return;
      setLoadingAux(true);
      const folderPath = `${userProfile.clinic_id}/${clientId}`;
      const { data, error } = await supabase.storage.from('patient-files').list(folderPath);
      if (error) {
          console.error("Erro storage:", error);
      } else {
          setClientFiles(data as any[] || []);
      }
      setLoadingAux(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !actionClient || !userProfile?.clinic_id) return;
      const file = e.target.files[0];
      
      setProcessing(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${userProfile.clinic_id}/${actionClient.id}/${fileName}`;
          
          const { error } = await supabase.storage.from('patient-files').upload(filePath, file);
          if (error) throw error;
          
          setToast({ message: "Arquivo enviado!", type: 'success' });
          fetchFiles(actionClient.id);
      } catch (err: any) {
          setToast({ message: "Erro upload: " + err.message, type: 'error' });
      } finally {
          setProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleFileDelete = async (fileName: string) => {
      if (!actionClient || !userProfile?.clinic_id) return;
      if (!window.confirm("Excluir este arquivo permanentemente?")) return;
      
      setProcessing(true);
      try {
          const filePath = `${userProfile.clinic_id}/${actionClient.id}/${fileName}`;
          const { error } = await supabase.storage.from('patient-files').remove([filePath]);
          if (error) throw error;
          setToast({ message: "Arquivo removido.", type: 'success' });
          fetchFiles(actionClient.id);
      } catch (err: any) {
          setToast({ message: "Erro ao excluir: " + err.message, type: 'error' });
      } finally {
          setProcessing(false);
      }
  };

  const downloadFile = async (fileName: string) => {
      if (!actionClient || !userProfile?.clinic_id) return;
      const filePath = `${userProfile.clinic_id}/${actionClient.id}/${fileName}`;
      const { data } = supabase.storage.from('patient-files').getPublicUrl(filePath);
      // Para arquivos privados, seria createSignedUrl, mas vamos usar PublicUrl assumindo bucket publico ou signedUrl flow se fosse strict private
      // Como configuramos RLS mas não public, vamos usar download direto via blob
      
      try {
          const { data: blob, error } = await supabase.storage.from('patient-files').download(filePath);
          if (error) throw error;
          if (blob) {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName; // ou nome original se tiver guardado
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              a.remove();
          }
      } catch (e) {
          console.error("Download fail:", e);
          setToast({ message: "Erro ao baixar arquivo.", type: 'error' });
      }
  };

  const generatePDF = () => {
      if (!actionClient) return;
      const doc = new jsPDF();
      
      // Header Simples
      doc.setFontSize(18);
      doc.text("RECEITUÁRIO", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(userProfile?.clinics?.name || "Clínica Odontológica", 105, 30, { align: "center" });
      
      doc.line(20, 35, 190, 35);
      
      // Conteúdo
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(prescriptionText, 170);
      doc.text(splitText, 20, 50);
      
      // Footer
      doc.line(20, 270, 190, 270);
      doc.setFontSize(10);
      doc.text("Assinatura / Carimbo", 105, 280, { align: "center" });
      
      doc.save(`Receita_${actionClient.name.replace(/\s+/g, '_')}.pdf`);
      setToast({ message: "PDF gerado!", type: 'success' });
  };

  // --- FIM AÇÕES ---

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
                          
                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                              <div className="flex gap-1">
                                  <button onClick={() => openActionModal(client, 'prescription')} className="p-1.5 bg-gray-800 border border-white/5 rounded text-gray-400 hover:text-blue-400 hover:bg-gray-700 transition" title="Receita">
                                      <FileText size={16}/>
                                  </button>
                                  <button onClick={() => openActionModal(client, 'records')} className="p-1.5 bg-gray-800 border border-white/5 rounded text-gray-400 hover:text-green-400 hover:bg-gray-700 transition" title="Prontuário">
                                      <ClipboardList size={16}/>
                                  </button>
                                  <button onClick={() => openActionModal(client, 'files')} className="p-1.5 bg-gray-800 border border-white/5 rounded text-gray-400 hover:text-yellow-400 hover:bg-gray-700 transition" title="Arquivos">
                                      <Folder size={16}/>
                                  </button>
                              </div>
                              <div className="flex gap-1">
                                  <button onClick={() => handleOpenModal(client)} className="p-1.5 text-gray-500 hover:text-blue-400 transition" title="Editar">
                                      <Edit2 size={16}/>
                                  </button>
                                  <button onClick={() => setDeleteId(client.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition" title="Excluir">
                                      <Trash2 size={16}/>
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* --- MODAIS DE AÇÃO --- */}

      {/* 1. RECEITA MODAL */}
      {activeActionModal === 'prescription' && actionClient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText size={20} className="text-blue-400"/> Receituário</h2>
                      <button onClick={() => { setActiveActionModal(null); setActionClient(null); }} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  <div className="flex-1 flex flex-col bg-white rounded-lg p-1 text-gray-900 overflow-hidden">
                      <textarea 
                          className="flex-1 w-full p-4 outline-none resize-none font-mono text-sm"
                          value={prescriptionText}
                          onChange={(e) => setPrescriptionText(e.target.value)}
                      />
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                      <button onClick={generatePDF} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex items-center shadow-lg">
                          <Printer size={18} className="mr-2"/> Imprimir / PDF
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 2. PRONTUÁRIO MODAL */}
      {activeActionModal === 'records' && actionClient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardList size={20} className="text-green-400"/> Prontuário: {actionClient.name}</h2>
                      <button onClick={() => { setActiveActionModal(null); setActionClient(null); }} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 space-y-4 pr-2">
                      {loadingAux ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-primary"/></div> : 
                       clientRecords.length === 0 ? <div className="text-center py-10 text-gray-500">Nenhum registro encontrado.</div> :
                       clientRecords.map((rec) => (
                          <div key={rec.id} className="bg-gray-800/50 p-4 rounded-lg border border-white/5">
                              <div className="flex justify-between text-xs text-gray-400 mb-2 font-bold uppercase">
                                  <span>{format(parseISO(rec.date), 'dd/MM/yyyy')}</span>
                                  <span>{rec.dentist?.name || '---'}</span>
                              </div>
                              <p className="text-sm text-gray-300 whitespace-pre-wrap">{rec.description}</p>
                          </div>
                       ))
                      }
                  </div>

                  <div className="pt-4 border-t border-white/10">
                      <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Adicionar Anotação Rápida</label>
                      <div className="flex gap-2">
                          <textarea 
                              className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary text-sm resize-none"
                              rows={2}
                              value={newRecordText}
                              onChange={(e) => setNewRecordText(e.target.value)}
                              placeholder="Descreva o procedimento..."
                          />
                          <button onClick={saveQuickRecord} disabled={processing || !newRecordText.trim()} className="px-4 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50 flex items-center">
                              {processing ? <Loader2 className="animate-spin"/> : <Plus size={20}/>}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 3. ARQUIVOS MODAL */}
      {activeActionModal === 'files' && actionClient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Folder size={20} className="text-yellow-400"/> Arquivos: {actionClient.name}</h2>
                      <button onClick={() => { setActiveActionModal(null); setActionClient(null); }} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>

                  <div className="flex justify-end mb-4">
                      <div className="relative">
                          <input 
                              type="file" 
                              className="hidden" 
                              id="file-upload" 
                              onChange={handleFileUpload}
                              disabled={processing}
                              ref={fileInputRef}
                          />
                          <label htmlFor="file-upload" className={`flex items-center px-4 py-2 bg-gray-800 border border-gray-600 rounded cursor-pointer hover:bg-gray-700 text-white text-sm font-bold transition ${processing ? 'opacity-50 pointer-events-none' : ''}`}>
                              {processing ? <Loader2 className="animate-spin mr-2" size={16}/> : <Upload className="mr-2" size={16}/>} 
                              Upload Arquivo
                          </label>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-800/30 rounded-lg p-2 border border-white/5">
                      {loadingAux ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-primary"/></div> :
                       clientFiles.length === 0 ? <div className="text-center py-10 text-gray-500">Nenhum arquivo.</div> :
                       <table className="w-full text-left text-sm text-gray-300">
                           <thead className="text-xs uppercase bg-gray-800 text-gray-500 font-bold">
                               <tr><th className="p-3">Nome</th><th className="p-3 text-right">Ações</th></tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                               {clientFiles.map((file) => (
                                   <tr key={file.id} className="hover:bg-gray-700/50">
                                       <td className="p-3 truncate max-w-[200px]">{file.name}</td>
                                       <td className="p-3 text-right flex justify-end gap-2">
                                           <button onClick={() => downloadFile(file.name)} className="p-1.5 bg-gray-800 rounded hover:text-blue-400 transition" title="Baixar"><Download size={16}/></button>
                                           <button onClick={() => handleFileDelete(file.name)} className="p-1.5 bg-gray-800 rounded hover:text-red-400 transition" title="Excluir"><Trash2 size={16}/></button>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                      }
                  </div>
              </div>
          </div>
      )}

      {/* Modal Form (CRUD) */}
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
