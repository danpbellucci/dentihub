
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Client, Dentist } from '../types';
import { 
  Plus, Edit2, Trash2, Upload, Search, X, Loader2, User, 
  Phone, Mail, MapPin, FileText, Download, HelpCircle, 
  ClipboardList, Folder, Calendar, Send, Printer, File, Eye, Clock, AlertTriangle, Save, CheckCircle, Lock, Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import Toast, { ToastType } from './Toast';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from './DashboardLayout';
import { validateCPF } from '../utils/validators';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ClientsPage: React.FC = () => {
  const { userProfile } = useDashboard() || {};
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]); 
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [clinicData, setClinicData] = useState<{name: string, address: string, city: string, state: string} | null>(null);
  
  // Modal State - Client
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

  // Modal State - Prescription
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [selectedClientForPrescription, setSelectedClientForPrescription] = useState<Client | null>(null);
  const [prescriptionText, setPrescriptionText] = useState('');
  const [prescriptionDentistId, setPrescriptionDentistId] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Modal State - Records (Prontuário)
  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [selectedClientForRecords, setSelectedClientForRecords] = useState<Client | null>(null);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  
  // Novo Prontuário Form State
  const [newRecord, setNewRecord] = useState({
      description: '',
      dentist_id: '',
      date: ''
  });
  const [savingRecord, setSavingRecord] = useState(false);

  // Modal State - Files (Arquivos)
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [selectedClientForFiles, setSelectedClientForFiles] = useState<Client | null>(null);
  const [patientFiles, setPatientFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Modal State - Missing Email
  const [missingEmailModalOpen, setMissingEmailModalOpen] = useState(false);
  const [newEmailAddress, setNewEmailAddress] = useState('');

  // Delete Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Import Result Modal
  const [importResult, setImportResult] = useState<{
      show: boolean;
      successCount: number;
      errorCount: number;
      errors: string[];
  }>({ show: false, successCount: 0, errorCount: 0, errors: [] });

  // UPGRADE MODAL
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Import/Export
  const fileInputRef = useRef<HTMLInputElement>(null);
  const patientFileInputRef = useRef<HTMLInputElement>(null);
  
  // UI
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [currentTier, setCurrentTier] = useState('free');
  const [showHelp, setShowHelp] = useState(false);

  const clinicId = userProfile?.clinic_id;

  useEffect(() => {
    if (clinicId) {
      fetchClients(clinicId);
      fetchDentists(clinicId);
      fetchClinicDetails(clinicId);
      checkTier(clinicId);
    }
  }, [clinicId]);

  const checkTier = async (id: string) => {
      const { data } = await supabase.from('clinics').select('subscription_tier').eq('id', id).single();
      if (data) setCurrentTier(data.subscription_tier || 'free');
  };

  const fetchClinicDetails = async (id: string) => {
      const { data } = await supabase.from('clinics').select('name, address, city, state').eq('id', id).single();
      if (data) setClinicData(data);
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

  const fetchDentists = async (id: string) => {
      const { data } = await supabase.from('dentists').select('id, name, cro, email').eq('clinic_id', id).order('name');
      if (data) setDentists(data as Dentist[]);
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
          setShowUpgradeModal(true);
          return;
      }

      setEditingClient(null);
      setFormData({ name: '', email: '', whatsapp: '', cpf: '', address: '', birth_date: '', clinical_notes: '' });
    }
    setIsModalOpen(true);
  };

  // --- RECORDS (PRONTUÁRIO) LOGIC ---
  const handleOpenRecords = async (client: Client) => {
      setSelectedClientForRecords(client);
      setRecordsModalOpen(true);
      setNewRecord({
          description: '',
          dentist_id: '',
          date: new Date().toISOString().slice(0, 16)
      });
      fetchRecords(client.id);
  };

  const fetchRecords = async (clientId: string) => {
      setLoadingRecords(true);
      try {
          const { data, error } = await supabase
              .from('clinical_records')
              .select('*, dentist:dentists(name)')
              .eq('client_id', clientId)
              .order('created_at', { ascending: false });
          
          if (error) throw error;
          setPatientRecords(data || []);
      } catch (err: any) {
          setToast({ message: "Erro ao carregar prontuário.", type: 'error' });
      } finally {
          setLoadingRecords(false);
      }
  };

  const handleSaveNewRecord = async () => {
      if (!clinicId || !selectedClientForRecords) return;
      if (!newRecord.description.trim()) { setToast({ message: "Escreva a evolução clínica.", type: 'warning' }); return; }
      if (!newRecord.dentist_id) { setToast({ message: "Selecione o dentista.", type: 'warning' }); return; }

      setSavingRecord(true);
      try {
          const { error } = await supabase.from('clinical_records').insert({
              clinic_id: clinicId,
              client_id: selectedClientForRecords.id,
              dentist_id: newRecord.dentist_id,
              date: newRecord.date,
              description: newRecord.description
          });

          if (error) throw error;

          setToast({ message: "Evolução adicionada com sucesso!", type: 'success' });
          setNewRecord(prev => ({ ...prev, description: '' }));
          fetchRecords(selectedClientForRecords.id);
      } catch (err: any) {
          setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
      } finally {
          setSavingRecord(false);
      }
  };

  // --- FILES (ARQUIVOS) LOGIC ---
  const handleOpenFiles = async (client: Client) => {
      if (!clinicId) return;
      setSelectedClientForFiles(client);
      setFilesModalOpen(true);
      fetchFiles(client.id);
  };

  const fetchFiles = async (clientId: string) => {
      if (!clinicId) return;
      setLoadingFiles(true);
      try {
          const { data, error } = await supabase.storage
              .from('patient-files')
              .list(`${clinicId}/${clientId}`, {
                  limit: 100,
                  offset: 0,
                  sortBy: { column: 'created_at', order: 'desc' },
              });

          if (error) throw error;
          setPatientFiles(data || []);
      } catch (err: any) {
          console.error(err);
          setToast({ message: "Erro ao listar arquivos.", type: 'error' });
      } finally {
          setLoadingFiles(false);
      }
  };

  const handlePatientFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !selectedClientForFiles || !clinicId) return;
      
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
          setToast({ message: "Arquivo muito grande (Máx 10MB).", type: 'warning' });
          return;
      }

      setUploadingFile(true);
      try {
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filePath = `${clinicId}/${selectedClientForFiles.id}/${fileName}`;

          const { error } = await supabase.storage
              .from('patient-files')
              .upload(filePath, file);

          if (error) throw error;

          setToast({ message: "Arquivo enviado com sucesso!", type: 'success' });
          fetchFiles(selectedClientForFiles.id);
      } catch (err: any) {
          setToast({ message: "Erro no upload: " + err.message, type: 'error' });
      } finally {
          setUploadingFile(false);
          if (patientFileInputRef.current) patientFileInputRef.current.value = '';
      }
  };

  const handleFileDownload = async (fileName: string) => {
      if (!selectedClientForFiles || !clinicId) return;
      try {
          const filePath = `${clinicId}/${selectedClientForFiles.id}/${fileName}`;
          const { data, error } = await supabase.storage
              .from('patient-files')
              .createSignedUrl(filePath, 60);

          if (error) throw error;
          if (data?.signedUrl) {
              window.open(data.signedUrl, '_blank');
          }
      } catch (err: any) {
          setToast({ message: "Erro ao baixar arquivo.", type: 'error' });
      }
  };

  const handleFileDelete = async (fileName: string) => {
      if (!selectedClientForFiles || !clinicId) return;
      if (!window.confirm("Tem certeza que deseja excluir este arquivo?")) return;

      try {
          const filePath = `${clinicId}/${selectedClientForFiles.id}/${fileName}`;
          const { error } = await supabase.storage
              .from('patient-files')
              .remove([filePath]);

          if (error) throw error;
          
          setToast({ message: "Arquivo excluído.", type: 'success' });
          setPatientFiles(prev => prev.filter(f => f.name !== fileName));
      } catch (err: any) {
          setToast({ message: "Erro ao excluir.", type: 'error' });
      }
  };

  // --- PRESCRIPTION LOGIC ---
  const handleOpenPrescription = (client: Client) => {
      setSelectedClientForPrescription(client);
      setPrescriptionText("Uso Oral:\n\n1. \n2. ");
      
      // Auto-select dentist
      if (userProfile?.role === 'dentist') {
          const myself = dentists.find(d => d.email === userProfile.email);
          setPrescriptionDentistId(myself ? myself.id : (dentists[0]?.id || ''));
      } else {
          setPrescriptionDentistId(dentists[0]?.id || '');
      }
      
      setPrescriptionModalOpen(true);
  };

  const addFooterToPDF = (doc: jsPDF) => {
      const dentist = dentists.find(d => d.id === prescriptionDentistId);
      const dentistName = dentist?.name || '';
      const dentistCRO = dentist?.cro ? `CRO: ${dentist.cro}` : '';
      const clinicName = clinicData?.name || '';
      const clinicAddress = clinicData ? `${clinicData.address || ''} ${clinicData.city ? '- ' + clinicData.city : ''}${clinicData.state ? '/' + clinicData.state : ''}` : '';
      
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, pageHeight - 35, pageWidth - 20, pageHeight - 35); // Linha separadora
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(dentistName, pageWidth / 2, pageHeight - 28, { align: "center" });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (dentistCRO) {
          doc.text(dentistCRO, pageWidth / 2, pageHeight - 23, { align: "center" });
      }
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${clinicName} | ${clinicAddress}`, pageWidth / 2, pageHeight - 15, { align: "center" });
  };

  const generatePDFBase64 = (): string => {
      if (!selectedClientForPrescription) return '';
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("RECEITA / ORIENTAÇÃO", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 150, 40);
      
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(20, 50, 190, 50);
      
      // Patient Info
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Paciente: ${selectedClientForPrescription.name}`, 20, 60);
      
      // Body
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(prescriptionText, 170);
      doc.text(splitText, 20, 80);
      
      // Footer
      addFooterToPDF(doc);
      
      return doc.output('datauristring').split(',')[1];
  };

  const handleDownloadPDF = () => {
      if (!selectedClientForPrescription) return;
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text("RECEITA", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 150, 30);
      doc.line(20, 35, 190, 35);

      doc.setFontSize(14);
      doc.text(`Paciente: ${selectedClientForPrescription.name}`, 20, 50);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(prescriptionText, 170);
      doc.text(splitText, 20, 70);
      
      addFooterToPDF(doc);
      
      doc.save(`Receita_${selectedClientForPrescription.name}.pdf`);
  };

  const handleSendEmail = async () => {
      if (!selectedClientForPrescription) return;
      if (!selectedClientForPrescription.email) {
          setNewEmailAddress('');
          setMissingEmailModalOpen(true);
          return;
      }
      setSendingEmail(true);
      try {
          const pdfBase64 = generatePDFBase64();
          const { data, error } = await supabase.functions.invoke('send-emails', {
              body: {
                  type: 'prescription',
                  recipients: [{ name: selectedClientForPrescription.name, email: selectedClientForPrescription.email }],
                  client: { name: selectedClientForPrescription.name, email: selectedClientForPrescription.email },
                  attachments: [
                      {
                          filename: `Receita_${selectedClientForPrescription.name.replace(/\s+/g, '_')}.pdf`,
                          content: pdfBase64
                      }
                  ]
              }
          });
          if (error) throw error;
          if (data && data.error) throw new Error(data.error);
          setToast({ message: `Receita enviada para ${selectedClientForPrescription.email}`, type: 'success' });
          setPrescriptionModalOpen(false);
      } catch (err: any) {
          console.error(err);
          setToast({ message: "Erro ao enviar: " + err.message, type: 'error' });
      } finally {
          setSendingEmail(false);
      }
  };

  const handleSaveMissingEmail = async () => {
      if (!newEmailAddress || !selectedClientForPrescription) return;
      setProcessing(true);
      try {
          const { error } = await supabase.from('clients').update({ email: newEmailAddress }).eq('id', selectedClientForPrescription.id);
          if (error) throw error;
          const updatedClient = { ...selectedClientForPrescription, email: newEmailAddress };
          setClients(prev => prev.map(c => c.id === selectedClientForPrescription.id ? updatedClient : c));
          setSelectedClientForPrescription(updatedClient);
          setMissingEmailModalOpen(false);
          setToast({ message: "E-mail salvo! Enviando receita...", type: 'info' });
          setProcessing(false); 
          setTimeout(() => handleSendEmail(), 500);
      } catch (err: any) {
          setToast({ message: "Erro ao salvar email: " + err.message, type: 'error' });
          setProcessing(false);
      }
  };

  // --- END PRESCRIPTION LOGIC ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    
    if (!formData.cpf) { setToast({ message: "O CPF é obrigatório.", type: 'error' }); return; }
    if (!formData.birth_date) { setToast({ message: "A Data de Nascimento é obrigatória.", type: 'error' }); return; }
    if (formData.cpf && !validateCPF(formData.cpf)) { setToast({ message: "CPF inválido.", type: 'error' }); return; }

    setProcessing(true);
    try {
      // Check for uniqueness before saving
      if (formData.cpf) {
          const { data: existingCPF } = await supabase
              .from('clients')
              .select('id')
              .eq('clinic_id', clinicId)
              .eq('cpf', formData.cpf)
              .maybeSingle();

          if (existingCPF && (!editingClient || existingCPF.id !== editingClient.id)) {
              throw new Error("Este CPF já está cadastrado para outro paciente.");
          }
      }

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
              setImportResult({
                  show: true,
                  successCount: 0,
                  errorCount: newEntriesCount,
                  errors: [`Importação cancelada: O total excederia o limite do plano (${limit} pacientes). Faça upgrade para continuar.`]
              });
              if (fileInputRef.current) fileInputRef.current.value = "";
              return;
          }
          
          let successCount = 0;
          let errors: string[] = [];
          const newRecipients: { id: string; name: string; email: string }[] = [];
          
          for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              let birthDate = null;
              const rawDate = row[4];
              
              if (rawDate) {
                  try {
                      if (rawDate instanceof Date) {
                          birthDate = rawDate.toISOString().split('T')[0];
                      } else if (typeof rawDate === 'string') {
                          const parts = rawDate.trim().split('/');
                          if (parts.length === 3) birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                          else birthDate = rawDate;
                      }
                  } catch (dateErr) {
                      // Ignora erro de data
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
              } catch (err: any) { 
                  errors.push(`Linha ${i + 2} (${row[0] || 'Sem Nome'}): ${err.message}`);
              }
          }

          if (newRecipients.length > 0) {
              try {
                  await supabase.functions.invoke('send-emails', {
                      body: { type: 'welcome', recipients: newRecipients, origin: window.location.origin }
                  });
              } catch (mailErr) { console.error(mailErr); }
          }

          setLoading(false);
          setImportResult({
              show: true,
              successCount,
              errorCount: errors.length,
              errors
          });
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

  const clientLimit = currentTier === 'free' ? 30 : currentTier === 'starter' ? 100 : Infinity;
  const limitLabel = clientLimit === Infinity ? 'Ilimitado' : clientLimit;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* ... Header e Search Bar ... */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    Pacientes 
                    <span className="text-sm font-normal bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-white/10">
                        {clients.length} / {limitLabel}
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
                            <button className="flex flex-col items-center group" title="Receita" onClick={() => handleOpenPrescription(client)}>
                                <div className="p-2 rounded-lg bg-gray-800/50 border border-white/5 group-hover:bg-blue-500/10 text-gray-400 group-hover:text-blue-400 transition">
                                    <FileText size={18} />
                                </div>
                                <span className="text-[10px] mt-1 hidden sm:block text-gray-500 group-hover:text-gray-300">Receita</span>
                            </button>
                            
                            <button className="flex flex-col items-center group" title="Prontuário" onClick={() => handleOpenRecords(client)}>
                                <div className="p-2 rounded-lg bg-gray-800/50 border border-white/5 group-hover:bg-purple-500/10 text-gray-400 group-hover:text-purple-400 transition">
                                    <ClipboardList size={18} />
                                </div>
                                <span className="text-[10px] mt-1 hidden sm:block text-gray-500 group-hover:text-gray-300">Prontuário</span>
                            </button>

                            <button className="flex flex-col items-center group" title="Arquivos" onClick={() => handleOpenFiles(client)}>
                                <div className="p-2 rounded-lg bg-gray-800/50 border border-white/5 group-hover:bg-yellow-500/10 text-gray-400 group-hover:text-yellow-400 transition">
                                    <Folder size={18} />
                                </div>
                                <span className="text-[10px] mt-1 hidden sm:block text-gray-500 group-hover:text-gray-300">Arquivos</span>
                            </button>

                            <div className="w-px h-8 bg-gray-800 mx-2 hidden sm:block"></div>

                            <button onClick={() => handleOpenModal(client)} className="text-gray-500 hover:text-blue-400 transition p-2" title="Editar">
                                <Edit2 size={18} />
                            </button>
                            <button onClick={() => setDeleteId(client.id)} className="text-gray-500 hover:text-red-400 transition p-2" title="Excluir">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-sm text-center">
                <div className="bg-yellow-500/20 p-4 rounded-full inline-block mb-4 border border-yellow-500/30">
                    <Lock className="text-yellow-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Limite do Plano Atingido</h3>
                <p className="text-gray-400 mb-6">
                    Você atingiu o limite de {clientLimit} pacientes do seu plano atual. Faça um upgrade para continuar crescendo.
                </p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => { navigate('/dashboard/settings', { state: { openBilling: true } }); }}
                        className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg font-bold hover:from-yellow-500 hover:to-orange-500 transition shadow-lg flex items-center justify-center gap-2"
                    >
                        <Zap size={18} fill="currentColor" /> Fazer Upgrade
                    </button>
                    <button 
                        onClick={() => setShowUpgradeModal(false)}
                        className="text-gray-500 hover:text-white text-sm font-medium transition"
                    >
                        Agora não
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* ... MODALS DE CADASTRO, PRONTUÁRIO, ARQUIVOS, RECEITA, EMAIL, DELETE, IMPORT (Mantidos do anterior) ... */}
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
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF *</label>
                        <input required className="w-full border border-gray-700 bg-gray-800 text-white rounded p-2 focus:ring-primary outline-none" value={formData.cpf} onChange={e => {
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
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Nascimento *</label>
                        <input required type="date" className="w-full border border-gray-700 bg-gray-800 text-white rounded p-2 focus:ring-primary outline-none" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
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
                            <span className="text-xs text-green-200 uppercase font-bold">Processados com Sucesso</span>
                        </div>
                        <div className={`border p-3 rounded-lg text-center ${importResult.errorCount > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-800 border-gray-700'}`}>
                            <span className={`block text-2xl font-bold ${importResult.errorCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>{importResult.errorCount}</span>
                            <span className={`text-xs uppercase font-bold ${importResult.errorCount > 0 ? 'text-red-200' : 'text-gray-500'}`}>Erros / Falhas</span>
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

      {/* RECORDS, FILES, PRESCRIPTION MODALS (Same as before) */}
      {recordsModalOpen && selectedClientForRecords && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in-up">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ClipboardList className="text-primary"/> Prontuário Clínico
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Paciente: {selectedClientForRecords.name}</p>
                    </div>
                    <button onClick={() => setRecordsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>

                {/* ADICIONAR NOVO REGISTRO */}
                <div className="mb-6 bg-gray-800/50 p-4 rounded-lg border border-white/5 shrink-0">
                    <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center"><Plus size={14} className="mr-1"/> Adicionar Evolução</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Dentista</label>
                            <select 
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded p-2 outline-none focus:border-primary"
                                value={newRecord.dentist_id}
                                onChange={e => setNewRecord({...newRecord, dentist_id: e.target.value})}
                            >
                                <option value="">Selecione...</option>
                                {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Data e Hora</label>
                            <input 
                                type="datetime-local" 
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded p-2 outline-none focus:border-primary"
                                value={newRecord.date}
                                onChange={e => setNewRecord({...newRecord, date: e.target.value})}
                            />
                        </div>
                    </div>
                    <textarea 
                        className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded p-2 outline-none focus:border-primary h-20 resize-none mb-3"
                        placeholder="Descreva o procedimento realizado..."
                        value={newRecord.description}
                        onChange={e => setNewRecord({...newRecord, description: e.target.value})}
                    />
                    <div className="flex justify-end">
                        <button 
                            onClick={handleSaveNewRecord} 
                            disabled={savingRecord}
                            className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded hover:bg-green-700 transition flex items-center shadow-sm disabled:opacity-50"
                        >
                            {savingRecord ? <Loader2 className="animate-spin mr-2" size={14}/> : <Save className="mr-2" size={14}/>} Salvar Registro
                        </button>
                    </div>
                </div>

                {/* LISTA DE REGISTROS */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {loadingRecords ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary"/></div>
                    ) : patientRecords.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-lg">
                            <ClipboardList size={48} className="mx-auto mb-2 opacity-20"/>
                            <p>Nenhum registro encontrado.</p>
                            <button onClick={() => { setRecordsModalOpen(false); navigate('/dashboard/smart-record'); }} className="mt-4 text-primary hover:underline text-sm">Criar novo registro com IA</button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {patientRecords.map((record) => (
                                <div key={record.id} className="relative pl-6 border-l-2 border-gray-700 hover:border-primary transition-colors pb-6 last:pb-0">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-900 border-2 border-primary"></div>
                                    <div className="bg-gray-800/50 rounded-lg p-4 border border-white/5 shadow-sm">
                                        <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-primary"/>
                                                <span className="font-bold text-white text-sm">
                                                    {format(parseISO(record.created_at || record.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                </span>
                                            </div>
                                            {record.dentist?.name && (
                                                <span className="text-xs bg-gray-900 text-gray-400 px-2 py-1 rounded border border-white/10">
                                                    Dr(a). {record.dentist.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                                            {record.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {filesModalOpen && selectedClientForFiles && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in-up">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Folder className="text-yellow-500"/> Arquivos e Imagens
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Paciente: {selectedClientForFiles.name}</p>
                    </div>
                    <button onClick={() => setFilesModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>

                {/* Upload Area */}
                <div className="mb-6 shrink-0">
                    <button 
                        onClick={() => patientFileInputRef.current?.click()} 
                        disabled={uploadingFile}
                        className="w-full border-2 border-dashed border-gray-700 bg-gray-800/30 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-800 hover:border-primary/50 hover:text-primary transition-all group disabled:opacity-50"
                    >
                        {uploadingFile ? (
                            <Loader2 className="animate-spin mb-2" size={24}/> 
                        ) : (
                            <Upload className="mb-2 group-hover:scale-110 transition-transform" size={24}/>
                        )}
                        <span className="text-sm font-bold">{uploadingFile ? "Enviando..." : "Clique para enviar um arquivo"}</span>
                        <span className="text-xs text-gray-500 mt-1">Imagens, PDF, Raio-X (Máx 10MB)</span>
                    </button>
                    <input type="file" ref={patientFileInputRef} className="hidden" onChange={handlePatientFileUpload} />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {loadingFiles ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary"/></div>
                    ) : patientFiles.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            Nenhum arquivo armazenado para este paciente.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {patientFiles.map((file, idx) => (
                                <div key={idx} className="bg-gray-800 p-3 rounded-lg border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-gray-900 rounded text-gray-400">
                                            <File size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-white font-medium truncate" title={file.name}>
                                                {file.name.replace(/^\d+_/, '')}
                                            </p>
                                            <p className="text-[10px] text-gray-500">
                                                {new Date(file.created_at).toLocaleDateString('pt-BR')} • {(file.metadata?.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleFileDownload(file.name)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition" title="Baixar/Visualizar">
                                            <Eye size={16} />
                                        </button>
                                        <button onClick={() => handleFileDelete(file.name)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition" title="Excluir">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {prescriptionModalOpen && selectedClientForPrescription && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-2xl w-full max-w-2xl animate-fade-in-up">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="text-primary"/> Nova Receita / Documento
                    </h2>
                    <button onClick={() => setPrescriptionModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>
                
                <div className="mb-4 text-sm text-gray-400">
                    Paciente: <strong className="text-white">{selectedClientForPrescription.name}</strong>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dentista Responsável (Assinatura)</label>
                    <select 
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded p-2 focus:ring-primary outline-none"
                        value={prescriptionDentistId}
                        onChange={(e) => setPrescriptionDentistId(e.target.value)}
                    >
                        <option value="">Selecione...</option>
                        {dentists.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                <textarea 
                    className="w-full h-64 bg-gray-800 border border-gray-700 text-white p-4 rounded-lg focus:ring-primary focus:border-primary outline-none resize-none font-mono text-sm leading-relaxed"
                    value={prescriptionText}
                    onChange={(e) => setPrescriptionText(e.target.value)}
                    placeholder="Digite a prescrição ou atestado aqui..."
                />

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setPrescriptionModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white font-bold transition">Cancelar</button>
                    
                    <button onClick={handleDownloadPDF} className="px-4 py-2 border border-white/10 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-700 transition flex items-center">
                        <Printer size={18} className="mr-2"/> Imprimir / PDF
                    </button>
                    
                    <button 
                        onClick={handleSendEmail} 
                        disabled={sendingEmail}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-sky-600 transition flex items-center shadow-lg disabled:opacity-50"
                    >
                        {sendingEmail ? <Loader2 className="animate-spin mr-2" size={18}/> : <Send size={18} className="mr-2"/>} 
                        Enviar por E-mail
                    </button>
                </div>
            </div>
        </div>
      )}

      {missingEmailModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
                <div className="bg-yellow-900/20 p-3 rounded-full inline-block mb-4">
                    <Mail className="text-yellow-500" size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">E-mail não cadastrado</h3>
                <p className="text-gray-400 mb-6 text-sm">
                    Para enviar a receita, precisamos do e-mail de <strong>{selectedClientForPrescription?.name}</strong>.
                </p>
                <div className="text-left mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail do Paciente</label>
                    <input 
                        type="email" 
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded p-2 focus:ring-primary outline-none"
                        value={newEmailAddress}
                        onChange={(e) => setNewEmailAddress(e.target.value)}
                        autoFocus
                        placeholder="exemplo@email.com"
                    />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setMissingEmailModalOpen(false)} className="flex-1 px-4 py-2 text-gray-400 hover:text-white font-bold transition">Cancelar</button>
                    <button onClick={handleSaveMissingEmail} disabled={processing} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-sky-600 font-bold transition shadow-lg flex justify-center items-center">
                        {processing ? <Loader2 className="animate-spin" size={18}/> : 'Salvar e Enviar'}
                    </button>
                </div>
            </div>
        </div>
      )}

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
                   <li><strong>Receita Digital:</strong> Clique no ícone de texto para criar uma receita, gerar PDF ou enviar por e-mail direto para o paciente.</li>
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
