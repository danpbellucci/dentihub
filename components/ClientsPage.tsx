
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Client, Dentist } from '../types';
import { useDashboard } from './DashboardLayout';
import { 
  Users, Search, Plus, Edit2, Trash2, Phone, Mail, FileText, 
  CheckCircle, Loader2, Upload, Download, X, ClipboardList, 
  FolderOpen, Printer, Send, Save, Image as ImageIcon, AlertTriangle, PenTool,
  Activity, Ban, Hammer, Shield, Box, Lock, Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import { validateCPF } from '../utils/validators';
import Toast, { ToastType } from './Toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DentalArch, { ToothCondition } from './DentalArch';
import { useNavigate } from 'react-router-dom';

// Mapeamento de condições para rótulos legíveis
const CONDITIONS_MAP: Record<string, { label: string, color: string, icon: any }> = {
    healthy: { label: 'Saudável / Limpar', color: 'bg-gray-200 text-gray-800', icon: CheckCircle },
    carie: { label: 'Cárie', color: 'bg-red-500 text-white', icon: Activity },
    restoration: { label: 'Restauração', color: 'bg-blue-500 text-white', icon: Hammer },
    canal: { label: 'Canal (Endo)', color: 'bg-green-500 text-white', icon: Shield },
    protese: { label: 'Prótese/Coroa', color: 'bg-yellow-500 text-white', icon: Box },
    implant: { label: 'Implante', color: 'bg-purple-500 text-white', icon: PenTool },
    missing: { label: 'Extraído/Ausente', color: 'bg-slate-600 text-white', icon: Ban },
};

// Helper to mask date DD/MM/AAAA
const maskDate = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length <= 2) return v;
    if (v.length <= 4) return v.replace(/(\d{2})(\d)/, '$1/$2');
    return v.replace(/(\d{2})(\d{2})(\d)/, '$1/$2/$3');
};

// Helper to convert DD/MM/AAAA to YYYY-MM-DD
const dateToIso = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
};

