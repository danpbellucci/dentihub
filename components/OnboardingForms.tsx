
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
            // Se o nome for o padrão gerado no cadastro, limpa para mostrar o placeholder
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
        
        // Validação de campos obrigatórios
        if (!formData.name || !formData.city || !formData.state || !formData.address) {
             setToast({ message: "Por favor, preencha todos os campos obrigatórios (*)", type: 'warning' });
             return;
        }

        setSaving(true);
        try {
            // Validação de UUID para forçar regeneração de slug amigável
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            let baseSlug = formData.slug;
            
            // Se não tem slug, é vazio, ou é um UUID, gera a partir do nome
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
        <form onSubmit={handleSave} className="space-y-4">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="flex justify-center mb-4">
                <div className={`relative h-20 w-20 border-2 border-dashed rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition overflow-hidden ${uploadingLogo ? 'opacity-50' : ''}`} onClick={() => fileInputRef.current?.click()}>
                    {formData.logo_url ? <img src={formData.logo_url} className="h-full w-full object-cover" /> : <Upload className="text-gray-400" />}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Clínica *</label>
                <input required className="w-full border rounded p-2" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Clínica Sorriso" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade *</label><input required className="w-full border rounded p-2" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado *</label>
                    <select required className="w-full border rounded p-2 bg-white" value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})}>
                        <option value="">UF</option>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                </div>
            </div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço *</label><input required className="w-full border rounded p-2" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Rua, Número" /></div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp</label><input className="w-full border rounded p-2" value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" maxLength={15}/></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label><input className="w-full border rounded p-2" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} placeholder="(00) 0000-0000" maxLength={15}/></div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 flex items-center">{saving ? <Loader2 className="animate-spin mr-2"/> : 'Salvar'}</button>
            </div>
        </form>
    );
};

