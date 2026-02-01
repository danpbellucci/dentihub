
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Dentist, ServiceItem } from '../types';
import { Plus, Edit2, Trash2, X, Loader2, User, Phone, Mail, HelpCircle, Clock, DollarSign, ShieldCheck, AlertTriangle, Check, Tag } from 'lucide-react';
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

  const [clinicId, setClinicId] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    initialize();
    if (location.state?.openModal) handleOpenModal();
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
           setToast({ message: `Limite atingido: O plano ${currentTier.toUpperCase()} permite apenas ${limit} dentista(s).`, type: 'warning' });
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

    setProcessing(true);
    try {
      const specialtiesArray = formData.specialties.split(',').map(s => s.trim()).filter(s => s);
      const payload = {
        clinic_id: clinicId,
        name: formData.name,
        cro: formData.cro || null,
        phone: formData.phone || null,
        email: formData.email,
        cpf: formData.cpf || null,
        specialties: specialtiesArray,
        color: formData.color,
        schedule_config: schedule,
        accepted_plans: plans,
        services: services
      };

      if (editingDentist) {
        const { error } = await supabase.from('dentists').update(payload).eq('id', editingDentist.id);
        if (error) throw error;
        setToast({ message: "Dentista atualizado!", type: 'success' });
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

  const filteredDentists = dentists.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const daysOfWeek = [ { key: 'monday', label: 'Segunda' }, { key: 'tuesday', label: 'Terça' }, { key: 'wednesday', label: 'Quarta' }, { key: 'thursday', label: 'Quinta' }, { key: 'friday', label: 'Sexta' }, { key: 'saturday', label: 'Sábado' }, { key: 'sunday', label: 'Domingo' } ];

  if (loading) return <div className="flex h-96 w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold text-white">Dentistas</h1>
            <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors"><HelpCircle size={20} /></button>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold">
          <Plus size={18} className="mr-2" /> Novo
        </button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDentists.map(dentist => (
          <div key={dentist.id} className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow border border-white/5 overflow-hidden hover:border-white/20 transition-all group relative">
            <div className={`h-2 w-full`} style={{ backgroundColor: dentist.color }}></div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-lg mr-4 border border-white/10 shadow-sm">
                        {dentist.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">{dentist.name}</h3>
                        <p className="text-xs text-gray-500">{dentist.cro ? `CRO: ${dentist.cro}` : 'Sem CRO'}</p>
                    </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-400 mb-6">
                  {dentist.email && (
                      <div className="flex items-center">
                          <Mail size={14} className="mr-2 text-gray-500"/> {dentist.email}
                      </div>
                  )}
                  {dentist.phone && (
                      <div className="flex items-center">
                          <Phone size={14} className="mr-2 text-gray-500"/> {dentist.phone}
                      </div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                      {dentist.specialties?.map((spec, i) => (
                          <span key={i} className="bg-gray-800 border border-white/10 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{spec}</span>
                      ))}
                  </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/5 pt-4">
                  <button onClick={() => handleOpenModal(dentist)} className="flex items-center px-3 py-1.5 text-sm font-bold text-blue-400 hover:bg-blue-500/10 rounded transition">
                      <Edit2 size={14} className="mr-1"/> Editar
                  </button>
                  <button onClick={() => setDeleteId(dentist.id)} className="flex items-center px-3 py-1.5 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded transition">
                      <Trash2 size={14} className="mr-1"/> Excluir
                  </button>
              </div>
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

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white">
                {editingDentist ? 'Editar Dentista' : 'Novo Dentista'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-1">
                    {/* DADOS PESSOAIS */}
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="font-bold text-gray-300 border-b border-white/10 pb-2 flex items-center"><User size={18} className="mr-2 text-primary"/> Dados Pessoais</h3>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo *</label>
                            <input required className="w-full bg-gray-800 border border-gray-700 text-white rounded p-2 focus:border-primary outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail (Login) *</label>
                                <input required type="email" className="w-full bg-gray-800 border border-gray-700 text-white rounded p-2 focus:border-primary outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                                <input className="w-full bg-gray-800 border border-gray-700 text-white rounded p-2 focus:border-primary outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CRO</label>
                                <input className="w-full bg-gray-800 border border-gray-700 text-white rounded p-2 focus:border-primary outline-none" value={formData.cro} onChange={e => setFormData({...formData, cro: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF *</label>
                                <input className="w-full bg-gray-800 border border-gray-700 text-white rounded p-2 focus:border-primary outline-none" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} maxLength={14}/>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Especialidades</label>
                                <input className="w-full bg-gray-800 border border-gray-700 text-white rounded p-2 focus:border-primary outline-none" placeholder="Separe por vírgula" value={formData.specialties} onChange={e => setFormData({...formData, specialties: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cor</label>
                                <input type="color" className="h-10 w-20 rounded cursor-pointer border-0 p-0 bg-transparent" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* PLANOS */}
                    <div className="space-y-4 mt-6 animate-fade-in">
                        <h3 className="font-bold text-gray-300 border-b border-white/10 pb-2 flex items-center"><ShieldCheck size={18} className="mr-2 text-primary"/> Planos Aceitos</h3>
                        <div className="flex gap-2">
                            <input className="flex-1 bg-gray-800 border border-gray-700 text-white rounded p-2 text-sm focus:border-primary outline-none" placeholder="Nome do plano (ex: Amil)" value={newPlan} onChange={e => setNewPlan(e.target.value)}/>
                            <button type="button" onClick={handleAddPlan} className="bg-gray-800 border border-white/10 px-4 rounded hover:bg-gray-700 text-white text-sm font-bold">Adicionar</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {plans.map(p => (
                                <span key={p} className="bg-blue-900/30 text-blue-300 border border-blue-500/20 px-3 py-1 rounded-full text-sm font-bold flex items-center">
                                    {p} <button type="button" onClick={() => removePlan(p)} className="ml-2 text-blue-400 hover:text-white"><X size={14}/></button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* SERVIÇOS */}
                    <div className="space-y-4 mt-6 animate-fade-in">
                        <h3 className="font-bold text-gray-300 border-b border-white/10 pb-2 flex items-center"><DollarSign size={18} className="mr-2 text-primary"/> Serviços e Preços</h3>
                        <div className="grid grid-cols-12 gap-2 items-end bg-gray-800/50 p-3 rounded-lg border border-white/5">
                            <div className="col-span-12 sm:col-span-5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Nome</label>
                                <input className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 text-sm focus:border-primary outline-none" placeholder="Ex: Limpeza" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})}/>
                            </div>
                            <div className="col-span-6 sm:col-span-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Preço (R$)</label>
                                <input type="number" className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 text-sm focus:border-primary outline-none" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} disabled={newService.is_variable_price}/>
                            </div>
                            <div className="col-span-6 sm:col-span-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Min</label>
                                <input type="number" className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 text-sm focus:border-primary outline-none" value={newService.duration} onChange={e => setNewService({...newService, duration: e.target.value})}/>
                            </div>
                            <div className="col-span-12 sm:col-span-2 flex items-center pt-2 sm:pt-0">
                                 <button type="button" onClick={handleAddService} className="w-full bg-primary text-white p-2 rounded hover:bg-sky-600 flex items-center justify-center font-bold text-sm"><Plus size={16} className="mr-1"/> Add</button>
                            </div>
                            <div className="col-span-12 flex gap-4 mt-1 px-1">
                                <label className="flex items-center text-xs text-gray-400 cursor-pointer">
                                    <input type="checkbox" className="mr-1 rounded bg-gray-700 border-gray-600 text-primary" checked={newService.is_variable_price} onChange={e => setNewService({...newService, is_variable_price: e.target.checked, price: e.target.checked ? '' : newService.price})}/>
                                    A combinar
                                </label>
                                <label className="flex items-center text-xs text-gray-400 cursor-pointer">
                                    <input type="checkbox" className="mr-1 rounded bg-gray-700 border-gray-600 text-primary" checked={newService.covered_by_plans} onChange={e => setNewService({...newService, covered_by_plans: e.target.checked})}/>
                                    Aceito por planos
                                </label>
                            </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {services.map((s, i) => (
                                <div key={i} className="flex justify-between items-center bg-gray-800 p-2 rounded text-sm border border-gray-700">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-300">{s.name}</span>
                                        <div className="flex gap-2 text-[10px] text-gray-500">
                                            {s.covered_by_plans && <span className="flex items-center text-blue-400"><ShieldCheck size={10} className="mr-0.5"/> Planos</span>}
                                            {s.is_variable_price && <span className="flex items-center text-orange-400"><Tag size={10} className="mr-0.5"/> A combinar</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-500 text-xs">{s.duration}min</span>
                                        <span className="font-bold text-green-400 text-xs whitespace-nowrap">{s.is_variable_price ? 'A combinar' : `R$ ${Number(s.price).toFixed(2)}`}</span>
                                        <button type="button" onClick={() => removeService(i)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DISPONIBILIDADE */}
                    <div className="mt-6 animate-fade-in border-t border-white/10 pt-4">
                        <h3 className="font-bold text-gray-300 mb-4 flex items-center"><Clock size={18} className="mr-2 text-primary"/> Disponibilidade</h3>
                        <div className="space-y-2">
                            {daysOfWeek.map(({ key, label }) => {
                                const dayConfig = schedule[key];
                                return (
                                    <div key={key} className="flex items-start gap-2 py-2 border-b border-gray-800 last:border-0">
                                        <div className="w-24 flex items-center pt-1.5">
                                            <input type="checkbox" checked={dayConfig.active} onChange={e => updateScheduleDay(key, 'active', e.target.checked)} className="mr-2 h-4 w-4 text-primary bg-gray-700 border-gray-600 rounded"/>
                                            <span className={`text-sm font-bold ${dayConfig.active ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
                                        </div>
                                        {dayConfig.active ? (
                                            <div className="flex flex-col gap-2 flex-1">
                                                <div className="flex gap-2 items-center">
                                                    <input type="time" className="bg-gray-800 border border-gray-700 text-white rounded p-1 text-sm flex-1 sm:flex-none sm:w-28" value={dayConfig.start} onChange={e => updateScheduleDay(key, 'start', e.target.value)} />
                                                    <span className="text-gray-500 text-xs">até</span>
                                                    <input type="time" className="bg-gray-800 border border-gray-700 text-white rounded p-1 text-sm flex-1 sm:flex-none sm:w-28" value={dayConfig.end} onChange={e => updateScheduleDay(key, 'end', e.target.value)} />
                                                </div>
                                            </div>
                                        ) : <span className="text-xs text-gray-600 italic pt-1.5">Indisponível</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* BLOQUEIOS */}
                    <div className="mt-6 animate-fade-in border-t border-white/10 pt-6 bg-red-900/10 p-4 rounded-lg border border-red-900/20">
                        <h3 className="font-bold text-red-400 mb-4 flex items-center"><AlertTriangle size={18} className="mr-2"/> Datas Bloqueadas</h3>
                        <div className="flex gap-4 items-end mb-4">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label><input type="date" className="bg-gray-900 border border-gray-700 text-white rounded p-2 text-sm" value={blockDate} onChange={e => setBlockDate(e.target.value)}/></div>
                            <div className="flex items-center pb-2"><input type="checkbox" id="allDay" checked={blockAllDay} onChange={e => setBlockAllDay(e.target.checked)} className="mr-2 bg-gray-700 border-gray-600"/><label htmlFor="allDay" className="text-sm text-gray-400">Dia Todo</label></div>
                            <button type="button" onClick={handleBlockDate} className="bg-red-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-700">Bloquear</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {schedule.blocked_dates?.map((b: any, i: number) => (
                                <span key={i} className="bg-red-900/30 border border-red-500/30 text-red-300 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                                    {formatDateSafe(typeof b === 'string' ? b : b.date)}
                                    <button type="button" onClick={() => removeBlockedDate(i)} className="ml-2 text-red-400 hover:text-red-200"><X size={14}/></button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/10 mt-auto bg-gray-900 sticky bottom-0">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded font-bold transition">Cancelar</button>
                    <button type="submit" disabled={processing} className="px-8 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 transition shadow-md flex items-center disabled:opacity-50">
                        {processing ? <Loader2 className="animate-spin mr-2"/> : <Check className="mr-2"/>} Salvar Dentista
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-900/20 p-3 rounded-full inline-block mb-4"><Trash2 className="text-red-500" size={32} /></div>
             <h3 className="text-lg font-bold text-white mb-2">Excluir Dentista?</h3>
             <p className="text-gray-400 mb-6 text-sm">Tem certeza que deseja remover este dentista? Essa ação não pode ser desfeita.</p>
             <div className="flex space-x-3 w-full">
                <button onClick={() => setDeleteId(null)} disabled={processing} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 font-bold transition">Cancelar</button>
                <button onClick={confirmDelete} disabled={processing} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg">{processing ? <Loader2 className="animate-spin" size={20}/> : 'Sim, Excluir'}</button>
             </div>
          </div>
        </div>
      )}

      {/* HELP MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="text-xl font-bold flex items-center text-white gap-2"><HelpCircle className="text-primary"/> Gestão de Dentistas</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-400">
                <p>Cadastre e gerencie a equipe de profissionais da clínica.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Disponibilidade:</strong> Configure os horários de atendimento de cada dentista.</li>
                   <li><strong>Serviços:</strong> Defina quais procedimentos cada profissional realiza.</li>
                   <li><strong>Login:</strong> O dentista receberá um convite por e-mail para acessar o sistema.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DentistsPage;
