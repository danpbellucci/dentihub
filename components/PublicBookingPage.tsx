
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Dentist, ServiceItem } from '../types';
import { Logo } from './Logo';
import { Smile, Clock, CheckCircle, MapPin, Info, Phone, ShieldCheck, Smartphone, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { addDays, format, startOfToday, addMinutes, parseISO, isAfter, startOfDay, endOfDay, areIntervalsOverlapping } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { validateCPF } from '../utils/validators';
import Toast, { ToastType } from './Toast';

const PublicBookingPage: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<any>(null);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [step, setStep] = useState(1);
  const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [existingAppointments, setExistingAppointments] = useState<{start_time: string, end_time: string}[]>([]);
  const [patientForm, setPatientForm] = useState({ name: '', phone: '', email: '', cpf: '', birthDate: '', address: '', website_url: '' });
  const [submitted, setSubmitted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (slug) loadClinicData();
  }, [slug]);

  // Busca agendamentos existentes sempre que mudar o dentista ou a data
  useEffect(() => {
    const fetchAppointments = async () => {
        if (!selectedDentist || !selectedDate) return;
        
        setLoadingSlots(true);
        setExistingAppointments([]); // Limpa estado anterior

        // Garante o intervalo exato do dia selecionado em UTC para a query
        const startDay = startOfDay(selectedDate).toISOString();
        const endDay = endOfDay(selectedDate).toISOString();
        
        // SEGURANÇA: Consulta a VIEW 'public_appointments' em vez da tabela principal.
        const { data, error } = await supabase
            .from('public_appointments')
            .select('start_time, end_time')
            .eq('dentist_id', selectedDentist.id)
            // .neq('status', 'cancelled') -> A view já filtra cancelados
            .gte('start_time', startDay)
            .lte('start_time', endDay);

        if (error) {
            console.error("Erro ao buscar disponibilidade:", error);
        }
            
        setExistingAppointments(data || []);
        setLoadingSlots(false);
    };
    
    if (step === 3) { // Só busca quando estiver na etapa de escolha de horário
        fetchAppointments();
    }
  }, [selectedDentist, selectedDate, step]);

  const loadClinicData = async () => {
    setLoading(true);
    setErrorMsg('');
    
    try {
        // SEGURANÇA: Busca dados da VIEW 'public_clinics'
        const { data: clinicData, error: clinicError } = await supabase
            .from('public_clinics')
            .select('id, name, slug, address, city, state, observation, logo_url, phone, whatsapp')
            .eq('slug', slug)
            .single();

        if (clinicError) {
            // Ignora erro silenciosamente se parecer erro de URL
            if (slug && slug.length > 50) return; 
            throw new Error("Clínica não encontrada.");
        }
        if (!clinicData) throw new Error("Clínica não encontrada.");

        setClinic(clinicData);

        // SEGURANÇA: Busca dados da VIEW 'public_dentists'
        const { data: dentData, error: dentError } = await supabase
            .from('public_dentists')
            .select('id, name, specialties, services, accepted_plans, schedule_config')
            .eq('clinic_id', clinicData.id)
            .order('name');

        if (dentError) console.error("Erro dentistas:", dentError);

        const formattedDentists = (dentData || []).map((d: any) => ({
            ...d,
            services: Array.isArray(d.services) 
            ? d.services.map((s: any) => {
                if (typeof s === 'string') {
                    try {
                        const parsed = JSON.parse(s);
                        return {
                            name: parsed.name || s,
                            price: parsed.price || 0,
                            duration: parsed.duration || 60,
                            is_variable_price: parsed.is_variable_price || false
                        };
                    } catch {
                        return { name: s, price: 0, duration: 60, is_variable_price: false };
                    }
                }
                return s;
            })
            : [],
            accepted_plans: Array.isArray(d.accepted_plans) ? d.accepted_plans : []
        }));

        setDentists(formattedDentists);

    } catch (err: any) {
        // console.error("Erro ao carregar dados:", err); // Comentado para limpar console
        setErrorMsg("Não foi possível carregar as informações da clínica. Verifique a URL ou tente novamente.");
    } finally {
        setLoading(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processing) return;
    
    // --- SECURITY: HONEYPOT CHECK ---
    if (patientForm.website_url) {
        console.log("Bot detectado via honeypot.");
        setSubmitted(true); // Fake success
        return;
    }
    
    if (!clinic || !selectedDentist) return;

    if (!patientForm.cpf || !validateCPF(patientForm.cpf)) {
        setToast({ message: "CPF inválido. Por favor, verifique o número digitado.", type: 'error' });
        return;
    }

    if (!patientForm.phone || patientForm.phone.length < 14) {
        setWarningMsg("Por favor, informe um WhatsApp válido com DDD.");
        return;
    }

    setProcessing(true);

    try {
        const requestDate = new Date(selectedDate);
        const [hours, mins] = selectedTime.split(':');
        requestDate.setHours(parseInt(hours), parseInt(mins));

        // CHAMADA VIA EDGE FUNCTION PARA RATE LIMITING
        const { data, error } = await supabase.functions.invoke('create-appointment-request', {
            body: {
                clinic_id: clinic.id,
                dentist_id: selectedDentist.id,
                patient_name: patientForm.name,
                patient_phone: patientForm.phone,
                patient_email: patientForm.email || null, 
                patient_cpf: patientForm.cpf,
                patient_birth_date: patientForm.birthDate || null,
                patient_address: patientForm.address || null,
                service_name: selectedService ? selectedService.name : 'Consulta Geral',
                requested_time: requestDate.toISOString()
            }
        });

        if (error) throw new Error(error.message);
        if (data && data.error) throw new Error(data.error);

        setSubmitted(true);

    } catch (err: any) {
        console.error("Erro ao processar solicitação:", err);
        setToast({ message: err.message || "Ocorreu um erro ao enviar sua solicitação.", type: 'error' });
    } finally {
        setProcessing(false);
    }
  };

  const getAvailableTimes = () => {
     if (loadingSlots) return [];
     if (!selectedDentist || !selectedDentist.schedule_config) {
         return ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
     }

     const dateString = format(selectedDate, 'yyyy-MM-dd');
     const config: any = selectedDentist.schedule_config;
     const blockedDates = config.blocked_dates || [];

     // Check for FULL DAY blocks
     const isFullDayBlocked = blockedDates.some((entry: any) => {
         if (typeof entry === 'string') return entry === dateString;
         return entry.date === dateString && entry.allDay;
     });

     if (isFullDayBlocked) {
         return [];
     }

     const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
     const dayName = daysMap[selectedDate.getDay()];
     const dayConfig = config[dayName];

     if (!dayConfig || !dayConfig.active) return [];

     const times = [];
     
     const startParts = dayConfig.start.split(':');
     const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
     
     const endParts = dayConfig.end.split(':');
     const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
     
     let pauseStartMinutes = -1;
     let pauseEndMinutes = -1;

     if (dayConfig.pause_start && dayConfig.pause_end) {
        const psParts = dayConfig.pause_start.split(':');
        pauseStartMinutes = parseInt(psParts[0]) * 60 + parseInt(psParts[1]);
        
        const peParts = dayConfig.pause_end.split(':');
        pauseEndMinutes = parseInt(peParts[0]) * 60 + parseInt(peParts[1]);
     }

     // Get PARTIAL blocks for this day
     const partialBlocks = blockedDates.filter((entry: any) => {
         return typeof entry === 'object' && entry.date === dateString && !entry.allDay;
     });

     const serviceDuration = selectedService?.duration || 60;
     const now = new Date();
     
     for (let m = startMinutes; m < endMinutes; m += 30) {
        const slotStart = new Date(selectedDate);
        slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
        
        if (isAfter(now, slotStart)) continue;

        const slotEnd = addMinutes(slotStart, serviceDuration);
        const workEnd = new Date(selectedDate);
        workEnd.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
        if (isAfter(slotEnd, workEnd)) continue;

        if (pauseStartMinutes !== -1) {
            const lunchStart = new Date(selectedDate);
            lunchStart.setHours(Math.floor(pauseStartMinutes / 60), pauseStartMinutes % 60, 0, 0);
            const lunchEnd = new Date(selectedDate);
            lunchEnd.setHours(Math.floor(pauseEndMinutes / 60), pauseEndMinutes % 60, 0, 0);

            if (slotStart < lunchEnd && slotEnd > lunchStart) continue;
        }

        const isPartiallyBlocked = partialBlocks.some((block: any) => {
            const bStartParts = block.start.split(':');
            const bEndParts = block.end.split(':');
            const bStart = new Date(selectedDate);
            bStart.setHours(parseInt(bStartParts[0]), parseInt(bStartParts[1]), 0, 0);
            const bEnd = new Date(selectedDate);
            bEnd.setHours(parseInt(bEndParts[0]), parseInt(bEndParts[1]), 0, 0);
            return slotStart < bEnd && slotEnd > bStart;
        });

        if (isPartiallyBlocked) continue;

        const hasConflict = existingAppointments.some(appt => {
            const apptStart = parseISO(appt.start_time);
            const apptEnd = parseISO(appt.end_time);
            return areIntervalsOverlapping({ start: slotStart, end: slotEnd }, { start: apptStart, end: apptEnd });
        });

        if (hasConflict) continue;
        
        const h = Math.floor(m / 60);
        const min = m % 60;
        times.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
     }
     return times;
  };

  const isDateBlocked = (date: Date) => {
      if (!selectedDentist || !selectedDentist.schedule_config) return false;
      const config: any = selectedDentist.schedule_config;
      const dateString = format(date, 'yyyy-MM-dd');
      
      const blockedDates = config.blocked_dates || [];
      return blockedDates.some((entry: any) => {
          if (typeof entry === 'string') return entry === dateString;
          return entry.date === dateString && entry.allDay;
      });
  };

  if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 bg-gray-950">
          <Loader2 className="animate-spin text-primary mb-4" size={40} />
          <p className="font-medium">Carregando...</p>
      </div>
  );
  
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-gray-100">
        <div className="bg-gray-900 border border-white/10 p-8 rounded-2xl shadow-2xl text-center max-w-md animate-fade-in-up">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-6 border border-green-500/30">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Solicitação Enviada!</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            A clínica <strong>{clinic?.name}</strong> recebeu seu pedido. 
            {patientForm.email ? " Você receberá uma confirmação por e-mail em breve." : " Aguarde o contato da clínica."}
          </p>
          <button onClick={() => navigate('/')} className="w-full px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition shadow-lg">Voltar ao Início</button>
        </div>
      </div>
    );
  }

  if (errorMsg || !clinic) {
      return (
        <div className="min-h-screen bg-gray-950 relative flex flex-col">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-xl w-full max-w-sm text-center">
                    <div className="bg-red-900/20 p-3 rounded-full inline-block mb-4 border border-red-500/30"><AlertTriangle className="text-red-500" size={32} /></div>
                    <h3 className="text-lg font-bold text-white mb-2">Ops! Algo deu errado</h3>
                    <p className="text-gray-400 mb-6 text-sm">{errorMsg || "Não foi possível carregar as informações da clínica."}</p>
                    <button onClick={() => navigate('/')} className="w-full px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-200 font-bold transition">Ir para o Início</button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      <header className="bg-gray-950/90 backdrop-blur-md border-b border-white/5 py-6 relative z-10 sticky top-0">
        <div className="absolute top-6 left-4 sm:left-8">
            <button onClick={() => navigate('/')} className="flex items-center text-gray-400 hover:text-white transition-colors text-sm font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5">
                <ArrowLeft size={16} className="mr-1" />
                <span className="hidden sm:inline">Voltar</span>
            </button>
        </div>
        <div className="max-w-3xl mx-auto px-4 flex flex-col items-center text-center">
            {clinic.logo_url ? <img src={clinic.logo_url} alt={`${clinic.name} Logo`} className="h-16 w-auto object-contain mb-3 rounded-lg border border-white/10 bg-gray-800" /> : <div className="mb-3"><Logo className="w-16 h-16" /></div>}
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">{clinic.name}</h1>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-gray-400 mb-2">
                {(clinic.address || (clinic.city && clinic.state)) && <div className="flex items-center"><MapPin size={14} className="mr-1 text-primary" />{clinic.address}{clinic.address && clinic.city ? ' - ' : ''}{clinic.city && clinic.state ? `${clinic.city}/${clinic.state}` : ''}</div>}
                {clinic.whatsapp && <a href={`https://wa.me/55${clinic.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-green-400 transition-colors cursor-pointer"><Smartphone size={14} className="mr-1 text-green-500" />{clinic.whatsapp}</a>}
                {clinic.phone && <div className="flex items-center"><Phone size={14} className="mr-1 text-gray-500" />{clinic.phone}</div>}
            </div>
            {clinic.observation && <div className="flex items-center text-sm text-gray-400 mt-2 max-w-lg mx-auto bg-gray-900/50 px-3 py-1 rounded-full border border-white/10"><Info size={14} className="mr-2 text-blue-400 flex-shrink-0" /><span className="truncate">{clinic.observation}</span></div>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 relative z-10">
        {step === 1 && (
            <div className="animate-fade-in-up">
                <h2 className="text-xl font-bold mb-6 text-white flex items-center"><span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">1</span> Escolha um Profissional</h2>
                <div className="grid gap-4">
                    {dentists.map(d => (
                        <button key={d.id} onClick={() => { setSelectedDentist(d); setStep(2); }} className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/5 hover:border-primary/50 transition text-left group">
                            <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{d.name}</h3>
                            <p className="text-gray-400 text-sm mb-4">{d.specialties?.join(', ') || 'Clínico Geral'}</p>
                            {d.accepted_plans && d.accepted_plans.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center"><ShieldCheck size={12} className="mr-1 text-primary"/> Aceita Convênios:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {d.accepted_plans.map((plan, idx) => <span key={idx} className="text-[10px] bg-blue-900/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-medium">{plan}</span>)}
                                    </div>
                                </div>
                            )}
                            {d.services && d.services.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Principais Procedimentos:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {d.services.slice(0,3).map((s, idx) => <span key={idx} className="text-[10px] bg-gray-800 text-gray-300 border border-white/5 px-2 py-1 rounded">{s.name}</span>)}
                                        {d.services.length > 3 && <span className="text-[10px] text-gray-500 py-1 px-1">+{d.services.length - 3}</span>}
                                    </div>
                                </div>
                            )}
                        </button>
                    ))}
                    {dentists.length === 0 && <div className="text-center py-12 text-gray-500 bg-gray-900/30 rounded-lg border border-dashed border-white/10">Nenhum profissional disponível no momento.</div>}
                </div>
            </div>
        )}

        {step === 2 && (
            <div className="animate-fade-in-up">
                <button onClick={() => setStep(1)} className="text-sm text-gray-400 mb-4 hover:text-white transition flex items-center"><ArrowLeft size={14} className="mr-1"/> Voltar</button>
                <h2 className="text-xl font-bold mb-6 text-white flex items-center"><span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">2</span> Selecione o Serviço</h2>
                <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/5">
                    <p className="font-bold text-gray-300 mb-4 text-sm">Profissional: <span className="text-white ml-1">{selectedDentist?.name}</span></p>
                    <div className="space-y-3">
                        {selectedDentist?.services && selectedDentist.services.length > 0 ? (
                            selectedDentist.services.map((service, idx) => (
                                <button key={idx} onClick={() => { setSelectedService(service); setStep(3); }} className="w-full flex justify-between items-center p-4 border border-white/5 rounded-lg hover:border-primary/50 hover:bg-gray-800/50 transition group">
                                    <div className="text-left">
                                        <div className="font-bold text-white group-hover:text-primary transition-colors">{service.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center mt-1"><Clock size={12} className="mr-1"/> {service.duration} minutos</div>
                                    </div>
                                    {service.covered_by_plans && <span className="text-xs text-green-400 bg-green-900/20 border border-green-500/20 px-2 py-1 rounded-full font-bold flex items-center"><ShieldCheck size={12} className="mr-1"/> Aceita Plano</span>}
                                </button>
                            ))
                        ) : (
                             <button onClick={() => { setSelectedService({name: 'Consulta Geral', price: 0, duration: 60}); setStep(3); }} className="w-full flex justify-between items-center p-4 border border-white/5 rounded-lg hover:border-primary/50 hover:bg-gray-800/50 transition group">
                                <div className="text-left">
                                    <div className="font-bold text-white group-hover:text-primary transition-colors">Consulta Geral / Avaliação</div>
                                    <div className="text-xs text-gray-500 flex items-center mt-1"><Clock size={12} className="mr-1"/> 60 minutos</div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {step === 3 && (
            <div className="animate-fade-in-up">
                <button onClick={() => setStep(2)} className="text-sm text-gray-400 mb-4 hover:text-white transition flex items-center"><ArrowLeft size={14} className="mr-1"/> Voltar</button>
                <h2 className="text-xl font-bold mb-6 text-white flex items-center"><span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">3</span> Escolha Data e Horário</h2>
                
                <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/5 mb-6">
                    <label className="block text-sm font-bold text-gray-400 mb-3">Data Disponível</label>
                    <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar">
                        {Array.from({length: 14}).map((_, i) => {
                            const date = addDays(startOfToday(), i); 
                            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                            const blocked = isDateBlocked(date);
                            return (
                                <button key={i} disabled={blocked} onClick={() => setSelectedDate(date)} className={`flex-shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center border transition-all ${blocked ? 'bg-gray-800/50 opacity-30 cursor-not-allowed border-transparent' : isSelected ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-gray-800 border-white/5 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                                    <span className="text-[10px] uppercase font-bold tracking-wider">{format(date, 'EEE', {locale: ptBR})}</span>
                                    <span className={`text-xl font-black ${blocked ? 'line-through' : ''}`}>{format(date, 'd')}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 min-h-[200px]">
                    {loadingSlots ? 
                        <div className="col-span-full flex flex-col justify-center items-center h-full text-gray-500">
                            <Loader2 className="animate-spin text-primary mb-2" size={32} />
                            <span className="text-sm">Buscando horários...</span>
                        </div> 
                    : getAvailableTimes().length > 0 ? getAvailableTimes().map(time => (
                         <button key={time} onClick={() => { setSelectedTime(time); setStep(4); }} className="py-3 bg-gray-800/50 border border-white/5 rounded-lg hover:bg-primary hover:text-white hover:border-primary text-center font-bold text-primary transition-all shadow-sm">
                            {time}
                         </button>
                    )) : (
                        <div className="col-span-full text-center text-gray-500 py-12 italic border border-dashed border-white/10 rounded-xl flex flex-col justify-center items-center h-full bg-gray-900/30">
                            <Clock size={32} className="mb-3 opacity-30"/>
                            {isDateBlocked(selectedDate) ? "Data indisponível na agenda do profissional." : "Nenhum horário disponível para esta data com duração suficiente."}
                        </div>
                    )}
                </div>
            </div>
        )}

        {step === 4 && (
             <div className="animate-fade-in-up">
                <button onClick={() => setStep(3)} className="text-sm text-gray-400 mb-4 hover:text-white transition flex items-center"><ArrowLeft size={14} className="mr-1"/> Voltar</button>
                <h2 className="text-xl font-bold mb-6 text-white flex items-center"><span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">4</span> Seus Dados</h2>
                
                <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/5">
                    <div className="mb-8 p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg text-sm text-blue-200 flex items-start">
                        <Clock className="mr-3 flex-shrink-0 text-blue-400" size={20}/>
                        <div>
                            <span className="font-bold text-white uppercase text-xs tracking-wider block mb-1">Resumo do Agendamento</span>
                            <div className="text-base font-bold text-white">{selectedDentist?.name} - {selectedService?.name}</div>
                            <div className="text-blue-300 mt-1">{format(selectedDate, "dd 'de' MMMM", {locale: ptBR})} às {selectedTime}</div>
                            <span className="text-xs mt-2 block opacity-60">Duração estimada: {selectedService?.duration}min</span>
                        </div>
                    </div>

                    <form onSubmit={handleBooking} className="space-y-5">
                        <div className="hidden" aria-hidden="true"><label>Não preencha este campo</label><input type="text" name="website_url" tabIndex={-1} autoComplete="off" value={patientForm.website_url} onChange={e => setPatientForm({...patientForm, website_url: e.target.value})}/></div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo *</label>
                            <input type="text" required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={patientForm.name} onChange={e => setPatientForm({...patientForm, name: e.target.value})}/>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp *</label>
                                <input type="text" required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={patientForm.phone} onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 11) v = v.slice(0, 11); v = v.replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2'); setPatientForm({...patientForm, phone: v}); }} placeholder="(00) 00000-0000"/>
                             </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF *</label>
                                <input type="text" required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" placeholder="000.000.000-00" value={patientForm.cpf} onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 11) v = v.slice(0, 11); v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); setPatientForm({...patientForm, cpf: v}); }}/>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail (Opcional)</label>
                                <input type="email" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={patientForm.email} onChange={e => setPatientForm({...patientForm, email: e.target.value})}/>
                             </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de Nascimento (Opcional)</label>
                                <input type="date" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={patientForm.birthDate} onChange={e => setPatientForm({...patientForm, birthDate: e.target.value})}/>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço (Opcional)</label>
                            <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={patientForm.address} onChange={e => setPatientForm({...patientForm, address: e.target.value})} placeholder="Rua, Número, Bairro, Cidade - UF"/>
                        </div>
                        
                        <button type="submit" disabled={processing} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-sky-600 shadow-[0_0_20px_rgba(14,165,233,0.3)] mt-6 flex items-center justify-center disabled:opacity-50 transition-all transform hover:-translate-y-1">
                            {processing ? <Loader2 className="animate-spin mr-2" /> : 'Confirmar Agendamento'}
                        </button>
                    </form>
                </div>
            </div>
        )}
      </main>

      {warningMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-sm text-center animate-fade-in-up">
             <div className="bg-yellow-900/20 p-3 rounded-full inline-block mb-4 border border-yellow-500/30"><AlertTriangle className="text-yellow-500" size={32} /></div>
             <h3 className="text-lg font-bold text-white mb-2">Dados Incompletos</h3>
             <p className="text-gray-400 mb-6 text-sm">{warningMsg}</p>
             <button onClick={() => setWarningMsg('')} className="w-full px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-200 font-bold transition">Entendi</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicBookingPage;