// --- DENTIST FORM ---
export const DentistOnboardingForm: React.FC<{ clinicId: string; onSuccess: () => void; onCancel: () => void }> = ({ clinicId, onSuccess, onCancel }) => {
    // Form States
    const [formData, setFormData] = useState({ name: '', cro: '', phone: '', email: '', cpf: '', color: '#0ea5e9', specialties: '' });
    const [schedule, setSchedule] = useState<any>(initialSchedule);
    const [services, setServices] = useState<any[]>([]);
    const [plans, setPlans] = useState<string[]>([]);
    
    // Inputs temporários
    const [newPlan, setNewPlan] = useState('');
    const [newService, setNewService] = useState({ name: '', price: '', duration: '60', is_variable_price: false, covered_by_plans: false });
    
    // Bloqueio de datas
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
        
        const newBlock = { 
            date: blockDate, 
            allDay: blockAllDay,
            start: blockAllDay ? null : blockStart,
            end: blockAllDay ? null : blockEnd
        };
        
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
        <form onSubmit={handleSave} className="space-y-4 h-full flex flex-col">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-1">
                
                {/* 1. DADOS PESSOAIS */}
                <div className="space-y-4 animate-fade-in">
                    <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center"><User size={18} className="mr-2"/> Dados Pessoais</h3>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo *</label>
                        <input required className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail (Login) *</label>
                            <input required type="email" className="w-full border rounded p-2" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                            <input className="w-full border rounded p-2" value={formData.phone} onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} maxLength={15}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CRO</label>
                            <input className="w-full border rounded p-2" value={formData.cro} onChange={e => setFormData({...formData, cro: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF *</label>
                            <input required className="w-full border rounded p-2" value={formData.cpf} onChange={e => {
                                    let v = e.target.value.replace(/\D/g, '');
                                    if (v.length > 11) v = v.slice(0, 11);
                                    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                    setFormData({...formData, cpf: v});
                            }} maxLength={14}/>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Especialidades</label>
                            <input className="w-full border rounded p-2" placeholder="Separe por vírgula" value={formData.specialties} onChange={e => setFormData({...formData, specialties: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cor</label>
                            <input type="color" className="h-10 w-20 rounded cursor-pointer border-0 p-0" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* 2. PLANOS ACEITOS */}
                <div className="space-y-4 mt-6 animate-fade-in">
                    <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center"><ShieldCheck size={18} className="mr-2"/> Planos Aceitos</h3>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 border rounded p-2 text-sm" 
                            placeholder="Nome do plano (ex: Amil)" 
                            value={newPlan} 
                            onChange={e => setNewPlan(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPlan())}
                        />
                        <button type="button" onClick={handleAddPlan} className="bg-gray-100 px-4 rounded hover:bg-gray-200 text-sm font-bold">Adicionar</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {plans.map(p => (
                            <span key={p} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold flex items-center border border-blue-100">
                                {p} <button type="button" onClick={() => removePlan(p)} className="ml-2 text-blue-400 hover:text-blue-900"><X size={14}/></button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* 3. SERVIÇOS */}
                <div className="space-y-4 mt-6 animate-fade-in">
                    <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center"><DollarSign size={18} className="mr-2"/> Serviços e Preços</h3>
                    <div className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="col-span-12 sm:col-span-5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Nome do Serviço</label>
                            <input 
                                className="w-full border rounded p-2 text-sm" 
                                placeholder="Ex: Limpeza"
                                value={newService.name} 
                                onChange={e => setNewService({...newService, name: e.target.value})}
                            />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Preço (R$)</label>
                            <input 
                                type="number" 
                                className={`w-full border rounded p-2 text-sm ${newService.is_variable_price ? 'bg-gray-100 text-gray-400' : ''}`} 
                                value={newService.price} 
                                onChange={e => setNewService({...newService, price: e.target.value})}
                                disabled={newService.is_variable_price}
                            />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Min</label>
                            <input type="number" className="w-full border rounded p-2 text-sm" value={newService.duration} onChange={e => setNewService({...newService, duration: e.target.value})}/>
                        </div>
                        <div className="col-span-12 sm:col-span-2 flex items-center pt-2 sm:pt-0">
                             <button type="button" onClick={handleAddService} className="w-full bg-primary text-white p-2 rounded hover:bg-sky-600 flex items-center justify-center font-bold text-sm"><Plus size={16} className="mr-1"/> Add</button>
                        </div>
                        
                        <div className="col-span-12 flex gap-4 mt-1 px-1">
                            <label className="flex items-center text-xs text-gray-600 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="mr-1 rounded text-primary focus:ring-primary"
                                    checked={newService.is_variable_price}
                                    onChange={e => setNewService({...newService, is_variable_price: e.target.checked, price: e.target.checked ? '' : newService.price})}
                                />
                                Preço a combinar
                            </label>
                            <label className="flex items-center text-xs text-gray-600 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="mr-1 rounded text-primary focus:ring-primary"
                                    checked={newService.covered_by_plans}
                                    onChange={e => setNewService({...newService, covered_by_plans: e.target.checked})}
                                />
                                Aceito por planos
                            </label>
                        </div>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {services.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm border border-gray-100">
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-800">{s.name}</span>
                                    <div className="flex gap-2 text-[10px] text-gray-500">
                                        {s.covered_by_plans && <span className="flex items-center text-blue-600"><ShieldCheck size={10} className="mr-0.5"/> Planos</span>}
                                        {s.is_variable_price && <span className="flex items-center text-orange-600"><Tag size={10} className="mr-0.5"/> A combinar</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-500 text-xs">{s.duration}min</span>
                                    <span className="font-bold text-green-600 text-xs whitespace-nowrap">
                                        {s.is_variable_price ? 'A combinar' : `R$ ${Number(s.price).toFixed(2)}`}
                                    </span>
                                    <button type="button" onClick={() => removeService(i)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. DISPONIBILIDADE */}
                <div className="mt-6 animate-fade-in border-t pt-4">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center"><Clock size={18} className="mr-2"/> Disponibilidade Semanal</h3>
                    <div className="space-y-2">
                        {daysOfWeek.map(({ key, label }) => {
                            const dayConfig = schedule[key];
                            return (
                                <div key={key} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                                    <div className="w-24 flex items-center pt-1.5">
                                        <input 
                                            type="checkbox" 
                                            checked={dayConfig.active} 
                                            onChange={e => updateScheduleDay(key, 'active', e.target.checked)}
                                            className="mr-2 h-4 w-4 text-primary rounded focus:ring-primary"
                                        />
                                        <span className={`text-sm font-bold ${dayConfig.active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
                                    </div>
                                    {dayConfig.active ? (
                                        <div className="flex flex-col gap-2 flex-1">
                                            <div className="flex gap-2 items-center">
                                                <input type="time" className="border rounded p-1 text-sm flex-1 sm:flex-none sm:w-28" value={dayConfig.start} onChange={e => updateScheduleDay(key, 'start', e.target.value)} />
                                                <span className="text-gray-400 text-xs">até</span>
                                                <input type="time" className="border rounded p-1 text-sm flex-1 sm:flex-none sm:w-28" value={dayConfig.end} onChange={e => updateScheduleDay(key, 'end', e.target.value)} />
                                            </div>
                                            
                                            <div className="flex gap-2 items-center">
                                                <span className="text-[10px] text-gray-500 uppercase w-10 sm:w-auto">Pausa:</span>
                                                <input type="time" className="border rounded p-1 text-sm flex-1 sm:flex-none sm:w-24" value={dayConfig.pause_start} onChange={e => updateScheduleDay(key, 'pause_start', e.target.value)} />
                                                <span className="text-gray-400 text-xs">até</span>
                                                <input type="time" className="border rounded p-1 text-sm flex-1 sm:flex-none sm:w-24" value={dayConfig.pause_end} onChange={e => updateScheduleDay(key, 'pause_end', e.target.value)} />
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic pt-1.5">Indisponível</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 5. DATAS BLOQUEADAS */}
                <div className="mt-6 animate-fade-in border-t pt-6 bg-red-50 p-4 rounded-lg">
                    <h3 className="font-bold text-red-800 mb-4 flex items-center"><AlertTriangle size={18} className="mr-2"/> Datas Bloqueadas (Férias/Feriados)</h3>
                    <div className="flex gap-4 items-end mb-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                            <input type="date" className="border rounded p-2 text-sm" value={blockDate} onChange={e => setBlockDate(e.target.value)} />
                        </div>
                        <div className="flex items-center pb-2">
                            <input type="checkbox" id="allDay" checked={blockAllDay} onChange={e => setBlockAllDay(e.target.checked)} className="mr-2" />
                            <label htmlFor="allDay" className="text-sm text-gray-700">Dia Todo</label>
                        </div>
                        {!blockAllDay && (
                            <div className="flex gap-2 items-center">
                                <input type="time" className="border rounded p-2 text-sm" value={blockStart} onChange={e => setBlockStart(e.target.value)} />
                                <span>-</span>
                                <input type="time" className="border rounded p-2 text-sm" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} />
                            </div>
                        )}
                        <button type="button" onClick={handleBlockDate} className="bg-red-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-700">Bloquear</button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {schedule.blocked_dates?.map((b: any, i: number) => {
                            const dateStr = typeof b === 'string' ? b : b.date;
                            const isFull = typeof b === 'string' || b.allDay;
                            const label = formatDateSafe(dateStr) + (isFull ? '' : ` (${b.start}-${b.end})`);
                            
                            return (
                                <span key={i} className="bg-white border border-red-200 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-sm">
                                    {label}
                                    <button type="button" onClick={() => removeBlockedDate(i)} className="ml-2 text-red-400 hover:text-red-900"><X size={14}/></button>
                                </span>
                            );
                        })}
                    </div>
                </div>

            </div>

            <div className="pt-4 flex justify-end gap-2 border-t mt-auto bg-white sticky bottom-0">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 flex items-center">{saving ? <Loader2 className="animate-spin mr-2"/> : 'Salvar Dentista'}</button>
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
        <form onSubmit={handleSave} className="space-y-4">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo *</label>
                <input required className="w-full border rounded p-2" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: João da Silva" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp</label><input className="w-full border rounded p-2" value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" maxLength={15}/></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF *</label><input required className="w-full border rounded p-2" value={formData.cpf || ''} onChange={e => {
                     let v = e.target.value.replace(/\D/g, '');
                     if (v.length > 11) v = v.slice(0, 11);
                     v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                     setFormData({...formData, cpf: v});
                }} maxLength={14} placeholder="000.000.000-00"/></div>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                <input type="email" className="w-full border rounded p-2" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@paciente.com" />
            </div>
            <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 flex items-center">{saving ? <Loader2 className="animate-spin mr-2"/> : 'Salvar Paciente'}</button>
            </div>
        </form>
    );
};
