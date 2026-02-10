
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Client, Dentist } from '../types';
import { useDashboard } from './DashboardLayout';
import { 
  Users, Search, Plus, Edit2, Trash2, Phone, Mail, FileText, 
  CheckCircle, Loader2, Upload, Download, X, ClipboardList, 
  FolderOpen, Printer, Send, Save, Image as ImageIcon, AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import { validateCPF } from '../utils/validators';
import Toast, { ToastType } from './Toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ClientsPage: React.FC = () => {
  const { userProfile } = useDashboard() || {};
  const [clients, setClients] = useState<Client[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [clinicData, setClinicData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Action Modals State
  const [actionModal, setActionModal] = useState<{ type: 'prescription' | 'records' | 'files' | null, client: Client | null }>({ type: null, client: null });
  
  // Prescription State
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');

  // Records State
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [newRecordText, setNewRecordText] = useState('');

  // Files State
  const [patientFiles, setPatientFiles] = useState<any[]>([]);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  // CRUD Client Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    cpf: '',
    address: '',
    birth_date: '',
    clinical_notes: ''
  });

  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ show: boolean; successCount: number; errorCount: number; errors: string[] }>({ show: false, successCount: 0, errorCount: 0, errors: [] });

  useEffect(() => {
    if (userProfile?.clinic_id) {
        fetchClients();
        fetchDentists();
        fetchClinicData();
    }
  }, [userProfile?.clinic_id]);

  const fetchClinicData = async () => {
      const { data } = await supabase.from('clinics').select('*').eq('id', userProfile?.clinic_id).single();
      setClinicData(data);
  };

  const fetchDentists = async () => {
      const { data } = await supabase.from('dentists').select('*').eq('clinic_id', userProfile?.clinic_id).order('name');
      if (data) setDentists(data as Dentist[]);
  };

  const fetchClients = async () => {
    if (!userProfile?.clinic_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('clinic_id', userProfile.clinic_id)
      .order('name');
    
    if (error) {
        setToast({ message: "Erro ao carregar pacientes.", type: 'error' });
    } else {
        setClients(data as Client[]);
    }
    setLoading(false);
  };

  // --- ACTIONS HANDLERS ---

  const handleOpenAction = async (type: 'prescription' | 'records' | 'files', client: Client) => {
      // Regra: Arquivos apenas para Starter/Pro/Enterprise (não Free)
      if (type === 'files') {
          const tier = userProfile?.clinics?.subscription_tier || 'free';
          if (tier === 'free') {
              setToast({ message: "Gestão de arquivos disponível apenas nos planos Starter e Pro.", type: 'warning' });
              return;
          }
          fetchFiles(client.id);
      }

      if (type === 'records') {
          fetchRecords(client.id);
      }

      setActionModal({ type, client });
      setPrescriptionText('');
      setNewRecordText('');
      setSelectedDentistId(''); // Reset selection
  };

  // --- RECORDS LOGIC ---
  const fetchRecords = async (clientId: string) => {
      const { data } = await supabase
          .from('clinical_records')
          .select('*, dentist:dentists(name)')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
      setPatientRecords(data || []);
  };

  const handleSaveRecord = async () => {
      if (!newRecordText || !selectedDentistId || !actionModal.client) {
          setToast({ message: "Selecione o dentista e escreva o prontuário.", type: 'warning' });
          return;
      }
      setProcessing(true);
      try {
          const { error } = await supabase.from('clinical_records').insert({
              clinic_id: userProfile?.clinic_id,
              client_id: actionModal.client.id,
              dentist_id: selectedDentistId,
              description: newRecordText,
              date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString()
          });
          if (error) throw error;
          setToast({ message: "Prontuário salvo!", type: 'success' });
          setNewRecordText('');
          fetchRecords(actionModal.client.id);
      } catch (err: any) {
          setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
      } finally {
          setProcessing(false);
      }
  };

  // --- PRESCRIPTION LOGIC ---
  const handleGeneratePDF = async (sendEmail = false) => {
      if (!selectedDentistId || !prescriptionText || !actionModal.client) {
          setToast({ message: "Selecione o dentista e preencha a receita.", type: 'warning' });
          return;
      }

      const dentist = dentists.find(d => d.id === selectedDentistId);
      const doc = new jsPDF();
      const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

      // Header
      doc.setFontSize(18);
      doc.text(clinicData?.name || 'Clínica Odontológica', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(clinicData?.address || 'Endereço não cadastrado', 105, 28, { align: 'center' });
      doc.line(20, 35, 190, 35);

      // Body
      doc.setFontSize(14);
      doc.text(`PACIENTE: ${actionModal.client.name}`, 20, 50);
      
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(prescriptionText, 170);
      doc.text(splitText, 20, 70);

      // Footer
      doc.line(20, 250, 190, 250);
      doc.setFontSize(12);
      doc.text(dentist?.name || '', 105, 260, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`CRO: ${dentist?.cro || '---'}`, 105, 265, { align: 'center' });
      doc.text(dateStr, 105, 280, { align: 'center' });

      // Blob for Upload/Email
      const pdfBlob = doc.output('blob');

      if (sendEmail) {
          if (!actionModal.client.email) {
              setToast({ message: "Paciente sem e-mail cadastrado.", type: 'warning' });
              return;
          }
          setProcessing(true);
          try {
              const reader = new FileReader();
              reader.readAsDataURL(pdfBlob);
              reader.onloadend = async () => {
                  const base64data = (reader.result as string).split(',')[1];
                  
                  await supabase.functions.invoke('send-emails', {
                      body: {
                          type: 'prescription',
                          client: { name: actionModal.client?.name, email: actionModal.client?.email },
                          clinicName: clinicData?.name,
                          attachments: [{ content: base64data, filename: 'Receita.pdf' }]
                      }
                  });
                  setToast({ message: "Receita enviada por e-mail!", type: 'success' });
              };
          } catch (err) {
              console.error(err);
              setToast({ message: "Erro ao enviar e-mail.", type: 'error' });
          } finally {
              setProcessing(false);
          }
      } else {
          doc.save(`Receita_${actionModal.client.name}.pdf`);
      }

      // Save Record Automatically
      await supabase.from('clinical_records').insert({
          clinic_id: userProfile?.clinic_id,
          client_id: actionModal.client.id,
          dentist_id: selectedDentistId,
          description: `[RECEITA GERADA]\n${prescriptionText}`,
          date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
      });
  };

  // --- FILES LOGIC ---
  const fetchFiles = async (clientId: string) => {
      const { data } = await supabase.storage.from('patient-files').list(`${userProfile?.clinic_id}/${clientId}`);
      setPatientFiles(data || []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !actionModal.client) return;
      setProcessing(true);
      const file = e.target.files[0];
      // Path: clinic_id/client_id/timestamp_filename
      const filePath = `${userProfile?.clinic_id}/${actionModal.client.id}/${Date.now()}_${file.name}`;
      
      try {
          const { error } = await supabase.storage.from('patient-files').upload(filePath, file);
          if (error) throw error;
          setToast({ message: "Arquivo enviado!", type: 'success' });
          fetchFiles(actionModal.client.id);
      } catch (err: any) {
          setToast({ message: "Erro no upload: " + err.message, type: 'error' });
      } finally {
          setProcessing(false);
          if (fileUploadRef.current) fileUploadRef.current.value = '';
      }
  };

  const handleDeleteFile = async (fileName: string) => {
      if (!confirm("Excluir este arquivo?") || !actionModal.client) return;
      setProcessing(true);
      try {
          const { error } = await supabase.storage.from('patient-files').remove([`${userProfile?.clinic_id}/${actionModal.client.id}/${fileName}`]);
          if (error) throw error;
          setToast({ message: "Arquivo excluído.", type: 'success' });
          fetchFiles(actionModal.client.id);
      } catch (err: any) {
          setToast({ message: "Erro ao excluir: " + err.message, type: 'error' });
      } finally {
          setProcessing(false);
      }
  };

  // --- CRUD CLIENT ---

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
      setFormData({ name: '', email: '', whatsapp: '', cpf: '', address: '', birth_date: '', clinical_notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.clinic_id) return;
    
    if (formData.cpf && !validateCPF(formData.cpf)) {
        setToast({ message: "CPF inválido.", type: 'error' });
        return;
    }

    setProcessing(true);
    try {
        const payload = {
            clinic_id: userProfile.clinic_id,
            name: formData.name,
            email: formData.email || null,
            whatsapp: formData.whatsapp || null,
            cpf: formData.cpf || null,
            address: formData.address || null,
            birth_date: formData.birth_date || null,
            clinical_notes: formData.clinical_notes || null
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
          fetchClients();
      } catch (err: any) {
          setToast({ message: "Erro ao remover (verifique agendamentos vinculados).", type: 'error' });
      } finally {
          setProcessing(false);
          setDeleteId(null);
      }
  };

  // --- IMPORT ---
  const handleDownloadTemplate = () => {
      const ws = XLSX.utils.aoa_to_sheet([
          ["Nome Completo", "Email", "Telefone/WhatsApp", "CPF", "Data Nascimento (AAAA-MM-DD)", "Endereço"],
          ["João Silva", "joao@email.com", "11999999999", "000.000.000-00", "1990-01-01", "Rua A, 123"]
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo_Pacientes");
      XLSX.writeFile(wb, "Modelo_Importacao_Pacientes_DentiHub.xlsx");
  };

  const handleFileUploadImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!userProfile?.clinic_id) return;

      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          
          if (data.length <= 1) {
              setToast({ message: "Arquivo vazio ou inválido.", type: 'warning' });
              return;
          }

          setLoading(true);
          const rows = data.slice(1).filter(r => r[0]); 
          
          let successCount = 0;
          let errors: string[] = [];
          
          for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const payload = {
                  clinic_id: userProfile.clinic_id,
                  name: row[0],
                  email: row[1] || null,
                  whatsapp: row[2] ? row[2].toString() : null,
                  cpf: row[3] ? row[3].toString() : null,
                  birth_date: row[4] ? row[4].toString() : null,
                  address: row[5] || null
              };

              try {
                  if (!payload.name) throw new Error("Nome obrigatório.");
                  const { error } = await supabase.from('clients').insert(payload);
                  if (error) throw error;
                  successCount++;
              } catch (err: any) { 
                  errors.push(`Linha ${i + 2} (${row[0] || 'Sem Nome'}): ${err.message}`);
              }
          }

          setLoading(false);
          setImportResult({ show: true, successCount, errorCount: errors.length, errors });
          fetchClients();
          if (fileInputRef.current) fileInputRef.current.value = "";
      };
      
      reader.readAsBinaryString(file);
  };

  const filteredClients = clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.cpf && c.cpf.includes(searchTerm))
  );

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-primary" /> Pacientes
            <span className="text-sm font-normal bg-gray-800 text-gray-400 px-2.5 py-0.5 rounded-lg border border-white/10">
                {clients.length} <span className="text-gray-600">/</span> {userProfile?.clinics?.subscription_tier === 'pro' ? '∞' : userProfile?.clinics?.subscription_tier === 'starter' ? '100' : '30'}
            </span>
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleDownloadTemplate} className="hidden sm:flex items-center justify-center px-4 py-2 bg-gray-900 border border-white/10 text-gray-300 rounded hover:bg-gray-800 transition shadow-sm font-bold text-sm">
                <Download size={16} className="mr-2" /> Modelo
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="hidden sm:flex items-center justify-center px-4 py-2 bg-gray-900 border border-white/10 text-gray-300 rounded hover:bg-gray-800 transition shadow-sm font-bold text-sm">
                <Upload size={16} className="mr-2" /> Importar
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUploadImport} />

            <button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold text-sm">
                <Plus size={18} className="mr-2" /> Novo Paciente
            </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-900/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-white/5 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou CPF..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:ring-primary outline-none placeholder-gray-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => (
              <div key={client.id} className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow border border-white/5 p-4 hover:border-white/20 transition group flex flex-col justify-between">
                  <div>
                      <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold mr-3 border border-white/10">
                                  {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                  <h3 className="font-bold text-white text-sm truncate max-w-[150px]">{client.name}</h3>
                                  <p className="text-xs text-gray-500 font-mono">{client.cpf || 'Sem CPF'}</p>
                              </div>
                          </div>
                      </div>
                      
                      <div className="space-y-1 mb-4 border-t border-white/5 pt-2">
                          <div className="flex items-center text-xs text-gray-400 truncate"><Phone size={12} className="mr-2"/> {client.whatsapp || '-'}</div>
                          <div className="flex items-center text-xs text-gray-400 truncate"><Mail size={12} className="mr-2"/> {client.email || '-'}</div>
                      </div>
                  </div>

                  <div>
                      {/* Action Buttons Row */}
                      <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2 mb-2">
                          <button onClick={() => handleOpenAction('prescription', client)} className="flex flex-col items-center justify-center p-2 rounded hover:bg-white/5 text-gray-400 hover:text-blue-400 transition group">
                              <FileText size={16} className="mb-1" />
                              <span className="text-[9px] font-bold">Receita</span>
                          </button>
                          <button onClick={() => handleOpenAction('records', client)} className="flex flex-col items-center justify-center p-2 rounded hover:bg-white/5 text-gray-400 hover:text-green-400 transition group">
                              <ClipboardList size={16} className="mb-1" />
                              <span className="text-[9px] font-bold">Prontuário</span>
                          </button>
                          <button onClick={() => handleOpenAction('files', client)} className="flex flex-col items-center justify-center p-2 rounded hover:bg-white/5 text-gray-400 hover:text-yellow-400 transition group">
                              <FolderOpen size={16} className="mb-1" />
                              <span className="text-[9px] font-bold">Arquivos</span>
                          </button>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-white/5 pt-2">
                          <button onClick={() => handleOpenModal(client)} className="p-1.5 text-gray-400 hover:text-blue-400 rounded hover:bg-blue-900/20"><Edit2 size={16}/></button>
                          <button onClick={() => setDeleteId(client.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-red-900/20"><Trash2 size={16}/></button>
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {filteredClients.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
              <Users size={48} className="mx-auto mb-2 opacity-20"/>
              <p>Nenhum paciente encontrado.</p>
          </div>
      )}

      {/* --- ACTION MODALS --- */}

      {/* 1. RECEITA MODAL */}
      {actionModal.type === 'prescription' && actionModal.client && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                      <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="text-blue-400"/> Nova Receita</h2>
                          <p className="text-xs text-gray-400 mt-1">Paciente: {actionModal.client.name}</p>
                      </div>
                      <button onClick={() => setActionModal({type: null, client: null})} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-4 flex-1">
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Dentista Responsável</label>
                          <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={selectedDentistId} onChange={e => setSelectedDentistId(e.target.value)}>
                              <option value="">Selecione...</option>
                              {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Prescrição</label>
                          <textarea className="w-full h-64 bg-white text-black border border-gray-300 rounded p-4 outline-none focus:border-primary resize-none font-mono text-sm" placeholder="Ex: Amoxicilina 500mg..." value={prescriptionText} onChange={e => setPrescriptionText(e.target.value)}></textarea>
                      </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                      <button onClick={() => handleGeneratePDF(true)} disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition flex items-center shadow-sm disabled:opacity-50 text-sm">
                          {processing ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2" size={16}/>} Enviar por Email
                      </button>
                      <button onClick={() => handleGeneratePDF(false)} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition flex items-center shadow-sm disabled:opacity-50 text-sm">
                          <Printer className="mr-2" size={16}/> Gerar PDF
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 2. PRONTUÁRIO MODAL */}
      {actionModal.type === 'records' && actionModal.client && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4 shrink-0">
                      <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardList className="text-green-400"/> Prontuário Clínico</h2>
                          <p className="text-xs text-gray-400 mt-1">Paciente: {actionModal.client.name}</p>
                      </div>
                      <button onClick={() => setActionModal({type: null, client: null})} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>

                  {/* Add New Record */}
                  <div className="bg-gray-800/50 p-4 rounded-lg mb-4 shrink-0 border border-white/5">
                      <div className="flex gap-4 mb-2">
                          <div className="flex-1">
                              <select className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary text-sm" value={selectedDentistId} onChange={e => setSelectedDentistId(e.target.value)}>
                                  <option value="">Dentista Responsável...</option>
                                  {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                          </div>
                          <button onClick={handleSaveRecord} disabled={processing} className="px-4 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 transition flex items-center shadow-sm text-sm disabled:opacity-50">
                              {processing ? <Loader2 className="animate-spin mr-2"/> : <Plus className="mr-2" size={16}/>} Adicionar
                          </button>
                      </div>
                      <textarea className="w-full h-24 bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary resize-none text-sm" placeholder="Descreva o procedimento realizado..." value={newRecordText} onChange={e => setNewRecordText(e.target.value)}></textarea>
                  </div>

                  {/* History List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                      {patientRecords.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">Nenhum registro encontrado.</div>
                      ) : (
                          patientRecords.map((rec) => (
                              <div key={rec.id} className="bg-gray-800/30 border border-white/5 p-4 rounded-lg">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <span className="text-xs font-bold text-primary uppercase bg-blue-900/20 px-2 py-0.5 rounded border border-blue-500/20">{rec.dentist?.name || 'Dentista Excluído'}</span>
                                          <span className="text-[10px] text-gray-500 ml-2">{format(parseISO(rec.created_at), "dd/MM/yyyy 'às' HH:mm")}</span>
                                      </div>
                                  </div>
                                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{rec.description}</p>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* 3. ARQUIVOS MODAL */}
      {actionModal.type === 'files' && actionModal.client && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                      <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-2"><FolderOpen className="text-yellow-400"/> Arquivos e Exames</h2>
                          <p className="text-xs text-gray-400 mt-1">Paciente: {actionModal.client.name}</p>
                      </div>
                      <button onClick={() => setActionModal({type: null, client: null})} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>

                  <div className="flex justify-between items-center mb-4 bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400">Formatos aceitos: Imagens e PDF (Máx 10MB)</div>
                      <div>
                          <button onClick={() => fileUploadRef.current?.click()} disabled={processing} className="px-4 py-2 bg-gray-700 text-white rounded font-bold hover:bg-gray-600 transition flex items-center shadow-sm text-sm disabled:opacity-50">
                              {processing ? <Loader2 className="animate-spin mr-2"/> : <Upload className="mr-2" size={16}/>} Upload Arquivo
                          </button>
                          <input type="file" ref={fileUploadRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {patientFiles.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">Nenhum arquivo encontrado.</div>
                      ) : (
                          patientFiles.map((file) => (
                              <div key={file.id} className="flex justify-between items-center bg-gray-800/30 border border-white/5 p-3 rounded-lg hover:bg-gray-800/50 transition">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                      {file.metadata?.mimetype === 'application/pdf' ? <FileText className="text-red-400 shrink-0"/> : <ImageIcon className="text-blue-400 shrink-0"/>}
                                      <div className="flex flex-col overflow-hidden">
                                          <a 
                                            href="#" 
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                const { data } = await supabase.storage.from('patient-files').createSignedUrl(`${userProfile?.clinic_id}/${actionModal.client?.id}/${file.name}`, 60);
                                                if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                            }}
                                            className="text-sm font-bold text-white hover:text-primary truncate transition-colors"
                                          >
                                              {file.name}
                                          </a>
                                          <span className="text-[10px] text-gray-500">{format(parseISO(file.created_at), "dd/MM/yyyy HH:mm")} • {(file.metadata?.size / 1024).toFixed(1)} KB</span>
                                      </div>
                                  </div>
                                  <button onClick={() => handleDeleteFile(file.name)} disabled={processing} className="text-gray-500 hover:text-red-400 p-2"><Trash2 size={16}/></button>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* CRUD CLIENT MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white">{editingClient ? 'Editar Paciente' : 'Novo Paciente'}</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div><label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Nome Completo *</label><input required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-gray-400 mb-1 uppercase">CPF</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.cpf} onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 11) v = v.slice(0, 11); v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); setFormData({...formData, cpf: v}); }} maxLength={14}/></div>
                          <div><label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Data Nasc.</label><input type="date" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-gray-400 mb-1 uppercase">WhatsApp</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-gray-400 mb-1 uppercase">E-mail</label><input type="email" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                      </div>
                      <div><label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Endereço</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Notas Clínicas</label><textarea className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white h-24 resize-none outline-none focus:border-primary custom-scrollbar" value={formData.clinical_notes} onChange={e => setFormData({...formData, clinical_notes: e.target.value})} /></div>
                      
                      <div className="flex justify-end pt-4 gap-3 border-t border-white/10 mt-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 font-bold hover:text-white transition">Cancelar</button>
                          <button type="submit" disabled={processing} className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 flex items-center shadow-md transition disabled:opacity-50">{processing ? <Loader2 className="animate-spin mr-2"/> : 'Salvar'}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Import Result Modal */}
      {importResult.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {importResult.errorCount === 0 ? <CheckCircle className="text-green-500"/> : <Loader2 className="text-yellow-500 hidden"/>} Resultado da Importação
                    </h3>
                    <button onClick={() => setImportResult({ ...importResult, show: false })} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>
                <div className="mb-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg text-center">
                            <span className="block text-2xl font-bold text-green-400">{importResult.successCount}</span>
                            <span className="text-xs text-green-200 uppercase font-bold">Importados</span>
                        </div>
                        <div className={`border p-3 rounded-lg text-center ${importResult.errorCount > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-800 border-gray-700'}`}>
                            <span className={`block text-2xl font-bold ${importResult.errorCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>{importResult.errorCount}</span>
                            <span className={`text-xs uppercase font-bold ${importResult.errorCount > 0 ? 'text-red-200' : 'text-gray-500'}`}>Erros</span>
                        </div>
                    </div>
                    {importResult.errors.length > 0 && (
                        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 max-h-48 overflow-y-auto custom-scrollbar">
                            <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Detalhes dos Erros:</p>
                            <ul className="space-y-1">
                                {importResult.errors.map((err, idx) => (
                                    <li key={idx} className="text-xs text-red-300 border-b border-white/5 pb-1 last:border-0">{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="flex justify-end">
                    <button onClick={() => setImportResult({ ...importResult, show: false })} className="px-6 py-2 bg-gray-800 text-white rounded font-bold hover:bg-gray-700 transition">Fechar</button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-900/20 p-3 rounded-full inline-block mb-4"><Trash2 className="text-red-500" size={32} /></div>
             <h3 className="text-lg font-bold text-white mb-2">Excluir Paciente?</h3>
             <p className="text-gray-400 mb-6 text-sm">Tem certeza? Isso pode afetar históricos de agendamentos e financeiros.</p>
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
