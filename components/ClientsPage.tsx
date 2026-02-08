
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Client, ClinicalRecord, Dentist } from '../types';
import { 
  User, Plus, Search, Edit2, Trash2, FileText, ClipboardList, Folder, 
  X, Loader2, HelpCircle, Download, Upload, CheckCircle, AlertTriangle,
  Printer, Send, Calendar, Clock, Paperclip, File, Stethoscope, Save
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import Toast, { ToastType } from './Toast';
import { useDashboard } from './DashboardLayout';

const ClientsPage: React.FC = () => {
  const { userProfile } = useDashboard() || {};
  const [clients, setClients] = useState<Client[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]); // Estado para dentistas
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal Principal (Novo/Editar Paciente)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Modais de Ação
  const [activeModal, setActiveModal] = useState<'none' | 'prescription' | 'records' | 'files'>('none');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Estados para Prontuário
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [newRecordText, setNewRecordText] = useState('');
  const [recordDentistId, setRecordDentistId] = useState(''); // Dentista para a evolução
  const [loadingRecords, setLoadingRecords] = useState(false);
  
  // Estados para Edição de Prontuário
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingRecordText, setEditingRecordText] = useState('');

  // Estados para Arquivos
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Estados para Receita
  const [prescriptionText, setPrescriptionText] = useState('');
  const [selectedDentistId, setSelectedDentistId] = useState(''); // Dentista assinante da receita
  const [sendingPrescription, setSendingPrescription] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Import/Export Refs & States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const patientFileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{
      show: boolean;
      successCount: number;
      errorCount: number;
      errors: string[];
  }>({ show: false, successCount: 0, errorCount: 0, errors: [] });

  useEffect(() => {
    if (userProfile?.clinic_id) {
        fetchClients();
        fetchDentists(); // Busca dentistas ao iniciar
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

  const fetchDentists = async () => {
      const { data } = await supabase.from('dentists').select('*').eq('clinic_id', userProfile?.clinic_id).order('name');
      if (data) setDentists(data as Dentist[]);
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

  // --- ACTIONS LOGIC ---

  // 1. RECEITA
  const handleOpenPrescription = async (client: Client) => {
      setSelectedClient(client);
      setPrescriptionText(` RECEITUÁRIO\n\nPaciente: ${client.name}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\nUSO INTERNO:\n\n1. __________________________\n   __________________________\n\n\nUSO TÓPICO:\n\n1. __________________________\n   __________________________`);
      
      // Tenta pré-selecionar o dentista logado se ele for um dentista
      if (userProfile?.role === 'dentist') {
          const myself = dentists.find(d => d.email === userProfile.email);
          if (myself) setSelectedDentistId(myself.id);
      } else if (dentists.length > 0) {
          setSelectedDentistId(dentists[0].id);
      }
      
      setActiveModal('prescription');
  };

  // Função auxiliar para gerar o PDF configurado
  const generatePrescriptionPDF = () => {
      const doc = new jsPDF();
      
      // --- BODY ---
      doc.setFontSize(12);
      // Quebra o texto para caber na página (margem ~15mm, largura ~180mm)
      const splitText = doc.splitTextToSize(prescriptionText, 180);
      doc.text(splitText, 15, 30);

      // --- FOOTER ---
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const footerStart = pageHeight - 40;

      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(20, footerStart, pageWidth - 20, footerStart);

      let currentY = footerStart + 10;
      doc.setFontSize(10);
      doc.setTextColor(80); // Cinza escuro

      // Dados do Dentista
      const dentist = dentists.find(d => d.id === selectedDentistId);
      if (dentist) {
          doc.setFont("helvetica", "bold");
          doc.text(dentist.name, pageWidth / 2, currentY, { align: 'center' });
          currentY += 5;
          doc.setFont("helvetica", "normal");
          doc.text(`CRO: ${dentist.cro || 'N/A'}`, pageWidth / 2, currentY, { align: 'center' });
          currentY += 8; // Espaço extra
      }

      // Dados da Clínica (via userProfile do contexto, que traz clinics)
      const clinicData = (userProfile as any)?.clinics;
      if (clinicData) {
          doc.setFont("helvetica", "bold");
          doc.text(clinicData.name || '', pageWidth / 2, currentY, { align: 'center' });
          currentY += 5;
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          // Monta endereço completo
          const parts = [];
          if (clinicData.address) parts.push(clinicData.address);
          if (clinicData.city) parts.push(clinicData.city);
          if (clinicData.state) parts.push(clinicData.state);
          
          if (parts.length > 0) {
              doc.text(parts.join(' - '), pageWidth / 2, currentY, { align: 'center' });
          }
      }

      return doc;
  };

  const handlePrintPrescription = () => {
      const doc = generatePrescriptionPDF();
      doc.save(`Receita_${selectedClient?.name}.pdf`);
  };

  const handleSendPrescription = async () => {
      if (!selectedClient?.email) {
          setToast({ message: "Paciente não possui e-mail cadastrado.", type: 'warning' });
          return;
      }
      setSendingPrescription(true);
      try {
          // Gera PDF usando a mesma lógica do print
          const doc = generatePrescriptionPDF();
          const pdfBase64 = doc.output('datauristring').split(',')[1];

          await supabase.functions.invoke('send-emails', {
              body: {
                  type: 'prescription',
                  client: { name: selectedClient.name, email: selectedClient.email },
                  clinicName: userProfile?.clinics?.name,
                  attachments: [{ filename: 'receita.pdf', content: pdfBase64 }]
              }
          });
          setToast({ message: "Receita enviada por e-mail!", type: 'success' });
          setActiveModal('none');
      } catch (err: any) {
          setToast({ message: "Erro ao enviar: " + err.message, type: 'error' });
      } finally {
          setSendingPrescription(false);
      }
  };

  // 2. PRONTUÁRIO
  const handleOpenRecords = (client: Client) => {
      setSelectedClient(client);
      
      // Pre-seleciona dentista se for um dentista logado
      if (userProfile?.role === 'dentist') {
          const myself = dentists.find(d => d.email === userProfile.email);
          if (myself) setRecordDentistId(myself.id);
      } else {
          setRecordDentistId(''); // Reseta para admin/funcionário selecionar
      }

      setActiveModal('records');
      fetchRecords(client.id);
  };

  const fetchRecords = async (clientId: string) => {
      setLoadingRecords(true);
      const { data } = await supabase.from('clinical_records')
          .select('*, dentist:dentists(name)')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }); // Ordena por created_at para ser mais preciso
      setRecords(data as ClinicalRecord[] || []);
      setLoadingRecords(false);
  };

  const handleAddRecord = async () => {
      if (!newRecordText.trim() || !selectedClient) return;
      if (!recordDentistId) {
          setToast({ message: "Selecione o dentista responsável.", type: 'warning' });
          return;
      }

      setLoadingRecords(true);
      try {
          const { error } = await supabase.from('clinical_records').insert({
              clinic_id: userProfile?.clinic_id,
              client_id: selectedClient.id,
              dentist_id: recordDentistId,
              date: format(new Date(), 'yyyy-MM-dd'),
              description: newRecordText
          });

          if (error) throw error;
          setNewRecordText('');
          fetchRecords(selectedClient.id);
          setToast({ message: "Evolução registrada.", type: 'success' });
      } catch (err: any) {
          setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
          setLoadingRecords(false);
      }
  };

  const handleDeleteRecord = async (recordId: string) => {
      if (!window.confirm("Tem certeza que deseja excluir esta evolução?")) return;
      if (!selectedClient) return;

      try {
          const { error } = await supabase.from('clinical_records').delete().eq('id', recordId);
          if (error) throw error;
          setToast({ message: "Evolução excluída.", type: 'success' });
          fetchRecords(selectedClient.id);
      } catch (err: any) {
          setToast({ message: "Erro ao excluir: " + err.message, type: 'error' });
      }
  };

  const handleUpdateRecord = async (recordId: string) => {
      if (!editingRecordText.trim() || !selectedClient) return;
      
      try {
          const { error } = await supabase.from('clinical_records')
              .update({ description: editingRecordText })
              .eq('id', recordId);
          
          if (error) throw error;
          
          setToast({ message: "Evolução atualizada.", type: 'success' });
          setEditingRecordId(null);
          setEditingRecordText('');
          fetchRecords(selectedClient.id);
      } catch (err: any) {
          setToast({ message: "Erro ao atualizar: " + err.message, type: 'error' });
      }
  };

  const startEditingRecord = (rec: ClinicalRecord) => {
      setEditingRecordId(rec.id);
      setEditingRecordText(rec.description);
  };

  const cancelEditingRecord = () => {
      setEditingRecordId(null);
      setEditingRecordText('');
  };

  // 3. ARQUIVOS
  const handleOpenFiles = (client: Client) => {
      setSelectedClient(client);
      setActiveModal('files');
      fetchFiles(client.id);
  };

  const fetchFiles = async (clientId: string) => {
      setLoadingFiles(true);
      if (!userProfile?.clinic_id) return;
      
      const folderPath = `${userProfile.clinic_id}/${clientId}`;
      const { data, error } = await supabase.storage.from('patient-files').list(folderPath);
      
      if (error) {
          console.error(error);
          setToast({ message: "Erro ao listar arquivos.", type: 'error' });
      } else {
          setFiles(data || []);
      }
      setLoadingFiles(false);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !selectedClient || !userProfile?.clinic_id) return;
      setUploadingFile(true);
      const file = e.target.files[0];
      const filePath = `${userProfile.clinic_id}/${selectedClient.id}/${Date.now()}_${file.name}`;

      try {
          const { error } = await supabase.storage.from('patient-files').upload(filePath, file);
          if (error) throw error;
          setToast({ message: "Arquivo enviado!", type: 'success' });
          fetchFiles(selectedClient.id);
      } catch (err: any) {
          setToast({ message: "Erro upload: " + err.message, type: 'error' });
      } finally {
          setUploadingFile(false);
          if (patientFileInputRef.current) patientFileInputRef.current.value = '';
      }
  };

  const handleDeleteFile = async (fileName: string) => {
      if (!selectedClient || !userProfile?.clinic_id) return;
      if (!window.confirm("Excluir este arquivo permanentemente?")) return;
      
      const filePath = `${userProfile.clinic_id}/${selectedClient.id}/${fileName}`;
      const { error } = await supabase.storage.from('patient-files').remove([filePath]);
      
      if (error) setToast({ message: "Erro ao excluir.", type: 'error' });
      else {
          setToast({ message: "Arquivo excluído.", type: 'success' });
          fetchFiles(selectedClient.id);
      }
  };

  const handleDownloadFile = async (fileName: string) => {
      if (!selectedClient || !userProfile?.clinic_id) return;
      const filePath = `${userProfile.clinic_id}/${selectedClient.id}/${fileName}`;
      const { data } = await supabase.storage.from('patient-files').createSignedUrl(filePath, 60);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  // --- EXCEL FUNCTIONS ---

  const handleDownloadTemplate = () => {
      const ws = XLSX.utils.aoa_to_sheet([
          ["Nome Completo", "Email", "Telefone/WhatsApp", "CPF", "Endereço", "Data Nascimento (AAAA-MM-DD)", "Anamnese"],
          ["Maria Silva", "maria@email.com", "11999998888", "000.000.000-00", "Rua das Flores, 123", "1990-05-20", "Histórico de diabetes na família. Alérgica a penicilina."]
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo_Pacientes");
      XLSX.writeFile(wb, "Modelo_Importacao_Pacientes_DentiHub.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!userProfile?.clinic_id) { setToast({message: "Erro de identificação da clínica", type: 'error'}); return; }

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
                  email: row[1] ? row[1].toString() : null,
                  whatsapp: row[2] ? row[2].toString() : null,
                  cpf: row[3] ? row[3].toString() : null,
                  address: row[4] ? row[4].toString() : null,
                  birth_date: row[5] ? row[5].toString() : null,
                  clinical_notes: row[6] ? row[6].toString() : null
              };

              try {
                  if (!payload.name) throw new Error("Nome é obrigatório.");
                  
                  const { error } = await supabase.from('clients').insert(payload);
                  if (error) {
                      if (error.message.includes('check_client_limit')) throw new Error("Limite do plano atingido.");
                      if (error.message.includes('unique')) throw new Error("CPF já cadastrado.");
                      throw error;
                  }
                  successCount++;
              } catch (err: any) { 
                  errors.push(`Linha ${i + 2} (${row[0] || 'Sem Nome'}): ${err.message}`);
              }
          }

          setLoading(false);
          setImportResult({
              show: true,
              successCount,
              errorCount: errors.length,
              errors
          });
          fetchClients();
          if (fileInputRef.current) fileInputRef.current.value = "";
      };
      
      reader.readAsBinaryString(file);
  };

  // Form for Modal
  const ClientForm = ({ client, onSuccess, onCancel }: { client: Client | null, onSuccess: () => void, onCancel: () => void }) => {
      const [formData, setFormData] = useState({
          name: client?.name || '',
          email: client?.email || '',
          whatsapp: client?.whatsapp || '',
          cpf: client?.cpf || '',
          address: client?.address || '',
          birth_date: client?.birth_date || '',
          clinical_notes: client?.clinical_notes || ''
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
              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Anamnese / Notas Clínicas</label>
                  <textarea 
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary h-24 resize-none" 
                    value={formData.clinical_notes} 
                    onChange={e => setFormData({...formData, clinical_notes: e.target.value})} 
                    placeholder="Histórico médico, alergias, queixa principal..."
                  />
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

  const currentTier = userProfile?.clinics?.subscription_tier || 'free';
  const clientLimit = currentTier === 'free' ? 30 : currentTier === 'starter' ? 100 : 'Ilimitado';

  return (
    <div className="pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    Pacientes
                    <span className="text-sm font-normal bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-white/10">
                        {clients.length} / {clientLimit}
                    </span>
                </h1>
            </div>
            <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors"><HelpCircle size={20} /></button>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleDownloadTemplate} className="flex items-center justify-center px-4 py-2 bg-gray-900 border border-white/10 text-gray-300 rounded hover:bg-gray-800 transition shadow-sm font-bold text-sm">
                <Download size={16} className="mr-2" /> Modelo
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center px-4 py-2 bg-gray-900 border border-white/10 text-gray-300 rounded hover:bg-gray-800 transition shadow-sm font-bold text-sm">
                <Upload size={16} className="mr-2" /> Importar
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />

            <button onClick={() => handleOpenModal()} className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold text-sm">
                <Plus size={18} className="mr-2" /> Novo
            </button>
        </div>
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

      {/* Modal Novo/Editar Paciente */}
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

      {/* MODAL RECEITA */}
      {activeModal === 'prescription' && selectedClient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="text-blue-400"/> Receituário: {selectedClient.name}</h2>
                      <button onClick={() => setActiveModal('none')} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  {/* Seleção de Dentista */}
                  <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Dentista Assinante</label>
                      <div className="relative">
                          <select 
                              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary appearance-none cursor-pointer"
                              value={selectedDentistId}
                              onChange={(e) => setSelectedDentistId(e.target.value)}
                          >
                              <option value="">Selecione o profissional...</option>
                              {dentists.map(d => (
                                  <option key={d.id} value={d.id}>{d.name} {d.cro ? `(CRO: ${d.cro})` : ''}</option>
                              ))}
                          </select>
                          <Stethoscope size={16} className="absolute right-3 top-2.5 text-gray-500 pointer-events-none"/>
                      </div>
                  </div>

                  <textarea 
                      className="flex-1 bg-gray-100 text-gray-900 p-4 rounded-lg font-mono text-sm resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
                      value={prescriptionText}
                      onChange={e => setPrescriptionText(e.target.value)}
                  ></textarea>
                  <div className="flex justify-between items-center pt-2">
                      <button onClick={handlePrintPrescription} className="px-4 py-2 bg-gray-800 text-white rounded font-bold hover:bg-gray-700 flex items-center"><Printer size={18} className="mr-2"/> Imprimir / Salvar PDF</button>
                      <button onClick={handleSendPrescription} disabled={sendingPrescription} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 flex items-center shadow-lg disabled:opacity-50">
                          {sendingPrescription ? <Loader2 className="animate-spin mr-2"/> : <Send size={18} className="mr-2"/>} Enviar por E-mail
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL PRONTUÁRIO */}
      {activeModal === 'records' && selectedClient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardList className="text-purple-400"/> Prontuário: {selectedClient.name}</h2>
                      <button onClick={() => setActiveModal('none')} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <div className="mb-4 bg-gray-800/50 p-4 rounded-lg border border-white/5">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nova Evolução</label>
                      
                      <div className="mb-2">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dentista Responsável</label>
                          <select 
                              className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-white outline-none focus:border-primary text-sm"
                              value={recordDentistId}
                              onChange={(e) => setRecordDentistId(e.target.value)}
                          >
                              <option value="">Selecione o dentista...</option>
                              {dentists.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                          </select>
                      </div>

                      <textarea 
                          className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary resize-none h-20 text-sm"
                          placeholder="Descreva o procedimento realizado..."
                          value={newRecordText}
                          onChange={e => setNewRecordText(e.target.value)}
                      ></textarea>
                      <div className="flex justify-end mt-2">
                          <button onClick={handleAddRecord} disabled={loadingRecords} className="px-4 py-1.5 bg-primary text-white rounded text-sm font-bold hover:bg-sky-600 flex items-center">
                              {loadingRecords ? <Loader2 className="animate-spin mr-1" size={14}/> : <Plus size={14} className="mr-1"/>} Adicionar
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-950/30 rounded-lg p-2 border border-white/5">
                      {loadingRecords ? (
                          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-500"/></div>
                      ) : records.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 text-sm">Nenhum registro encontrado.</div>
                      ) : (
                          <div className="space-y-4">
                              {records.map((rec) => (
                                  <div key={rec.id} className="bg-gray-800 p-3 rounded border-l-4 border-purple-500 relative group/record">
                                      <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                                          <div className="flex items-center gap-2">
                                              <Calendar size={12}/> 
                                              {rec.created_at ? format(parseISO(rec.created_at), 'dd/MM/yyyy HH:mm:ss') : rec.date.split('-').reverse().join('/')}
                                          </div>
                                          <div className="flex items-center gap-3">
                                              {rec.dentist && <div className="font-bold text-purple-300">{rec.dentist.name}</div>}
                                              
                                              {/* Actions for Edit/Delete */}
                                              {editingRecordId !== rec.id && (
                                                  <div className="flex gap-1 opacity-0 group-hover/record:opacity-100 transition-opacity">
                                                      <button 
                                                          onClick={() => startEditingRecord(rec)} 
                                                          className="p-1 hover:bg-gray-700 rounded text-blue-400 hover:text-blue-300"
                                                          title="Editar"
                                                      >
                                                          <Edit2 size={14}/>
                                                      </button>
                                                      <button 
                                                          onClick={() => handleDeleteRecord(rec.id)} 
                                                          className="p-1 hover:bg-gray-700 rounded text-red-400 hover:text-red-300"
                                                          title="Excluir"
                                                      >
                                                          <Trash2 size={14}/>
                                                      </button>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                      
                                      {editingRecordId === rec.id ? (
                                          <div className="mt-2">
                                              <textarea 
                                                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary resize-none h-24 text-sm mb-2"
                                                  value={editingRecordText}
                                                  onChange={(e) => setEditingRecordText(e.target.value)}
                                              ></textarea>
                                              <div className="flex justify-end gap-2">
                                                  <button onClick={cancelEditingRecord} className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600">Cancelar</button>
                                                  <button onClick={() => handleUpdateRecord(rec.id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center">
                                                      <Save size={12} className="mr-1"/> Salvar
                                                  </button>
                                              </div>
                                          </div>
                                      ) : (
                                          <p className="text-sm text-gray-200 whitespace-pre-wrap">{rec.description}</p>
                                      )}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL ARQUIVOS */}
      {activeModal === 'files' && selectedClient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Folder className="text-yellow-400"/> Arquivos: {selectedClient.name}</h2>
                      <button onClick={() => setActiveModal('none')} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-950/30 rounded-lg p-2 border border-white/5 mb-4">
                      {loadingFiles ? (
                          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-500"/></div>
                      ) : files.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 text-sm">Nenhum arquivo anexado.</div>
                      ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {files.map((file) => (
                                  <div key={file.name} className="bg-gray-800 p-3 rounded border border-white/5 hover:border-white/20 transition group relative">
                                      <div className="flex items-center justify-center h-16 bg-gray-900/50 rounded mb-2 text-gray-500">
                                          {file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? <img src={`invalid-url-preview-placeholder`} alt="img" className="hidden"/> : null} 
                                          <File size={32}/>
                                      </div>
                                      <p className="text-xs text-white truncate font-bold mb-1" title={file.name}>{file.name.split('_').slice(1).join('_') || file.name}</p>
                                      <p className="text-[10px] text-gray-500">{format(new Date(file.created_at), 'dd/MM/yy HH:mm')}</p>
                                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/80 rounded p-1">
                                          <button onClick={() => handleDownloadFile(file.name)} className="text-blue-400 hover:text-white"><Download size={14}/></button>
                                          <button onClick={() => handleDeleteFile(file.name)} className="text-red-400 hover:text-white"><Trash2 size={14}/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  <div className="bg-gray-800/50 p-4 rounded-lg border border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-800 transition" onClick={() => patientFileInputRef.current?.click()}>
                      {uploadingFile ? <Loader2 className="animate-spin text-primary" size={24}/> : (
                          <div className="text-center text-gray-400">
                              <Paperclip className="mx-auto mb-2" size={24}/>
                              <span className="text-sm font-bold">Clique para adicionar arquivo</span>
                          </div>
                      )}
                      <input type="file" ref={patientFileInputRef} className="hidden" onChange={handleUploadFile} disabled={uploadingFile} />
                  </div>
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

      {/* IMPORT RESULT MODAL */}
      {importResult.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {importResult.errorCount === 0 ? <CheckCircle className="text-green-500"/> : <AlertTriangle className="text-yellow-500"/>}
                        Resultado da Importação
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
                    <button onClick={() => setImportResult({ ...importResult, show: false })} className="px-6 py-2 bg-gray-800 text-white rounded font-bold hover:bg-gray-700 transition">
                        Fechar
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
                <p>Aqui você gerencia todos os pacientes da clínica.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Cadastro:</strong> Adicione novos pacientes clicando no botão "Novo Paciente".</li>
                   <li><strong>Importação:</strong> Use o botão "Importar" para carregar múltiplos pacientes via Excel. Baixe o modelo primeiro.</li>
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
