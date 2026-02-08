
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Dentist, ServiceItem } from '../types';
import { Plus, Edit2, Trash2, X, Loader2, User, Phone, Mail, HelpCircle, Clock, DollarSign, ShieldCheck, AlertTriangle, Check, Tag, Upload, Download, CheckCircle, Lock, Zap, Stethoscope } from 'lucide-react';
import * as XLSX from 'xlsx';
import Toast, { ToastType } from './Toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { validateCPF } from '../utils/validators';

const initialSchedule = {
  monday: { active: true, start: '08:00', end: '18:00', pause_start: '12:00', pause_end: '14:00' },
  tuesday: { active: true, start: '08:00', end: '18:00', pause_start: '12:00', pause_end: '14:00' },
  wednesday: { active: true, start: '08:00', end: '18:00', pause_start: '12:00', pause_end: '14:00' },
  thursday: { active: true, start: '08:00', end: '18:00', pause_start: '12:00', pause_end: '14:00' },
  friday: { active: true, start: '08:00', end: '18:00', pause_start: '12:00', pause_end: '14:00' },
  saturday: { active: false, start: '08:00', end: '12:00', pause_start: '', pause_end: '' },
  sunday: { active: false, start: '08:00', end: '12:00', pause_start: '', pause_end: '' },
  blocked_dates: [] as any[]
};

