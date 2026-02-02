
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, Save, Upload, X, Check, Clock, ShieldCheck, DollarSign, Calendar, User, Mail, Phone, MapPin, Plus, AlertTriangle, Tag } from 'lucide-react';
import { validateCPF } from '../utils/validators';
import Toast, { ToastType } from './Toast';

// --- Shared Utils ---
const sanitizeSlug = (text: string) => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
};

const maskPhone = (value: string) => {
    if (!value) return '';
    return value.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15);
};

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

const daysOfWeek = [
    { key: 'monday', label: 'Segunda' },
    { key: 'tuesday', label: 'Terça' },
    { key: 'wednesday', label: 'Quarta' },
    { key: 'thursday', label: 'Quinta' },
    { key: 'friday', label: 'Sexta' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
];

const inputClass = "w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all";
const labelClass = "block text-xs font-bold text-gray-600 uppercase mb-1.5 tracking-wide";

// --- CLINIC FORM ---
export const ClinicOnboardingForm: React.FC<{ clinicId: string; onSuccess: () => void; onCancel: () => void }> = ({ clinicId, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, [clinicId]);

    const loadData = async () => {
        const { data } = await supabase.from('clinics').select('*').eq('id', clinicId).maybeSingle();
        if (data) {
            const initialData = { ...data };
            if (initialData.name === 'Minha Clínica') {
                initialData.name = '';
            }
            setFormData(initialData);
        }
        else setFormData({ id: clinicId, name: '' });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.size > 5 * 1024 * 1024) { setToast({ message: "Máximo 5MB.", type: 'warning' }); return; }
        setUploadingLogo(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${clinicId}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('clinic-logos').upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('clinic-logos').getPublicUrl(fileName);
            setFormData({ ...formData, logo_url: publicUrl });
            setToast({ message: "Logo carregado!", type: 'success' });
        } catch (err: any) { setToast({ message: "Erro upload: " + err.message, type: 'error' }); } 
        finally { setUploadingLogo(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.city || !formData.state || !formData.address) {
             setToast({ message: "Por favor, preencha todos os campos obrigatórios (*)", type: 'warning' });
             return;
        }

        setSaving(true);
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            let baseSlug = formData.slug;
            
            if (!baseSlug || baseSlug.trim() === '' || uuidRegex.test(baseSlug)) {
                baseSlug = sanitizeSlug(formData.name);
            } else {
                baseSlug = sanitizeSlug(baseSlug);
            }

            let uniqueSlug = baseSlug;
            let counter = 0, isUnique = false;
            
            while (!isUnique) {
                if (counter > 0) uniqueSlug = `${baseSlug}-${counter}`;
                const { data: existing } = await supabase.from('clinics').select('id').eq('slug', uniqueSlug).neq('id', clinicId).maybeSingle();
                if (!existing) isUnique = true; else counter++;
            }

            const payload = {
                id: clinicId,
                name: formData.name,
                slug: uniqueSlug,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                phone: formData.phone,
                whatsapp: formData.whatsapp,
                email: formData.email,
                logo_url: formData.logo_url
            };

            const { error } = await supabase.from('clinics').upsert(payload);
            if (error) throw error;
            onSuccess();
        } catch (err: any) { setToast({ message: "Erro ao salvar: " + err.message, type: 'error' }); } 
        finally { setSaving(false); }
    };

    return (
        <form onSubmit={handleSave} className="space-y-5">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex justify-center mb-6">
                <div className={`relative h-24 w-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-primary transition overflow-hidden group ${uploadingLogo ? 'opacity-50' : ''}`} onClick={() => fileInputRef.current?.click()}>
                    {formData.logo_url ? <img src={formData.logo_url} className="h-full w-full object-cover" /> : <Upload className="text-gray-400 group-hover:text-primary transition-colors" />}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-bold">Alterar</span>
                    </div>
                </div>
            </div>

            <div>
                <label className={labelClass}>Nome da Clínica *</label>
                <input required className={inputClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Clínica Sorriso" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Cidade *</label><input required className={inputClass} value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                <div>
                    <label className={labelClass}>Estado *</label>
                    <select required className={inputClass} value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})}>
                        <option value="">UF</option>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                </div>
            </div>
            <div><label className={labelClass}>Endereço *</label><input required className={inputClass} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Rua, Número" /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>WhatsApp</label><input className={inputClass} value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" maxLength={15}/></div>
                <div><label className={labelClass}>Telefone</label><input className={inputClass} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} placeholder="(00) 0000-0000" maxLength={15}/></div>
            </div>
            
            <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-sky-600 flex items-center shadow-lg shadow-blue-500/30 transition-all">{saving ? <Loader2 className="animate-spin mr-2"/> : 'Salvar e Continuar'}</button>
            </div>
        </form>
    );
};