// Helper to convert YYYY-MM-DD to DD/MM/AAAA
const isoToDate = (isoStr: string) => {
    if (!isoStr || !isoStr.includes('-')) return isoStr;
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
};

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
  
  // Odontogram State - Atualizado para array de condições
  const [showOdontogram, setShowOdontogram] = useState(false);
  const [toothConditions, setToothConditions] = useState<Record<string, ToothCondition[]>>({});
  const [toothNotes, setToothNotes] = useState<Record<string, string>>({});
  const [activeTooth, setActiveTooth] = useState<string | null>(null);

  // Files State
  const [patientFiles, setPatientFiles] = useState<any[]>([]);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  // CRUD Client Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
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
  const navigate = useNavigate();

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
      if (type === 'files') {
          const tier = userProfile?.clinics?.subscription_tier || 'free';
          if (tier === 'free') {
              setToast({ message: "Gestão de arquivos disponível apenas nos planos Starter e Pro.", type: 'warning' });
              return;
          }
          fetchFiles(client.id);
      }

      if (type === 'records') {
          // Reset odontogram state first
          setShowOdontogram(false);
          setToothConditions({});
          setToothNotes({});
          setActiveTooth(null);
          // Then fetch records which will populate the odontogram with history
          fetchRecords(client.id);
      }

      setActionModal({ type, client });
      setPrescriptionText('');
      setNewRecordText('');
      setSelectedDentistId(''); 
  };

  // --- RECORDS LOGIC ---
  const fetchRecords = async (clientId: string) => {
      const { data } = await supabase
          .from('clinical_records')
          .select('*, dentist:dentists(name)')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }); // Do mais recente para o mais antigo para a lista

      setPatientRecords(data || []);

      // Lógica para reconstruir o Odontograma Atual
      if (data) {
          const history = [...data].reverse(); // Inverte para cronológico (Antigo -> Novo)
          const currentMouthState: Record<string, ToothCondition[]> = {};
          
          history.forEach(record => {
              if (record.tooth_data) {
                  Object.entries(record.tooth_data).forEach(([toothId, conditions]) => {
                      if (Array.isArray(conditions)) {
                          currentMouthState[toothId] = conditions as ToothCondition[];
                      }
                  });
              }
          });
          setToothConditions(currentMouthState);
      }
  };

  const handleToothClick = (toothId: string) => {
      setActiveTooth(toothId);
  };

  const handleSetCondition = (condition: ToothCondition) => {
      if (!activeTooth) return;

      setToothConditions((prev: Record<string, ToothCondition[]>) => {
          const newState = { ...prev };
          const currentConditions = newState[activeTooth] || [];

          if (condition === 'healthy') {
              // Se selecionar saudável, limpa tudo
              delete newState[activeTooth];
              
              const newNotes = { ...toothNotes };
              delete newNotes[activeTooth];
              setToothNotes(newNotes);
          } else {
              // Lógica de Toggle (Adicionar/Remover)
              if (currentConditions.includes(condition)) {
                  // Se já existe, remove
                  const updated = currentConditions.filter(c => c !== condition);
                  if (updated.length === 0) {
                      delete newState[activeTooth];
                  } else {
                      newState[activeTooth] = updated;
                  }
              } else {
                  // Se não existe, adiciona
                  // Remove 'healthy' se estiver presente antes de adicionar outro
                  const filtered = currentConditions.filter(c => c !== 'healthy');
                  newState[activeTooth] = [...filtered, condition];
              }

              // Atualiza nota automática com todas as condições
              const updatedConditions = newState[activeTooth] as ToothCondition[] | undefined;
              if (updatedConditions && updatedConditions.length > 0) {
                const labels = (updatedConditions as ToothCondition[]).map(c => CONDITIONS_MAP[c as string]?.label).join(' + ');
                setToothNotes(prevNotes => ({
                    ...prevNotes,
                    [activeTooth]: labels
                }));
              } else {
                  const newNotes = { ...toothNotes };
                  delete newNotes[activeTooth];
                  setToothNotes(newNotes);
              }
          }
          return newState;
      });
  };

  const handleToothNoteChange = (toothId: string, text: string) => {
      setToothNotes(prev => ({
          ...prev,
          [toothId]: text
      }));
  };

  const handleSaveRecord = async () => {
      const hasText = !!newRecordText.trim();
      const hasOdontogram = Object.keys(toothConditions).length > 0;

      if ((!hasText && !hasOdontogram) || !selectedDentistId || !actionModal.client) {
          setToast({ message: "Selecione o dentista e preencha o prontuário ou odontograma.", type: 'warning' });
          return;
      }
      setProcessing(true);
      try {
          let fullDescription = newRecordText;
          let changedTeethData: Record<string, ToothCondition[]> | null = null;
          
          if (hasOdontogram) {
              const odontogramText = Object.entries(toothConditions).map(([toothId, conditions]) => {
                  const labels = (conditions as ToothCondition[]).map(c => CONDITIONS_MAP[c as string]?.label || c).join(', ');
                  const note = toothNotes[toothId] ? ` (${toothNotes[toothId]})` : '';
                  return `Dente #${toothId}: ${labels}${note}`;
              }).join('\n');
              
              if (fullDescription) fullDescription += '\n\n';
              fullDescription += `[ODONTOGRAMA]\n${odontogramText}`;
              
              // Salva o estado atual dos dentes no JSONB para reconstrução futura
              changedTeethData = toothConditions;
          }

          const { error } = await supabase.from('clinical_records').insert({
              clinic_id: userProfile?.clinic_id,
              client_id: actionModal.client.id,
              dentist_id: selectedDentistId,
              description: fullDescription,
              tooth_data: changedTeethData, // Salva o JSON estruturado
              date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString()
          });

          if (error) throw error;
          setToast({ message: "Prontuário salvo!", type: 'success' });
          
          setNewRecordText('');
          // NÃO limpamos toothConditions aqui para manter o visual atualizado no modal
          // setToothConditions({}); 
          setActiveTooth(null);
          
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
      
      // Validação de Segurança do Cliente
      if (!userProfile?.clinic_id) {
          setToast({ message: "Erro de sessão. Recarregue a página.", type: 'error' });
          return;
      }

      setProcessing(true);
      const file = e.target.files[0];
      const filePath = `${userProfile.clinic_id}/${actionModal.client.id}/${Date.now()}_${file.name}`;
      
      try {
          const { error } = await supabase.storage.from('patient-files').upload(filePath, file);
          if (error) throw error;
          setToast({ message: "Arquivo enviado!", type: 'success' });
          fetchFiles(actionModal.client.id);
      } catch (err: any) {
          console.error(err);
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
        birth_date: client.birth_date ? isoToDate(client.birth_date) : '',
        clinical_notes: client.clinical_notes || ''
      });
    } else {
      // Check limits before opening new client modal
      // Logic: if custom_clients_limit is present, use it. Otherwise assume infinite.
      const currentCount = clients.length;
      const limit = userProfile?.clinics?.custom_clients_limit;
      
      if (limit !== null && limit !== undefined && currentCount >= limit) {
           setShowUpgradeModal(true);
           return;
      }
      
      setEditingClient(null);
      setFormData({ name: '', email: '', whatsapp: '', cpf: '', address: '', birth_date: '', clinical_notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.clinic_id) return;
    
    // Validação: Campos Obrigatórios
    if (!formData.birth_date) {
        setToast({ message: "A Data de Nascimento é obrigatória.", type: 'error' });
        return;
    }

    if (formData.birth_date.length < 10) {
        setToast({ message: "Data de Nascimento incompleta (DD/MM/AAAA).", type: 'error' });
        return;
    }

    if (!formData.cpf) {
        setToast({ message: "O CPF é obrigatório.", type: 'error' });
        return;
    }

    if (!validateCPF(formData.cpf)) {
        setToast({ message: "CPF inválido.", type: 'error' });
        return;
    }

    // Validação: Pelo menos um contato
    if (!formData.whatsapp && !formData.email) {
        setToast({ message: "Preencha pelo menos um contato (WhatsApp ou E-mail).", type: 'warning' });
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
            birth_date: formData.birth_date ? dateToIso(formData.birth_date) : null,
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

  const handleDownloadTemplate = () => {
      const ws = XLSX.utils.aoa_to_sheet([["Nome Completo", "Email", "Telefone/WhatsApp", "CPF", "Data Nascimento (AAAA-MM-DD)", "Endereço"], ["João Silva", "joao@email.com", "11999999999", "000.000.000-00", "1990-01-01", "Rua A, 123"]]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo_Pacientes");
      XLSX.writeFile(wb, "Modelo_Importacao_Pacientes_DentiHub.xlsx");
  };

  const handleFileUploadImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!userProfile?.clinic_id) return;
      
      // Check limits before processing file
      const currentCount = clients.length;
      const limit = userProfile?.clinics?.custom_clients_limit;

      if (limit !== null && limit !== undefined && currentCount >= limit) {
           setShowUpgradeModal(true);
           return;
      }

      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          
          if (data.length <= 1) { setToast({ message: "Arquivo vazio ou inválido.", type: 'warning' }); return; }
          
          const rows = data.slice(1).filter(r => r[0]); 
          
          // Check if import will exceed limit
          if (limit !== null && limit !== undefined && (currentCount + rows.length) > limit) {
              setToast({ message: `Importação cancelada. Você excederia o limite de ${limit} pacientes.`, type: 'error' });
              return;
          }

          setLoading(true);
          let successCount = 0;
          let errors: string[] = [];
          for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const payload = { clinic_id: userProfile.clinic_id, name: row[0], email: row[1] || null, whatsapp: row[2] ? row[2].toString() : null, cpf: row[3] ? row[3].toString() : null, birth_date: row[4] ? row[4].toString() : null, address: row[5] || null };
              try {
                  if (!payload.name) throw new Error("Nome obrigatório.");
                  const { error } = await supabase.from('clients').insert(payload);
                  if (error) throw error;
                  successCount++;
              } catch (err: any) { errors.push(`Linha ${i + 2} (${row[0] || 'Sem Nome'}): ${err.message}`); }
          }
          setLoading(false);
          setImportResult({ show: true, successCount, errorCount: errors.length, errors });
          fetchClients();
          if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.readAsBinaryString(file);
  };

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.cpf && c.cpf.includes(searchTerm)));

  const clientLimit = userProfile?.clinics?.custom_clients_limit !== undefined && userProfile?.clinics?.custom_clients_limit !== null ? userProfile.clinics.custom_clients_limit : '∞';

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-primary" /> Pacientes
            <span className="text-sm font-normal bg-gray-800 text-gray-400 px-2.5 py-0.5 rounded-lg border border-white/10">{clients.length} <span className="text-gray-600">/</span> {clientLimit}</span>
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleDownloadTemplate} className="hidden sm:flex items-center justify-center px-4 py-2 bg-gray-900 border border-white/10 text-gray-300 rounded hover:bg-gray-800 transition shadow-sm font-bold text-sm"><Download size={16} className="mr-2" /> Modelo</button>
            <button onClick={() => fileInputRef.current?.click()} className="hidden sm:flex items-center justify-center px-4 py-2 bg-gray-900 border border-white/10 text-gray-300 rounded hover:bg-gray-800 transition shadow-sm font-bold text-sm"><Upload size={16} className="mr-2" /> Importar</button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUploadImport} />
            <button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold text-sm"><Plus size={18} className="mr-2" /> Novo Paciente</button>
        </div>
      </div>
      
      <div className="bg-gray-900/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-white/5 mb-6">
        <div className="relative"><Search className="absolute left-3 top-2.5 text-gray-500" size={20} /><input type="text" placeholder="Buscar por nome ou CPF..." className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:ring-primary outline-none placeholder-gray-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
      </div>

      {/* --- LIST VIEW (TABLE) --- */}
      <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-gray-800/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Paciente</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Ações Clínicas</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Gerenciar</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent">
                    {filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-800/50 transition duration-150 ease-in-out">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold mr-3 border border-white/10 shrink-0">
                                        {client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{client.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">{client.cpf || 'Sem CPF'}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center text-xs text-gray-400">
                                        <Phone size={12} className="mr-2 text-green-500"/> {client.whatsapp || '-'}
                                    </div>
                                    <div className="flex items-center text-xs text-gray-400">
                                        <Mail size={12} className="mr-2 text-blue-500"/> {client.email || '-'}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleOpenAction('prescription', client)} className="inline-flex items-center px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 hover:text-blue-400 transition text-xs font-medium group" title="Receita">
                                        <FileText size={14} className="mr-1.5" /> Receita
                                    </button>
                                    <button onClick={() => handleOpenAction('records', client)} className="inline-flex items-center px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 hover:text-green-400 transition text-xs font-medium group" title="Prontuário">
                                        <ClipboardList size={14} className="mr-1.5" /> Prontuário
                                    </button>
                                    <button onClick={() => handleOpenAction('files', client)} className="inline-flex items-center px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 hover:text-yellow-400 transition text-xs font-medium group" title="Arquivos">
                                        <FolderOpen size={14} className="mr-1.5" /> Arquivos
                                    </button>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleOpenModal(client)} className="p-2 text-gray-400 hover:text-blue-400 rounded-full hover:bg-blue-900/20 transition" title="Editar">
                                        <Edit2 size={16}/>
                                    </button>
                                    <button onClick={() => setDeleteId(client.id)} className="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-red-900/20 transition" title="Excluir">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      
      {filteredClients.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500 bg-gray-900/30 rounded-lg border border-white/5 mt-4">
              <Users size={48} className="mx-auto mb-2 opacity-20"/>
              <p>Nenhum paciente encontrado.</p>
          </div>
      )}

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
                        onClick={() => navigate('/dashboard/settings', { state: { openBilling: true } })}
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

      {/* --- PRONTUÁRIO MODAL --- */}
      {actionModal.type === 'records' && actionModal.client && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4 shrink-0">
                      <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardList className="text-green-400"/> Prontuário Clínico</h2><p className="text-xs text-gray-400 mt-1">Paciente: {actionModal.client.name}</p></div>
                      <button onClick={() => setActionModal({type: null, client: null})} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg mb-4 shrink-0 border border-white/5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <div className="flex gap-4 mb-2">
                          <div className="flex-1"><select className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary text-sm" value={selectedDentistId} onChange={e => setSelectedDentistId(e.target.value)}><option value="">Dentista Responsável...</option>{dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                          <button onClick={() => setShowOdontogram(!showOdontogram)} className={`px-3 py-2 rounded font-bold transition flex items-center text-sm border ${showOdontogram ? 'bg-blue-900/40 text-blue-300 border-blue-500/50' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'}`} title="Abrir Odontograma"><PenTool size={16} className="mr-2"/> Odontograma</button>
                          <button onClick={handleSaveRecord} disabled={processing} className="px-4 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 transition flex items-center shadow-sm text-sm disabled:opacity-50">{processing ? <Loader2 className="animate-spin mr-2"/> : <Plus className="mr-2" size={16}/>} Adicionar</button>
                      </div>
                      
                      {showOdontogram && (
                          <div className="mb-4 animate-fade-in relative">
                              <div className="bg-gray-900 border border-white/10 rounded-lg p-2 mb-3">
                                  <DentalArch toothConditions={toothConditions} onToothClick={handleToothClick} />
                              </div>
                              {activeTooth && (
                                  <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-white/20 rounded-xl shadow-2xl p-4 z-10 w-64 animate-fade-in-down">
                                      <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2"><h4 className="text-sm font-bold text-white">Dente #{activeTooth}</h4><button onClick={() => setActiveTooth(null)} className="text-gray-400 hover:text-white"><X size={16}/></button></div>
                                      <div className="grid grid-cols-2 gap-2">
                                          {Object.entries(CONDITIONS_MAP).map(([key, config]) => {
                                              const isActive = toothConditions[activeTooth]?.includes(key as any);
                                              return (
                                                  <button key={key} onClick={() => handleSetCondition(key as any)} className={`flex items-center gap-2 p-2 rounded text-xs font-bold transition ${isActive ? 'ring-2 ring-white ' + config.color : config.color.replace('text-white', 'text-white/80 bg-opacity-70')}`}><config.icon size={12} />{config.label.split('/')[0]}</button>
                                              )
                                          })}
                                      </div>
                                  </div>
                              )}
                              <div className="flex flex-wrap gap-3 justify-center mb-4 px-2">{Object.entries(CONDITIONS_MAP).filter(([k]) => k !== 'healthy').map(([key, config]) => (<div key={key} className="flex items-center gap-1.5 bg-gray-900/50 px-2 py-1 rounded border border-white/5"><div className={`w-3 h-3 rounded-full ${config.color.split(' ')[0]}`}></div><span className="text-[10px] text-gray-400 font-bold uppercase">{config.label}</span></div>))}</div>
                              {Object.keys(toothConditions).length > 0 && (
                                  <div className="space-y-2 bg-blue-900/10 p-3 rounded-lg border border-blue-500/20">
                                      <p className="text-xs font-bold text-blue-300 uppercase mb-2">Observações por Dente</p>
                                      {Object.keys(toothConditions).map(tooth => (
                                          <div key={tooth} className="flex items-center gap-2">
                                              <span className="text-xs font-bold text-gray-400 w-24 text-right flex items-center justify-end gap-1">
                                                  <div className="flex gap-0.5">
                                                      {toothConditions[tooth].map((c, i) => (
                                                          <div key={i} className={`w-2 h-2 rounded-full ${CONDITIONS_MAP[c as string]?.color?.split(' ')[0] || 'bg-gray-400'}`}></div>
                                                      ))}
                                                  </div>
                                                  #{tooth}:
                                              </span>
                                              <input className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none" placeholder={`Detalhes...`} value={toothNotes[tooth] || ''} onChange={(e) => handleToothNoteChange(tooth, e.target.value)} />
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}
                      <textarea className="w-full h-24 bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary resize-none text-sm" placeholder="Descreva o procedimento realizado..." value={newRecordText} onChange={e => setNewRecordText(e.target.value)}></textarea>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">{patientRecords.length === 0 ? (<div className="text-center py-12 text-gray-500">Nenhum registro encontrado.</div>) : (patientRecords.map((rec) => (<div key={rec.id} className="bg-gray-800/30 border border-white/5 p-4 rounded-lg"><div className="flex justify-between items-start mb-2"><div><span className="text-xs font-bold text-primary uppercase bg-blue-900/20 px-2 py-0.5 rounded border border-blue-500/20">{rec.dentist?.name || 'Dentista Excluído'}</span><span className="text-[10px] text-gray-500 ml-2">{format(parseISO(rec.created_at), "dd/MM/yyyy 'às' HH:mm")}</span></div></div><p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{rec.description}</p></div>)))}</div>
              </div>
          </div>
      )}

      {/* 1. RECEITA MODAL */}
      {actionModal.type === 'prescription' && actionModal.client && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                      <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="text-blue-400"/> Nova Receita</h2><p className="text-xs text-gray-400 mt-1">Paciente: {actionModal.client.name}</p></div>
                      <button onClick={() => setActionModal({type: null, client: null})} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  <div className="space-y-4 flex-1">
                      <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Dentista Responsável</label><select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={selectedDentistId} onChange={e => setSelectedDentistId(e.target.value)}><option value="">Selecione...</option>{dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                      <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Prescrição</label><textarea className="w-full h-64 bg-white text-black border border-gray-300 rounded p-4 outline-none focus:border-primary resize-none font-mono text-sm" placeholder="Ex: Amoxicilina 500mg..." value={prescriptionText} onChange={e => setPrescriptionText(e.target.value)}></textarea></div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10"><button onClick={() => handleGeneratePDF(true)} disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition flex items-center shadow-sm disabled:opacity-50 text-sm">{processing ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2" size={16}/>} Enviar por Email</button><button onClick={() => handleGeneratePDF(false)} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition flex items-center shadow-sm disabled:opacity-50 text-sm"><Printer className="mr-2" size={16}/> Gerar PDF</button></div>
              </div>
          </div>
      )}

      {/* 3. ARQUIVOS MODAL */}
      {actionModal.type === 'files' && actionModal.client && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                      <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><FolderOpen className="text-yellow-400"/> Arquivos e Exames</h2><p className="text-xs text-gray-400 mt-1">Paciente: {actionModal.client.name}</p></div>
                      <button onClick={() => setActionModal({type: null, client: null})} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  <div className="flex justify-between items-center mb-4 bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400">Formatos aceitos: Imagens e PDF (Máx 10MB)</div>
                      <div><button onClick={() => fileUploadRef.current?.click()} disabled={processing} className="px-4 py-2 bg-gray-700 text-white rounded font-bold hover:bg-gray-600 transition flex items-center shadow-sm text-sm disabled:opacity-50">{processing ? <Loader2 className="animate-spin mr-2"/> : <Upload className="mr-2" size={16}/>} Upload Arquivo</button><input type="file" ref={fileUploadRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} /></div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {patientFiles.length === 0 ? (<div className="text-center py-12 text-gray-500">Nenhum arquivo encontrado.</div>) : (patientFiles.map((file) => (<div key={file.id} className="flex justify-between items-center bg-gray-800/30 border border-white/5 p-3 rounded-lg hover:bg-gray-800/50 transition"><div className="flex items-center gap-3 overflow-hidden">{file.metadata?.mimetype === 'application/pdf' ? <FileText className="text-red-400 shrink-0"/> : <ImageIcon className="text-blue-400 shrink-0"/>}<div className="flex flex-col overflow-hidden"><a href="#" onClick={async (e) => { e.preventDefault(); const { data } = await supabase.storage.from('patient-files').createSignedUrl(`${userProfile?.clinic_id}/${actionModal.client?.id}/${file.name}`, 60); if (data?.signedUrl) window.open(data.signedUrl, '_blank'); }} className="text-sm font-bold text-white hover:text-primary truncate transition-colors">{file.name}</a><span className="text-[10px] text-gray-500">{format(parseISO(file.created_at), "dd/MM/yyyy HH:mm")} • {(file.metadata?.size / 1024).toFixed(1)} KB</span></div></div><button onClick={() => handleDeleteFile(file.name)} disabled={processing} className="text-gray-500 hover:text-red-400 p-2"><Trash2 size={16}/></button></div>)))}
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
                          <div><label className="block text-xs font-bold text-gray-400 mb-1 uppercase">CPF *</label><input required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.cpf} onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 11) v = v.slice(0, 11); v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); setFormData({...formData, cpf: v}); }} maxLength={14}/></div>
                          <div><label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Data Nasc. *</label><input required type="text" placeholder="DD/MM/AAAA" maxLength={10} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: maskDate(e.target.value)})} /></div>
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
