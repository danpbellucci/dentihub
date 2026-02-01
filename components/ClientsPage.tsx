
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Client, Dentist, ClinicalRecord } from '../types';
import * as XLSX from 'xlsx';
import { 
  Plus, Search, Edit2, Trash2, Upload, Loader2, X, User, 
  HelpCircle, ClipboardList, ScrollText, Calendar, Download, 
  FileText, Save, AlertTriangle
} from 'lucide-react';
import { format, isAfter, parseISO, isValid } from 'date-fns';
import { jsPDF } from 'jspdf';
import Toast, { ToastType } from './Toast';
import { validateCPF } from '../utils/validators';
import { useLocation, useNavigate } from 'react-router-dom';

interface ExtendedClient extends Client {
  next_return_date?: string | null;
  appointments?: { return_date: string | null }[];
}

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<ExtendedClient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [clinicName, setClinicName] = useState('Minha Clínica');
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'return_date'>('name');
  const [filterReturnOnly, setFilterReturnOnly] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [processingDelete, setProcessingDelete] = useState(false);
  
  // Context State
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Feature Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedClientForRecord, setSelectedClientForRecord] = useState<Client | null>(null);
  const [clientRecords, setClientRecords] = useState<ClinicalRecord[]>([]);
  const [newRecordDesc, setNewRecordDesc] = useState('');
  const [newRecordDentist, setNewRecordDentist] = useState('');
  const [newRecordDate, setNewRecordDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedClientForPrescription, setSelectedClientForPrescription] = useState<Client | null>(null);
  const [prescriptionText, setPrescriptionText] = useState('');
  const [selectedDentistForPrescription, setSelectedDentistForPrescription] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    initialize();
    
    // Auto-open modal if requested via navigation state (Onboarding flow)
    if (location.state?.openModal) {
        openModal();
    }
  }, []);

  const initialize = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get Clinic ID
    const { data: profile } = await supabase.from('user_profiles').select('clinic_id').eq('id', user.id).single();
    const id = profile?.clinic_id || user.id;
    setClinicId(id);

    // 2. Get Tier & Clinic Info
    const { data: clinic } = await supabase.from('clinics').select('subscription_tier, name').eq('id', id).single();
    if (clinic) {
        setCurrentTier(clinic.subscription_tier || 'free');
        setClinicName(clinic.name);
    }

    // 3. Fetch Data
    await Promise.all([
        fetchClients(id),
        fetchDentists(id)
    ]);
    
    setLoading(false);
  };

  const fetchDentists = async (id: string) => {
      const { data } = await supabase.from('dentists').select('*').eq('clinic_id', id).order('name');
      if (data) setDentists(data as Dentist[]);
  };

  const fetchClients = async (id: string) => {
    const { data } = await supabase.from('clients').select('*, appointments(return_date)').eq('clinic_id', id).order('name');
    
    if (data) {
        const processed: ExtendedClient[] = data.map((c: any) => {
            let nextReturn = null;
            if (c.appointments && c.appointments.length > 0) {
               const today = new Date();
               today.setHours(0,0,0,0);
               const returns = c.appointments
                 .map((a: any) => a.return_date)
                 .filter((d: string) => d && isAfter(parseISO(d), today))
                 .sort();
               if (returns.length > 0) nextReturn = returns[0];
            }
            return { ...c, next_return_date: nextReturn };
        });
        setClients(processed);
    }
  };

  // --- RECORD LOGIC ---
  const fetchClientRecords = async (clientId: string) => {
    const { data } = await supabase.from('clinical_records').select('*, dentist:dentists(name)').eq('client_id', clientId).order('date', { ascending: false });
    return data as unknown as ClinicalRecord[] || [];
  };

  const handleOpenRecordModal = async (client: Client) => {
    setSelectedClientForRecord(client);
    setNewRecordDesc(''); 
    setNewRecordDentist(''); 
    setNewRecordDate(format(new Date(), 'yyyy-MM-dd'));
    setIsRecordModalOpen(true);
    const records = await fetchClientRecords(client.id);
    setClientRecords(records);
  };

  const handleSaveRecord = async () => {
     if (!selectedClientForRecord || !newRecordDesc || !newRecordDentist || !clinicId) {
         setToast({ message: "Preencha a descrição e selecione o dentista.", type: 'warning' });
         return;
     }
     setSaving(true);
     try {
         const { error } = await supabase.from('clinical_records').insert({
             clinic_id: clinicId, client_id: selectedClientForRecord.id, dentist_id: newRecordDentist, description: newRecordDesc, date: newRecordDate
         });
         if (error) throw error;
         const records = await fetchClientRecords(selectedClientForRecord.id);
         setClientRecords(records);
         setNewRecordDesc('');
         setToast({ message: "Prontuário atualizado!", type: 'success' });
     } catch (err: any) {
         setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
     } finally { setSaving(false); }
  };

  // --- PRESCRIPTION LOGIC ---
  const handleOpenPrescriptionModal = (client: Client) => {
      setSelectedClientForPrescription(client); setSelectedDentistForPrescription(''); setPrescriptionText(''); 
      setIsPrescriptionModalOpen(true);
  };

  const handlePrintPrescription = () => {
      if (!selectedDentistForPrescription || !selectedClientForPrescription) {
          setToast({ message: "Selecione o dentista.", type: 'warning' });
          return;
      }
      const dentist = dentists.find(d => d.id === selectedDentistForPrescription);
      const doc = new jsPDF();
      const today = format(new Date(), 'dd/MM/yyyy');
      
      doc.setFont("helvetica", "bold"); 
      doc.setFontSize(16);
      doc.text(clinicName, 105, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.text("Receituário", 105, 30, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(`Paciente: ${selectedClientForPrescription.name}`, 20, 50);
      doc.text(`Data: ${today}`, 190, 50, { align: "right" });

      doc.setFont("helvetica", "normal"); 
      const splitText = doc.splitTextToSize(prescriptionText, 170);
      doc.text(splitText, 20, 70);
      
      // Assinatura
      doc.setFont("helvetica", "bold");
      doc.text(`Dr(a). ${dentist?.name || ''}`, 105, 250, { align: "center" });
      
      if (dentist?.cro) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(`CRO: ${dentist.cro}`, 105, 256, { align: "center" });
      }
      
      doc.save(`Receita_${selectedClientForPrescription.name}.pdf`);
  };

  // --- EXCEL IMPORT ---
  const downloadTemplate = () => {
      const headers = ["Nome Completo", "Email", "Telefone", "CPF", "Data Nascimento (DD/MM/AAAA)", "Endereço", "Observações"];
      const data = [headers, ["Exemplo da Silva", "exemplo@email.com", "(11) 99999-9999", "000.000.000-00", "01/01/1990", "Rua Exemplo, 123", "Alergia a dipirona"]];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo Pacientes");
      XLSX.writeFile(wb, "modelo_pacientes_dentihub.xlsx");
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

          // Filtra linhas válidas (que possuem nome)
          const rows = data.slice(1).filter(r => r[0]);
          const newEntriesCount = rows.length;

          // Verificar Limites do Plano
          let limit = Infinity;
          if (currentTier === 'free') limit = 30;
          if (currentTier === 'starter') limit = 100;

          // Buscar contagem atual no banco para garantir precisão
          const { count: currentCount } = await supabase
              .from('clients')
              .select('*', { count: 'exact', head: true })
              .eq('clinic_id', clinicId);
          
          const totalAfterImport = (currentCount || 0) + newEntriesCount;

          if (totalAfterImport > limit) {
              setLoading(false);
              setToast({ 
                  message: `Importação cancelada: O total (${totalAfterImport}) excede o limite do seu plano ${currentTier.toUpperCase()} (${limit} pacientes). Faça upgrade para continuar.`, 
                  type: 'error' 
              });
              if (fileInputRef.current) fileInputRef.current.value = "";
              return;
          }
          
          let successCount = 0;
          let errors = 0;
          
          for (const row of rows) {
              let birthDate = null;
              const rawDate = row[4];
              
              if (rawDate) {
                  if (rawDate instanceof Date) {
                      birthDate = rawDate.toISOString().split('T')[0];
                  } else if (typeof rawDate === 'string') {
                      const parts = rawDate.trim().split('/');
                      if (parts.length === 3) {
                          birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                      } else {
                          birthDate = rawDate;
                      }
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
                  const { error } = await supabase.from('clients').insert(payload);
                  if (error) throw error;
                  successCount++;
              } catch (err) {
                  console.error("Erro importação:", err);
                  errors++;
              }
          }

          setLoading(false);
          setToast({ 
              message: `Importação concluída: ${successCount} salvos, ${errors} erros.`, 
              type: errors > 0 ? 'warning' : 'success' 
          });
          
          fetchClients(clinicId);
          if (fileInputRef.current) fileInputRef.current.value = "";
      };
      
      reader.readAsBinaryString(file);
  };

  // --- CRUD OPERATIONS ---
  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      let limit = Infinity;
      if (currentTier === 'free') limit = 30;
      if (currentTier === 'starter') limit = 100;
      
      if (clients.length >= limit) {
           setToast({ message: `Seu plano (${currentTier}) permite apenas ${limit} pacientes. Faça upgrade para adicionar mais.`, type: 'warning' });
           return;
      }
      setEditingClient(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    // Validação obrigatória de CPF
    if (!formData.cpf) {
        setToast({ message: "O CPF é obrigatório.", type: 'error' });
        return;
    }
    if (!validateCPF(formData.cpf)) {
        setToast({ message: "CPF inválido.", type: 'error' });
        return;
    }

    setSaving(true);
    try {
      // Explicitamente construir o payload apenas com os campos que existem na tabela 'clients'
      // Isso remove propriedades extras como 'appointments' ou 'next_return_date' que podem vir do objeto de edição.
      const payload = { 
          clinic_id: clinicId,
          name: formData.name,
          email: formData.email || null,
          whatsapp: formData.whatsapp || null,
          cpf: formData.cpf,
          address: formData.address || null,
          birth_date: formData.birth_date || null,
          clinical_notes: formData.clinical_notes || null
      };
      
      if (editingClient) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
        if (error) throw error;
        setToast({ message: "Paciente atualizado com sucesso!", type: 'success' });
      } else {
        const { data: newClient, error } = await supabase.from('clients').insert(payload).select().single();
        if (error) throw error;
        
        setToast({ message: "Paciente cadastrado com sucesso!", type: 'success' });

        // Enviar e-mail de boas-vindas se houver e-mail cadastrado
        if (newClient && newClient.email) {
            try {
                // Tenta enviar o e-mail em background
                await supabase.functions.invoke('send-emails', {
                    body: {
                        type: 'welcome',
                        recipients: [{ 
                            id: newClient.id, 
                            name: newClient.name, 
                            email: newClient.email 
                        }],
                        // CRITICAL: Incluir a origem para que o link "Agendar Online" funcione no e-mail
                        origin: window.location.origin 
                    }
                });
                console.log("E-mail de boas-vindas enviado com sucesso.");
            } catch (mailErr) {
                console.error("Erro ao enviar e-mail de boas-vindas:", mailErr);
                // Não exibir erro ao usuário se o cadastro funcionou, mas o e-mail falhou
            }
        }
      }
      
      setIsModalOpen(false);
      fetchClients(clinicId);

      // Return to onboarding if applicable
      if (location.state?.returnToOnboarding) {
          navigate('/dashboard', { state: { showOnboarding: true } });
      }

    } catch (err: any) {
      setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setProcessingDelete(true);
    try {
      const { error } = await supabase.from('clients').delete().eq('id', deleteId);
      if (error) throw error;
      setToast({ message: "Paciente excluído com sucesso.", type: 'success' });
      if (clinicId) fetchClients(clinicId);
    } catch (err: any) {
      setToast({ message: "Erro ao excluir: " + err.message, type: 'error' });
    } finally {
      setProcessingDelete(false);
      setDeleteId(null);
    }
  };

  const processedList = clients
    .filter(c => (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf?.includes(searchTerm)))
    .sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : (new Date(a.next_return_date || '9999').getTime() - new Date(b.next_return_date || '9999').getTime()));

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-gray-500 font-medium">Carregando dados...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold text-gray-800">Pacientes</h1>
            <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors"><HelpCircle size={20} /></button>
        </div>
        <div className="flex space-x-2">
          {/* Import Controls */}
          <div className="flex gap-2 mr-2">
              <button 
                onClick={downloadTemplate}
                className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition"
                title="Baixar Modelo Excel"
              >
                  <Download size={16} className="mr-1"/> Modelo
              </button>
              <label className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition cursor-pointer">
                  <Upload size={16} className="mr-1"/> Importar Excel
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
              </label>
          </div>

          <button onClick={() => openModal()} className="flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold">
            <Plus size={18} className="mr-2" /> Novo
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input type="text" placeholder="Buscar por nome ou CPF..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-primary outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="name">Nome (A-Z)</option>
                <option value="return_date">Data Retorno</option>
            </select>
            <button onClick={() => setFilterReturnOnly(!filterReturnOnly)} className={`flex items-center px-3 py-2 border rounded-lg text-sm ${filterReturnOnly ? 'bg-blue-50 border-primary text-primary' : 'bg-white'}`}>
                <Calendar size={14} className="mr-2" /> Com Retorno
            </button>
        </div>
      </div>

      {/* Client List (Original Style) */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {processedList
                .filter(c => !filterReturnOnly || c.next_return_date)
                .map((client) => (
              <li key={client.id} className="p-4 hover:bg-gray-50 flex justify-between items-center group">
                <div className="flex-1 cursor-pointer" onClick={() => openModal(client)}>
                  <div className="flex items-center flex-wrap gap-2">
                    <p className="text-lg font-bold text-primary hover:underline">{client.name}</p>
                    {client.next_return_date && <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">Retorno: {format(parseISO(client.next_return_date), 'dd/MM/yyyy')}</span>}
                  </div>
                  <p className="text-sm text-gray-500">{client.whatsapp || 'Sem telefone'} {client.cpf && `| ${client.cpf}`}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <button onClick={() => handleOpenPrescriptionModal(client)} className="p-2 text-gray-400 hover:text-green-600" title="Receita"><ScrollText size={18}/></button>
                  <button onClick={() => handleOpenRecordModal(client)} className="p-2 text-gray-400 hover:text-indigo-600" title="Prontuário"><ClipboardList size={18}/></button>
                  <div className="w-px h-6 bg-gray-200 mx-2"></div>
                  <button onClick={(e) => { e.stopPropagation(); openModal(client); }} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 size={18}/></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(client.id); }} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18}/></button>
                </div>
              </li>
            ))}
            {processedList.length === 0 && <li className="p-12 text-center text-gray-500">Nenhum paciente encontrado.</li>}
          </ul>
      </div>

      {/* Main Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-black uppercase text-gray-800 flex items-center gap-2">
                <User className="text-gray-700" size={24} />
                {editingClient ? 'Editar Paciente' : 'Novo Paciente'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  required 
                  className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-700 placeholder-gray-400" 
                  placeholder="Ex: João da Silva"
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">E-mail</label>
                  <input 
                    type="email" 
                    className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-700 placeholder-gray-400" 
                    placeholder="email@exemplo.com"
                    value={formData.email || ''} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">WhatsApp</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-700 placeholder-gray-400" 
                    placeholder="(00) 00000-0000"
                    value={formData.whatsapp || ''} 
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">CPF *</label>
                  <input 
                    type="text"
                    required
                    maxLength={14}
                    className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-700 placeholder-gray-400" 
                    placeholder="000.000.000-00"
                    value={formData.cpf || ''} 
                    onChange={e => {
                      let v = e.target.value.replace(/\D/g, '');
                      if (v.length > 11) v = v.slice(0, 11);
                      v = v.replace(/(\d{3})(\d)/, '$1.$2');
                      v = v.replace(/(\d{3})(\d)/, '$1.$2');
                      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                      setFormData({...formData, cpf: v});
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Nascimento</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-700 placeholder-gray-400 appearance-none" 
                      value={formData.birth_date || ''} 
                      onChange={e => setFormData({...formData, birth_date: e.target.value})} 
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                      <Calendar size={18} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Endereço Residencial</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-700 placeholder-gray-400" 
                  placeholder="Logradouro, Nº, Cidade - UF"
                  value={formData.address || ''} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Alergias / Observações Rápidas</label>
                <textarea 
                  className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-700 placeholder-gray-400 h-24 resize-none" 
                  placeholder="Informações críticas de saúde..."
                  value={formData.clinical_notes || ''} 
                  onChange={e => setFormData({...formData, clinical_notes: e.target.value})} 
                />
              </div>
              
              <div className="pt-6 border-t border-gray-100 flex justify-end items-center gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 font-bold hover:text-gray-700 transition-colors"
                >
                  Voltar
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="bg-primary text-white font-bold py-3 px-6 rounded-lg shadow hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[160px]"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : 'Concluir Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-100 p-3 rounded-full inline-block mb-4">
                <AlertTriangle className="text-red-600" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Paciente?</h3>
             <p className="text-gray-600 mb-6 text-sm">
               Tem certeza que deseja remover este paciente? Esta ação não pode ser desfeita e removerá todo o histórico dele.
             </p>
             <div className="flex space-x-3 w-full">
                <button 
                  onClick={() => setDeleteId(null)}
                  disabled={processingDelete}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={processingDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg shadow-red-200 flex items-center justify-center"
                >
                  {processingDelete ? <Loader2 className="animate-spin" size={20}/> : 'Sim, Excluir'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Record Modal */}
      {isRecordModalOpen && selectedClientForRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
             <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">Prontuário: {selectedClientForRecord.name}</h2>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase">Novo Registro</h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Data</label>
                            <input type="date" className="w-full border rounded p-2 text-sm" value={newRecordDate} onChange={e => setNewRecordDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Dentista</label>
                            <select className="w-full border rounded p-2 text-sm" value={newRecordDentist} onChange={e => setNewRecordDentist(e.target.value)}>
                                <option value="">Selecione...</option>
                                {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <textarea 
                        className="w-full border rounded p-2 text-sm h-24 mb-3 resize-none focus:ring-1 focus:ring-primary outline-none" 
                        placeholder="Descreva o procedimento realizado..."
                        value={newRecordDesc}
                        onChange={e => setNewRecordDesc(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end">
                        <button 
                            onClick={handleSaveRecord} 
                            disabled={saving}
                            className="bg-primary text-white px-4 py-2 rounded font-bold text-sm hover:bg-sky-600 transition flex items-center"
                        >
                            {saving ? <Loader2 className="animate-spin mr-2" size={14}/> : <Save className="mr-2" size={14}/>}
                            Salvar Registro
                        </button>
                    </div>
                </div>

                <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase">Histórico</h4>
                <div className="space-y-4">
                    {clientRecords.map(record => (
                        <div key={record.id} className="bg-white border rounded-lg p-3 shadow-sm">
                            <div className="flex justify-between items-center border-b pb-2 mb-2">
                                <span className="font-bold text-primary text-sm">{format(parseISO(record.date), 'dd/MM/yyyy')}</span>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{record.dentist?.name}</span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.description}</p>
                        </div>
                    ))}
                    {clientRecords.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Nenhum histórico disponível.</p>}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {isPrescriptionModalOpen && selectedClientForPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg animate-fade-in-up">
             <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">Nova Receita</h2>
              <button onClick={() => setIsPrescriptionModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            
            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Paciente</label>
                <input type="text" disabled value={selectedClientForPrescription.name} className="w-full bg-gray-100 border rounded p-2 text-sm text-gray-600" />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Dentista Responsável</label>
                <select 
                    className="w-full border rounded p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={selectedDentistForPrescription}
                    onChange={e => setSelectedDentistForPrescription(e.target.value)}
                >
                    <option value="">Selecione...</option>
                    {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-1">Prescrição</label>
                <textarea 
                    className="w-full border rounded p-3 text-sm h-40 resize-none outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Digite os medicamentos e instruções..."
                    value={prescriptionText}
                    onChange={e => setPrescriptionText(e.target.value)}
                ></textarea>
            </div>

            <div className="flex justify-end gap-3">
                <button onClick={() => setIsPrescriptionModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancelar</button>
                <button 
                    onClick={handlePrintPrescription}
                    className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 transition flex items-center"
                >
                    <ScrollText className="mr-2" size={18}/> Gerar PDF
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center text-gray-800 gap-2"><HelpCircle className="text-primary"/> Ajuda - Pacientes</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-600">
                <p>Aqui você gerencia todo o cadastro de pacientes da clínica.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Novo:</strong> Adicione novos pacientes.</li>
                   <li><strong>Importar Excel:</strong> Cadastre múltiplos pacientes de uma vez via planilha.</li>
                   <li><strong>Ações:</strong> Use os ícones à direita para emitir receitas, ver prontuário, editar ou excluir.</li>
                   <li><strong>Busca:</strong> Pesquise por nome ou CPF na barra superior.</li>
                   <li><strong>Retorno:</strong> Filtre pacientes que têm data de retorno agendada.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