// --- DENTIST FORM ---
export const DentistOnboardingForm: React.FC<{ clinicId: string; onSuccess: () => void; onCancel: () => void }> = ({ clinicId, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', cro: '', phone: '', email: '', cpf: '', color: '#0ea5e9', specialties: '' });
    const [schedule, setSchedule] = useState<any>(initialSchedule);
    const [services, setServices] = useState<any[]>([]);
    const [plans, setPlans] = useState<string[]>([]);
    
    const [newPlan, setNewPlan] = useState('');
    const [newService, setNewService] = useState({ name: '', price: '', duration: '60', is_variable_price: false, covered_by_plans: false });
    
    const [blockDate, setBlockDate] = useState('');
    const [blockAllDay, setBlockAllDay] = useState(true);
    const [blockStart, setBlockStart] = useState('08:00');
    const [blockEnd, setBlockEnd] = useState('12:00');

    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const handleAddService = () => {
        if (!newService.name.trim()) return;
        setServices([...services, { ...newService, price: Number(newService.price), duration: Number(newService.duration) }]);
        setNewService({ name: '', price: '', duration: '60', is_variable_price: false, covered_by_plans: false });
    };

    const removeService = (index: number) => {
        setServices(services.filter((_, i) => i !== index));
    };

    const handleAddPlan = () => {
        if (!newPlan.trim()) return;
        if (!plans.includes(newPlan.trim())) setPlans([...plans, newPlan.trim()]);
        setNewPlan('');
    };

    const removePlan = (plan: string) => {
        setPlans(plans.filter(p => p !== plan));
    };

    const updateScheduleDay = (day: string, field: string, value: any) => {
        setSchedule((prev: any) => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    const handleBlockDate = () => {
        if (!blockDate) return;
        const blocked = schedule.blocked_dates || [];
        const newBlock = { date: blockDate, allDay: blockAllDay, start: blockAllDay ? null : blockStart, end: blockAllDay ? null : blockEnd };
        const exists = blocked.some((b: any) => {
            const bDate = typeof b === 'string' ? b : b.date;
            return bDate === blockDate && (typeof b === 'string' || b.allDay === true); 
        });
        if (!exists) {
            setSchedule({ ...schedule, blocked_dates: [...blocked, newBlock] });
        }
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateCPF(formData.cpf)) { setToast({ message: "CPF Inválido", type: 'error' }); return; }
        if (!formData.name || !formData.email) { setToast({ message: "Nome e E-mail são obrigatórios.", type: 'warning' }); return; }

        setSaving(true);
        try {
            const specialtiesArray = formData.specialties.split(',').map(s => s.trim()).filter(s => s);
            const payload = {
                clinic_id: clinicId,
                name: formData.name,
                email: formData.email,
                cro: formData.cro,
                phone: formData.phone,
                cpf: formData.cpf,
                specialties: specialtiesArray,
                color: formData.color,
                schedule_config: schedule,
                accepted_plans: plans,
                services: services
            };
            const { error } = await supabase.from('dentists').insert(payload);
            if (error) throw error;
            
            try {
                await supabase.functions.invoke('send-emails', { body: { type: 'invite_dentist', recipients: [{ name: formData.name, email: formData.email }] } });
                await supabase.from('user_profiles').insert({ email: formData.email, role: 'dentist', clinic_id: clinicId });
            } catch (e) {}

            onSuccess();
        } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); }
        finally { setSaving(false); }
    };

    return (
        <form onSubmit={handleSave} className="space-y-6 h-full flex flex-col">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-1">
                
                {/* 1. DADOS PESSOAIS */}
                <div className="space-y-5 animate-fade-in">
                    <h3 className="font-bold text-gray-800 border-b border-gray-200 pb-3 flex items-center text-lg"><User size={20} className="mr-2 text-primary"/> Dados Pessoais</h3>
                    
                    <div>
                        <label className={labelClass}>Nome Completo *</label>
                        <input required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>E-mail (Login) *</label>
                            <input required type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelClass}>Telefone</label>
                            <input className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} maxLength={15}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>CRO</label>
                            <input className={inputClass} value={formData.cro} onChange={e => setFormData({...formData, cro: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelClass}>CPF *</label>
                            <input required className={inputClass} value={formData.cpf} onChange={e => {
                                    let v = e.target.value.replace(/\D/g, '');
                                    if (v.length > 11) v = v.slice(0, 11);
                                    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                    setFormData({...formData, cpf: v});
                            }} maxLength={14}/>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className={labelClass}>Especialidades</label>
                            <input className={inputClass} placeholder="Separe por vírgula" value={formData.specialties} onChange={e => setFormData({...formData, specialties: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelClass}>Cor na Agenda</label>
                            <div className="relative">
                                <input type="color" className="h-11 w-full rounded-lg cursor-pointer border border-gray-300 p-1 bg-white" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. PLANOS ACEITOS */}
                <div className="space-y-5 mt-8 animate-fade-in">
                    <h3 className="font-bold text-gray-800 border-b border-gray-200 pb-3 flex items-center text-lg"><ShieldCheck size={20} className="mr-2 text-primary"/> Planos Aceitos</h3>
                    <div className="flex gap-2">
                        <input 
                            className={inputClass} 
                            placeholder="Nome do plano (ex: Amil)" 
                            value={newPlan} 
                            onChange={e => setNewPlan(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPlan())}
                        />
                        <button type="button" onClick={handleAddPlan} className="bg-gray-100 border border-gray-300 px-6 rounded-lg hover:bg-gray-200 text-gray-700 font-bold transition-colors">Adicionar</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {plans.map(p => (
                            <span key={p} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-bold flex items-center border border-blue-200 shadow-sm">
                                {p} <button type="button" onClick={() => removePlan(p)} className="ml-2 text-blue-400 hover:text-blue-900 transition-colors"><X size={14}/></button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* 3. SERVIÇOS */}
                <div className="space-y-5 mt-8 animate-fade-in">
                    <h3 className="font-bold text-gray-800 border-b border-gray-200 pb-3 flex items-center text-lg"><DollarSign size={20} className="mr-2 text-primary"/> Serviços e Preços</h3>
                    <div className="grid grid-cols-12 gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
                        <div className="col-span-12 sm:col-span-5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Nome do Serviço</label>
                            <input 
                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" 
                                placeholder="Ex: Limpeza"
                                value={newService.name} 
                                onChange={e => setNewService({...newService, name: e.target.value})}
                            />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Preço (R$)</label>
                            <input 
                                type="number" 
                                className={`w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${newService.is_variable_price ? 'bg-gray-100 text-gray-400' : ''}`} 
                                value={newService.price} 
                                onChange={e => setNewService({...newService, price: e.target.value})}
                                disabled={newService.is_variable_price}
                            />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Minutos</label>
                            <input type="number" className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" value={newService.duration} onChange={e => setNewService({...newService, duration: e.target.value})}/>
                        </div>
                        <div className="col-span-12 sm:col-span-2 flex items-center pt-2 sm:pt-0">
                             <button type="button" onClick={handleAddService} className="w-full bg-primary text-white p-2 rounded-lg hover:bg-sky-600 flex items-center justify-center font-bold text-sm shadow-md transition-all"><Plus size={16} className="mr-1"/> Add</button>
                        </div>
                        
                        <div className="col-span-12 flex gap-4 mt-2 px-1">
                            <label className="flex items-center text-xs text-gray-600 cursor-pointer font-medium hover:text-primary transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="mr-2 rounded text-primary focus:ring-primary border-gray-300"
                                    checked={newService.is_variable_price}
                                    onChange={e => setNewService({...newService, is_variable_price: e.target.checked, price: e.target.checked ? '' : newService.price})}
                                />
                                Preço a combinar
                            </label>
                            <label className="flex items-center text-xs text-gray-600 cursor-pointer font-medium hover:text-primary transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="mr-2 rounded text-primary focus:ring-primary border-gray-300"
                                    checked={newService.covered_by_plans}
                                    onChange={e => setNewService({...newService, covered_by_plans: e.target.checked})}
                                />
                                Aceito por planos
                            </label>
                        </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {services.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg text-sm border border-gray-200 shadow-sm hover:border-primary/30 transition-colors">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800">{s.name}</span>
                                    <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                                        {s.covered_by_plans && <span className="flex items-center text-blue-600 bg-blue-50 px-1.5 rounded"><ShieldCheck size={10} className="mr-0.5"/> Planos</span>}
                                        {s.is_variable_price && <span className="flex items-center text-orange-600 bg-orange-50 px-1.5 rounded"><Tag size={10} className="mr-0.5"/> A combinar</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded">{s.duration}min</span>
                                    <span className="font-bold text-green-600 text-sm whitespace-nowrap">
                                        {s.is_variable_price ? 'A combinar' : `R$ ${Number(s.price).toFixed(2)}`}
                                    </span>
                                    <button type="button" onClick={() => removeService(i)} className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded"><X size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. DISPONIBILIDADE */}
                <div className="mt-8 animate-fade-in border-t border-gray-200 pt-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center text-lg"><Clock size={20} className="mr-2 text-primary"/> Disponibilidade Semanal</h3>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        {daysOfWeek.map(({ key, label }) => {
                            const dayConfig = schedule[key];
                            return (
                                <div key={key} className="flex items-start gap-3 py-2 border-b border-gray-200 last:border-0">
                                    <div className="w-28 flex items-center pt-2">
                                        <input 
                                            type="checkbox" 
                                            checked={dayConfig.active} 
                                            onChange={e => updateScheduleDay(key, 'active', e.target.checked)}
                                            className="mr-3 h-5 w-5 text-primary rounded focus:ring-primary border-gray-300 cursor-pointer"
                                        />
                                        <span className={`text-sm font-bold ${dayConfig.active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                                    </div>
                                    {dayConfig.active ? (
                                        <div className="flex flex-col gap-2 flex-1">
                                            <div className="flex gap-2 items-center">
                                                <input type="time" className="border border-gray-300 rounded p-1.5 text-sm flex-1 bg-white focus:ring-2 focus:ring-primary outline-none" value={dayConfig.start} onChange={e => updateScheduleDay(key, 'start', e.target.value)} />
                                                <span className="text-gray-400 text-xs font-medium">até</span>
                                                <input type="time" className="border border-gray-300 rounded p-1.5 text-sm flex-1 bg-white focus:ring-2 focus:ring-primary outline-none" value={dayConfig.end} onChange={e => updateScheduleDay(key, 'end', e.target.value)} />
                                            </div>
                                            
                                            <div className="flex gap-2 items-center">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold w-12 sm:w-auto">Pausa:</span>
                                                <input type="time" className="border border-gray-300 rounded p-1.5 text-sm flex-1 bg-white focus:ring-2 focus:ring-primary outline-none" value={dayConfig.pause_start} onChange={e => updateScheduleDay(key, 'pause_start', e.target.value)} />
                                                <span className="text-gray-400 text-xs font-medium">até</span>
                                                <input type="time" className="border border-gray-300 rounded p-1.5 text-sm flex-1 bg-white focus:ring-2 focus:ring-primary outline-none" value={dayConfig.pause_end} onChange={e => updateScheduleDay(key, 'pause_end', e.target.value)} />
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic pt-2.5 font-medium">Dia de folga</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 5. DATAS BLOQUEADAS */}
                <div className="mt-8 animate-fade-in border-t border-gray-200 pt-6">
                    <div className="bg-red-50 p-5 rounded-xl border border-red-100">
                        <h3 className="font-bold text-red-800 mb-4 flex items-center"><AlertTriangle size={18} className="mr-2"/> Datas Bloqueadas (Férias/Feriados)</h3>
                        <div className="flex flex-col sm:flex-row gap-4 items-end mb-4">
                            <div className="w-full sm:w-auto">
                                <label className="text-[10px] font-bold text-red-700 uppercase mb-1 block">Data</label>
                                <input type="date" className="w-full bg-white border border-red-200 rounded-lg p-2 text-sm text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" value={blockDate} onChange={e => setBlockDate(e.target.value)} />
                            </div>
                            <div className="flex items-center pb-2.5 px-2">
                                <input type="checkbox" id="allDay" checked={blockAllDay} onChange={e => setBlockAllDay(e.target.checked)} className="mr-2 h-4 w-4 text-red-600 focus:ring-red-500 border-red-300 rounded" />
                                <label htmlFor="allDay" className="text-sm font-bold text-red-800 cursor-pointer">Dia Todo</label>
                            </div>
                            {!blockAllDay && (
                                <div className="flex gap-2 items-center w-full sm:w-auto">
                                    <input type="time" className="border border-red-200 rounded p-2 text-sm bg-white" value={blockStart} onChange={e => setBlockStart(e.target.value)} />
                                    <span className="text-red-400">-</span>
                                    <input type="time" className="border border-red-200 rounded p-2 text-sm bg-white" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} />
                                </div>
                            )}
                            <button type="button" onClick={handleBlockDate} className="bg-red-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-red-700 transition-colors shadow-sm w-full sm:w-auto">Bloquear</button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {schedule.blocked_dates?.map((b: any, i: number) => {
                                const dateStr = typeof b === 'string' ? b : b.date;
                                const isFull = typeof b === 'string' || b.allDay;
                                const label = formatDateSafe(dateStr) + (isFull ? '' : ` (${b.start}-${b.end})`);
                                
                                return (
                                    <span key={i} className="bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center shadow-sm">
                                        {label}
                                        <button type="button" onClick={() => removeBlockedDate(i)} className="ml-2 text-red-300 hover:text-red-600 transition-colors"><X size={14}/></button>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 mt-auto bg-white sticky bottom-0">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-sky-600 flex items-center shadow-lg shadow-blue-500/30 transition-all">{saving ? <Loader2 className="animate-spin mr-2"/> : 'Salvar Dentista'}</button>
            </div>
        </form>
    );
};

// --- CLIENT FORM ---
export const ClientOnboardingForm: React.FC<{ clinicId: string; onSuccess: () => void; onCancel: () => void }> = ({ clinicId, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateCPF(formData.cpf)) { setToast({ message: "CPF Inválido", type: 'error' }); return; }
        setSaving(true);
        try {
            const { error } = await supabase.from('clients').insert({ ...formData, clinic_id: clinicId });
            if (error) throw error;
            onSuccess();
        } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); }
        finally { setSaving(false); }
    };

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex items-start">
                <div className="bg-blue-100 p-2 rounded-lg mr-3 text-blue-600">
                    <User size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-blue-900 text-sm">Cadastro de Paciente</h3>
                    <p className="text-xs text-blue-700 mt-1">Este é o primeiro passo para organizar seus prontuários e agendamentos.</p>
                </div>
            </div>

            <div>
                <label className={labelClass}>Nome Completo *</label>
                <input required className={inputClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: João da Silva" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>WhatsApp</label><input className={inputClass} value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" maxLength={15}/></div>
                <div><label className={labelClass}>CPF *</label><input required className={inputClass} value={formData.cpf || ''} onChange={e => {
                     let v = e.target.value.replace(/\D/g, '');
                     if (v.length > 11) v = v.slice(0, 11);
                     v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                     setFormData({...formData, cpf: v});
                }} maxLength={14} placeholder="000.000.000-00"/></div>
            </div>
            <div>
                <label className={labelClass}>E-mail</label>
                <input type="email" className={inputClass} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@paciente.com" />
            </div>
            
            <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-sky-600 flex items-center shadow-lg shadow-blue-500/30 transition-all">{saving ? <Loader2 className="animate-spin mr-2"/> : 'Salvar Paciente'}</button>
            </div>
        </form>
    );
};