const DentistsPage: React.FC = () => {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDentist, setEditingDentist] = useState<Dentist | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    cro: '',
    phone: '',
    email: '',
    cpf: '',
    color: '#0ea5e9',
    specialties: '' 
  });

  const [schedule, setSchedule] = useState<any>(initialSchedule);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [plans, setPlans] = useState<string[]>([]);
  
  const [newPlan, setNewPlan] = useState('');
  const [newService, setNewService] = useState({ name: '', price: '', duration: '60', is_variable_price: false, covered_by_plans: false });
  
  const [blockDate, setBlockDate] = useState('');
  const [blockAllDay, setBlockAllDay] = useState(true);
  const [blockStart, setBlockStart] = useState('08:00');
  const [blockEnd, setBlockEnd] = useState('12:00');

  // Import Result Modal
  const [importResult, setImportResult] = useState<{
      show: boolean;
      successCount: number;
      errorCount: number;
      errors: string[];
  }>({ show: false, successCount: 0, errorCount: 0, errors: [] });

  // UPGRADE MODAL
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clinicId, setClinicId] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    initialize();
    if ((location.state as any)?.openModal) handleOpenModal();
  }, []);

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let targetClinicId = user.id;
    const { data: profile } = await supabase.from('user_profiles').select('clinic_id').eq('id', user.id).maybeSingle();
    if (profile) targetClinicId = profile.clinic_id;
    
    setClinicId(targetClinicId);

    const { data: clinicData } = await supabase.from('clinics').select('subscription_tier').eq('id', targetClinicId).single();
    if (clinicData) setCurrentTier(clinicData.subscription_tier || 'free');

    fetchDentists(targetClinicId);
  };

  const fetchDentists = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase.from('dentists').select('*').eq('clinic_id', id).order('name');
    if (error) setToast({ message: "Erro ao carregar dentistas", type: 'error' });
    else {
        const parsedData = data.map((d: any) => ({
            ...d,
            services: typeof d.services === 'string' ? [] : (d.services || []),
            schedule_config: typeof d.schedule_config === 'string' ? JSON.parse(d.schedule_config) : (d.schedule_config || initialSchedule)
        }));
        setDentists(parsedData as Dentist[]);
    }
    setLoading(false);
  };

  const handleOpenModal = (dentist?: Dentist) => {
    if (dentist) {
      setEditingDentist(dentist);
      setFormData({
        name: dentist.name,
        cro: dentist.cro || '',
        phone: dentist.phone || '',
        email: dentist.email || '',
        cpf: dentist.cpf || '',
        color: dentist.color || '#0ea5e9',
        specialties: dentist.specialties ? dentist.specialties.join(', ') : ''
      });
      setSchedule(dentist.schedule_config || initialSchedule);
      
      let loadedServices: ServiceItem[] = [];
      if (Array.isArray(dentist.services)) {
          loadedServices = dentist.services.map((s: any) => {
              if (typeof s === 'string') {
                  try { 
                      const parsed = JSON.parse(s); 
                      return { 
                          name: parsed.name, 
                          price: parsed.price || 0, 
                          duration: parsed.duration || 60, 
                          is_variable_price: parsed.is_variable_price || false,
                          covered_by_plans: parsed.covered_by_plans || false
                      };
                  } catch { 
                      return { name: s, price: 0, duration: 60, is_variable_price: false, covered_by_plans: false }; 
                  }
              }
              return s;
          });
      }
      setServices(loadedServices);
      setPlans(dentist.accepted_plans || []);
    } else {
      let limit = Infinity;
      if (currentTier === 'free') limit = 1;
      if (currentTier === 'starter') limit = 3;
      if (currentTier === 'pro') limit = 5;

      if (dentists.length >= limit) {
           setShowUpgradeModal(true);
           return;
      }

      setEditingDentist(null);
      setFormData({ name: '', cro: '', phone: '', email: '', cpf: '', color: '#0ea5e9', specialties: '' });
      setSchedule(JSON.parse(JSON.stringify(initialSchedule)));
      setServices([]);
      setPlans([]);
    }
    setNewPlan('');
    setNewService({ name: '', price: '', duration: '60', is_variable_price: false, covered_by_plans: false });
    setIsModalOpen(true);
  };

  const updateScheduleDay = (day: string, field: string, value: any) => {
      setSchedule((prev: any) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleAddPlan = () => {
      if (!newPlan.trim()) return;
      if (!plans.includes(newPlan.trim())) setPlans([...plans, newPlan.trim()]);
      setNewPlan('');
  };
  const removePlan = (plan: string) => setPlans(plans.filter(p => p !== plan));

  const handleAddService = () => {
      if (!newService.name.trim()) return;
      setServices([...services, { ...newService, price: Number(newService.price), duration: Number(newService.duration) }]);
      setNewService({ name: '', price: '', duration: '60', is_variable_price: false, covered_by_plans: false });
  };
  const removeService = (index: number) => setServices(services.filter((_, i) => i !== index));

  const handleBlockDate = () => {
      if (!blockDate) return;
      const blocked = schedule.blocked_dates || [];
      const newBlock = { date: blockDate, allDay: blockAllDay, start: blockAllDay ? null : blockStart, end: blockAllDay ? null : blockEnd };
      const exists = blocked.some((b: any) => (typeof b === 'string' ? b : b.date) === blockDate);
      if (!exists) setSchedule({ ...schedule, blocked_dates: [...blocked, newBlock] });
      setBlockDate('');
      setBlockAllDay(true);
  };
  const removeBlockedDate = (index: number) => {
      const newBlocked = [...(schedule.blocked_dates || [])];
      newBlocked.splice(index, 1);
      setSchedule({ ...schedule, blocked_dates: newBlocked });
  };

  const formatDateSafe = (dateString: string) => {
      if(!dateString) return '';
      const [y, m, d] = dateString.split('-');
      return `${d}/${m}/${y}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    if (!formData.cpf) { setToast({ message: "O CPF é obrigatório.", type: 'error' }); return; }
    if (!validateCPF(formData.cpf)) { setToast({ message: "CPF inválido.", type: 'error' }); return; }
    if (!formData.email) { setToast({ message: "O E-mail é obrigatório.", type: 'error' }); return; }
    if (!formData.cro) { setToast({ message: "O CRO é obrigatório.", type: 'error' }); return; }
    if (!formData.specialties) { setToast({ message: "Informe ao menos uma especialidade.", type: 'error' }); return; }

    setProcessing(true);
    try {
      const specialtiesArray = formData.specialties.split(',').map(s => s.trim()).filter(s => s);
      const payload = {
        clinic_id: clinicId,
        name: formData.name,
        cro: formData.cro,
        phone: formData.phone || null,
        email: formData.email,
        cpf: formData.cpf,
        specialties: specialtiesArray,
        color: formData.color,
        schedule_config: schedule,
        accepted_plans: plans,
        services: services
      };

      if (editingDentist) {
        // 1. Atualiza dados na tabela de Dentistas (Dados de Negócio)
        const { error } = await supabase.from('dentists').update(payload).eq('id', editingDentist.id);
        if (error) throw error;

        // 2. Se o e-mail foi alterado, deve-se atualizar o Login (Auth) e o Perfil (User Profiles)
        if (editingDentist.email && formData.email && editingDentist.email !== formData.email) {
            
            const { data, error: functionError } = await supabase.functions.invoke('update-user-email', {
                body: { 
                    oldEmail: editingDentist.email, 
                    newEmail: formData.email,
                    clinicId: clinicId
                }
            });
            
            if (functionError || (data && data.error)) {
                console.error("Erro ao atualizar login:", functionError || data?.error);
                setToast({ message: "Dentista salvo, mas houve erro ao atualizar o e-mail de login. Contate o suporte.", type: 'warning' });
            } else {
                setToast({ message: "Dentista e acesso atualizados!", type: 'success' });
            }
        } else {
            setToast({ message: "Dentista atualizado!", type: 'success' });
        }

      } else {
        const { error } = await supabase.from('dentists').insert(payload);
        if (error) throw error;
        
        try {
            await supabase.functions.invoke('send-emails', { body: { type: 'invite_dentist', recipients: [{ name: formData.name, email: formData.email }] } });
            await supabase.from('user_profiles').insert({ email: formData.email, role: 'dentist', clinic_id: clinicId });
        } catch (mailErr) { console.error("Erro ao enviar convite:", mailErr); }

        setToast({ message: "Dentista cadastrado!", type: 'success' });
      }
      setIsModalOpen(false);
      fetchDentists(clinicId);
    } catch (error: any) { setToast({ message: "Erro ao salvar: " + error.message, type: 'error' }); } 
    finally { setProcessing(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setProcessing(true);
    try {
        const { error } = await supabase.from('dentists').delete().eq('id', deleteId);
        if (error) throw error;
        setToast({ message: "Dentista excluído.", type: 'success' });
        if (clinicId) fetchDentists(clinicId);
    } catch (error: any) { setToast({ message: "Erro ao excluir: " + error.message, type: 'error' }); } 
    finally { setProcessing(false); setDeleteId(null); }
  };

  const handleDownloadTemplate = () => {
      const ws = XLSX.utils.aoa_to_sheet([
          ["Nome Completo", "Email", "Telefone", "CRO", "CPF", "Especialidades (separadas por vírgula)"],
          ["Dr. Exemplo", "dr.exemplo@email.com", "11999999999", "12345", "000.000.000-00", "Ortodontia, Implante"]
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo_Dentistas");
      XLSX.writeFile(wb, "Modelo_Importacao_Dentistas_DentiHub.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!clinicId) { setToast({message: "Erro de identificação da clínica", type: 'error'}); return; }

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

          const rows = data.slice(1).filter(r => r[0]); // Ignora cabeçalho e linhas vazias
          const newEntriesCount = rows.length;

          // Verificar Limites do Plano
          let limit = Infinity;
          if (currentTier === 'free') limit = 1;
          if (currentTier === 'starter') limit = 3;
          if (currentTier === 'pro') limit = 5;

          const { count: currentCount } = await supabase
              .from('dentists')
              .select('*', { count: 'exact', head: true })
              .eq('clinic_id', clinicId);
          
          const totalAfterImport = (currentCount || 0) + newEntriesCount;

          if (totalAfterImport > limit) {
              setLoading(false);
              setImportResult({
                  show: true,
                  successCount: 0,
                  errorCount: newEntriesCount,
                  errors: [`Importação cancelada: O total excederia o limite do plano (${limit} dentistas). Faça upgrade.`]
              });
              if (fileInputRef.current) fileInputRef.current.value = "";
              return;
          }
          
          let successCount = 0;
          let errors: string[] = [];
          
          for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              // Mapeamento: 0:Nome, 1:Email, 2:Telefone, 3:CRO, 4:CPF, 5:Especialidades
              
              const specialtiesArray = row[5] ? row[5].toString().split(',').map((s:string) => s.trim()) : [];

              const payload = {
                  clinic_id: clinicId,
                  name: row[0],
                  email: row[1],
                  phone: row[2] ? row[2].toString() : null,
                  cro: row[3] ? row[3].toString() : null,
                  cpf: row[4] ? row[4].toString() : null,
                  specialties: specialtiesArray,
                  color: '#0ea5e9', // Default color
                  schedule_config: initialSchedule
              };

              try {
                  if (!payload.name || !payload.email || !payload.cpf) {
                      throw new Error("Campos obrigatórios faltando (Nome, Email ou CPF).");
                  }
                  
                  const { error } = await supabase.from('dentists').insert(payload);
                  if (error) throw error;
                  
                  // Tenta convidar (Silent fail se der erro no envio de email, mas conta como sucesso no cadastro)
                  try {
                      await supabase.functions.invoke('send-emails', { body: { type: 'invite_dentist', recipients: [{ name: payload.name, email: payload.email }] } });
                      await supabase.from('user_profiles').insert({ email: payload.email, role: 'dentist', clinic_id: clinicId });
                  } catch (e) {}

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
          fetchDentists(clinicId);
          if (fileInputRef.current) fileInputRef.current.value = "";
      };
      
      reader.readAsBinaryString(file);
  };

  const filteredDentists = dentists.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const daysOfWeek = [ { key: 'monday', label: 'Segunda' }, { key: 'tuesday', label: 'Terça' }, { key: 'wednesday', label: 'Quarta' }, { key: 'thursday', label: 'Quinta' }, { key: 'friday', label: 'Sexta' }, { key: 'saturday', label: 'Sábado' }, { key: 'sunday', label: 'Domingo' } ];

  if (loading) return <div className="flex h-96 w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  const dentistLimit = currentTier === 'free' ? 1 : currentTier === 'starter' ? 3 : 5;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* ... Header e Search Bar ... */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    Dentistas
                    <span className="text-sm font-normal bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-white/10">
                        {dentists.length} / {dentistLimit}
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

            <button onClick={() => handleOpenModal()} className="flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold text-sm">
                <Plus size={18} className="mr-2" /> Novo
            </button>
        </div>
      </div>

      <div className="bg-gray-900/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-white/5 mb-6">
        <div className="relative">
          <User className="absolute left-3 top-2.5 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:ring-primary outline-none placeholder-gray-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid de Dentistas - Layout Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDentists.map(dentist => (
          <div 
            key={dentist.id} 
            className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow border border-white/5 overflow-hidden hover:border-white/20 transition-all group relative flex flex-col h-full"
            style={{ borderLeftWidth: '4px', borderLeftColor: dentist.color }}
          >
            <div className="p-4 flex-1">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 shadow-sm border border-white/10" style={{ backgroundColor: dentist.color }}>
                        {dentist.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm leading-tight truncate max-w-[150px] sm:max-w-[200px]" title={dentist.name}>{dentist.name}</h3>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{dentist.cro ? `CRO: ${dentist.cro}` : 'Sem CRO'}</p>
                    </div>
                </div>
              </div>
              
              <div className="space-y-1.5 mb-3 pt-2 border-t border-white/5">
                  <div className="flex items-center text-xs text-gray-400 truncate" title={dentist.email || ''}>
                      <Mail size={12} className="mr-2 text-gray-600 flex-shrink-0"/> 
                      {dentist.email || '---'}
                  </div>
                  <div className="flex items-center text-xs text-gray-400 truncate">
                      <Phone size={12} className="mr-2 text-gray-600 flex-shrink-0"/> 
                      {dentist.phone || '---'}
                  </div>
              </div>

              <div className="flex flex-wrap gap-1">
                  {dentist.specialties && dentist.specialties.length > 0 ? (
                      dentist.specialties.map((spec, i) => (
                          <span key={i} className="bg-gray-800 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase truncate max-w-[100px]">{spec}</span>
                      ))
                  ) : (
                      <span className="text-[10px] text-gray-600 italic">Clínico Geral</span>
                  )}
              </div>
            </div>

            <div className="bg-gray-800/30 px-4 py-2 border-t border-white/5 flex justify-end gap-2 mt-auto">
                <button onClick={() => handleOpenModal(dentist)} className="flex items-center px-2 py-1 text-xs font-bold text-blue-400 hover:bg-blue-500/10 rounded transition">
                    <Edit2 size={12} className="mr-1"/> Editar
                </button>
                <button onClick={() => setDeleteId(dentist.id)} className="flex items-center px-2 py-1 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded transition">
                    <Trash2 size={12} className="mr-1"/> Excluir
                </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDentists.length === 0 && (
          <div className="text-center py-12 text-gray-500">
              <User size={48} className="mx-auto mb-2 opacity-20"/>
              <p>Nenhum dentista encontrado.</p>
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
                    Você atingiu o limite de {dentistLimit} dentistas do seu plano atual. Faça um upgrade para continuar crescendo.
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

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-100 p-3 rounded-full inline-block mb-4">
                <Trash2 className="text-red-600" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Dentista?</h3>
             <p className="text-gray-600 mb-6 text-sm">
               Tem certeza que deseja remover este profissional? Agendamentos futuros podem ser afetados.
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
                  onClick={confirmDelete}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg shadow-red-200 flex items-center justify-center"
                >
                  {processing ? <Loader2 className="animate-spin" size={20}/> : 'Sim, Excluir'}
                </button>
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
                            <span className="text-xs text-green-200 uppercase font-bold">Processados</span>
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

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
              <h2 className="text-xl font-bold text-white">
                {editingDentist ? 'Editar Dentista' : 'Novo Dentista'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* 1. DADOS PESSOAIS */}
                <div className="space-y-4 mb-6">
                    <h3 className="font-bold text-gray-300 border-b border-white/10 pb-2 flex items-center text-sm uppercase tracking-wide"><User size={16} className="mr-2 text-primary"/> Dados Pessoais</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo *</label>
                            <input required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-primary outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail (Login) *</label>
                            <input 
                                required 
                                type="email" 
                                className={`w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-primary outline-none ${editingDentist ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                disabled={!!editingDentist}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone</label>
                            <input className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-primary outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CRO *</label>
                            <input required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-primary outline-none" value={formData.cro} onChange={e => setFormData({...formData, cro: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF *</label>
                            <input required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-primary outline-none" value={formData.cpf} onChange={e => {
                                let v = e.target.value.replace(/\D/g, '');
                                if (v.length > 11) v = v.slice(0, 11);
                                v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                setFormData({...formData, cpf: v});
                            }} maxLength={14} />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Especialidades *</label>
                                <input required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-primary outline-none" placeholder="Ex: Ortodontia, Implantodontia" value={formData.specialties} onChange={e => setFormData({...formData, specialties: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cor</label>
                                <input type="color" className="h-10 w-full rounded cursor-pointer bg-gray-800 border border-gray-700 p-1" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. PLANOS */}
                <div className="space-y-4 mb-6">
                    <h3 className="font-bold text-gray-300 border-b border-white/10 pb-2 flex items-center text-sm uppercase tracking-wide"><ShieldCheck size={16} className="mr-2 text-primary"/> Planos Aceitos</h3>
                    <div className="flex gap-2">
                        <input 
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-primary outline-none" 
                            placeholder="Nome do plano (ex: Amil)" 
                            value={newPlan} 
                            onChange={e => setNewPlan(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPlan())}
                        />
                        <button type="button" onClick={handleAddPlan} className="bg-gray-700 px-4 rounded hover:bg-gray-600 text-white font-bold text-sm">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {plans.map(p => (
                            <span key={p} className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-xs font-bold flex items-center border border-blue-500/30">
                                {p} <button type="button" onClick={() => removePlan(p)} className="ml-2 hover:text-white"><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* 3. SERVIÇOS */}
                <div className="space-y-4 mb-6">
                    <h3 className="font-bold text-gray-300 border-b border-white/10 pb-2 flex items-center text-sm uppercase tracking-wide"><DollarSign size={16} className="mr-2 text-primary"/> Serviços</h3>
                    <div className="grid grid-cols-12 gap-2 items-end bg-gray-800/50 p-3 rounded-lg border border-white/5">
                        <div className="col-span-5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nome</label>
                            <input className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-sm text-white focus:border-primary outline-none" placeholder="Ex: Limpeza" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})}/>
                        </div>
                        <div className="col-span-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Preço (R$)</label>
                            <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-sm text-white focus:border-primary outline-none" placeholder="0.00" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} disabled={newService.is_variable_price}/>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Minutos</label>
                            <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-sm text-white focus:border-primary outline-none" value={newService.duration} onChange={e => setNewService({...newService, duration: e.target.value})}/>
                        </div>
                        <div className="col-span-2">
                             <button type="button" onClick={handleAddService} className="w-full bg-primary text-white p-1.5 rounded text-xs font-bold hover:bg-sky-600 h-[34px]">Add</button>
                        </div>
                        <div className="col-span-12 flex gap-4 mt-2">
                            <label className="flex items-center text-xs text-gray-400 cursor-pointer"><input type="checkbox" className="mr-2 bg-gray-700 border-gray-600 rounded" checked={newService.is_variable_price} onChange={e => setNewService({...newService, is_variable_price: e.target.checked, price: e.target.checked ? '' : newService.price})}/> A combinar</label>
                            <label className="flex items-center text-xs text-gray-400 cursor-pointer"><input type="checkbox" className="mr-2 bg-gray-700 border-gray-600 rounded" checked={newService.covered_by_plans} onChange={e => setNewService({...newService, covered_by_plans: e.target.checked})}/> Aceita Plano</label>
                        </div>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                        {services.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-gray-800 p-2 rounded text-xs border border-gray-700">
                                <div>
                                    <span className="font-bold text-gray-200 block">{s.name}</span>
                                    <span className="text-[10px] text-gray-500">{s.covered_by_plans ? 'Aceita Plano' : 'Particular'} • {s.is_variable_price ? 'A combinar' : ''}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-400">{s.duration}min</span>
                                    <span className="font-bold text-green-400">{s.is_variable_price ? '---' : `R$ ${Number(s.price).toFixed(2)}`}</span>
                                    <button type="button" onClick={() => removeService(i)} className="text-gray-500 hover:text-red-400"><X size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. DISPONIBILIDADE */}
                <div className="space-y-4 mb-6">
                    <h3 className="font-bold text-gray-300 border-b border-white/10 pb-2 flex items-center text-sm uppercase tracking-wide"><Clock size={16} className="mr-2 text-primary"/> Horários</h3>
                    <div className="space-y-2 bg-gray-800/30 p-3 rounded-lg border border-white/5">
                        {daysOfWeek.map(({ key, label }) => {
                            const dayConfig = schedule[key];
                            return (
                                <div key={key} className="flex items-center gap-2 text-sm">
                                    <div className="w-24 flex items-center">
                                        <input type="checkbox" checked={dayConfig.active} onChange={e => updateScheduleDay(key, 'active', e.target.checked)} className="mr-2 bg-gray-700 border-gray-600 rounded text-primary"/>
                                        <span className={dayConfig.active ? 'text-gray-200' : 'text-gray-500'}>{label}</span>
                                    </div>
                                    {dayConfig.active && (
                                        <>
                                            <input type="time" className="bg-gray-900 border border-gray-700 rounded p-1 text-xs text-white" value={dayConfig.start} onChange={e => updateScheduleDay(key, 'start', e.target.value)} />
                                            <span className="text-gray-500">-</span>
                                            <input type="time" className="bg-gray-900 border border-gray-700 rounded p-1 text-xs text-white" value={dayConfig.end} onChange={e => updateScheduleDay(key, 'end', e.target.value)} />
                                            <span className="text-[10px] text-gray-500 ml-2">Pausa:</span>
                                            <input type="time" className="bg-gray-900 border border-gray-700 rounded p-1 text-xs text-white" value={dayConfig.pause_start} onChange={e => updateScheduleDay(key, 'pause_start', e.target.value)} />
                                            <span className="text-gray-500">-</span>
                                            <input type="time" className="bg-gray-900 border border-gray-700 rounded p-1 text-xs text-white" value={dayConfig.pause_end} onChange={e => updateScheduleDay(key, 'pause_end', e.target.value)} />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 5. DATAS BLOQUEADAS */}
                <div className="space-y-4">
                    <div className="bg-red-900/10 p-4 rounded-lg border border-red-500/20">
                        <h3 className="font-bold text-red-400 mb-3 flex items-center text-sm"><AlertTriangle size={14} className="mr-2"/> Bloqueios (Férias/Feriados)</h3>
                        <div className="flex flex-wrap gap-2 items-end mb-3">
                            <div><label className="text-[10px] text-red-400 block mb-1">Data</label><input type="date" className="bg-gray-900 border border-red-500/30 rounded p-1.5 text-xs text-white" value={blockDate} onChange={e => setBlockDate(e.target.value)} /></div>
                            <div className="flex items-center pb-2"><input type="checkbox" checked={blockAllDay} onChange={e => setBlockAllDay(e.target.checked)} className="mr-1 bg-gray-700 border-red-500/30 rounded text-red-500"/><label className="text-xs text-red-300">Dia Todo</label></div>
                            {!blockAllDay && <div className="flex items-center gap-1"><input type="time" className="bg-gray-900 border border-red-500/30 rounded p-1.5 text-xs text-white" value={blockStart} onChange={e => setBlockStart(e.target.value)} /><span>-</span><input type="time" className="bg-gray-900 border border-red-500/30 rounded p-1.5 text-xs text-white" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} /></div>}
                            <button type="button" onClick={handleBlockDate} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-700">Bloquear</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {schedule.blocked_dates?.map((b: any, i: number) => {
                                const dateStr = typeof b === 'string' ? b : b.date;
                                const isFull = typeof b === 'string' || b.allDay;
                                return (
                                    <span key={i} className="bg-red-900/30 border border-red-500/30 text-red-300 px-2 py-1 rounded text-[10px] font-bold flex items-center">
                                        {formatDateSafe(dateStr)} {isFull ? '' : `(${b.start}-${b.end})`}
                                        <button type="button" onClick={() => removeBlockedDate(i)} className="ml-2 hover:text-white"><X size={10}/></button>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-end gap-3 border-t border-white/10 mt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white font-bold transition">Cancelar</button>
                    <button type="submit" disabled={processing} className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 transition flex items-center shadow-md disabled:opacity-50">
                        {processing ? <Loader2 className="animate-spin mr-2"/> : 'Salvar Dentista'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="text-xl font-bold flex items-center text-white gap-2"><HelpCircle className="text-primary"/> Gestão de Dentistas</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-400">
                <p>Aqui você cadastra e gerencia os profissionais da clínica.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Configuração de Agenda:</strong> Cada dentista tem seus horários, pausas e dias de folga (Datas Bloqueadas).</li>
                   <li><strong>Serviços:</strong> Defina quais procedimentos o dentista realiza e os valores (ou "A combinar").</li>
                   <li><strong>Convênios:</strong> Liste os planos aceitos para exibir no agendamento online.</li>
                   <li><strong>Cor:</strong> Escolha uma cor para diferenciar o profissional na Agenda.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DentistsPage;
