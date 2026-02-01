
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Dentist, ServiceItem } from '../types';
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
  
  // Estado para armazenar agendamentos existentes do dia
  const [existingAppointments, setExistingAppointments] = useState<{start_time: string, end_time: string}[]>([]);
  
  const [patientForm, setPatientForm] = useState({ 
    name: '', 
    phone: '', 
    email: '',
    cpf: '',
    birthDate: '',
    address: '',
    // Honeypot field: deve permanecer vazio
    website_url: '' 
  });
  const [submitted, setSubmitted] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Toast State
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
        // REMOVIDO: email da query
        const { data: clinicData, error: clinicError } = await supabase
            .from('public_clinics')
            .select('id, name, slug, address, city, state, observation, logo_url, phone, whatsapp')
            .eq('slug', slug)
            .single();

        if (clinicError) {
            console.error("Erro clínica:", clinicError);
            throw new Error("Clínica não encontrada.");
        }
        if (!clinicData) throw new Error("Clínica não encontrada.");

        setClinic(clinicData);

        // SEGURANÇA: Busca dados da VIEW 'public_dentists'
        // REMOVIDO: 'cro' e 'color' da query
        const { data: dentData, error: dentError } = await supabase
            .from('public_dentists')
            .select('id, name, specialties, services, accepted_plans, schedule_config')
            .eq('clinic_id', clinicData.id)
            .order('name');

        if (dentError) {
             console.error("Erro dentistas:", dentError);
        }

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
        console.error("Erro ao carregar dados:", err);
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

        if (error) {
            // Erro de rede ou função
            throw new Error(error.message);
        }

        if (data && data.error) {
            // Erro retornado pela lógica da função (Ex: Rate Limit)
            throw new Error(data.error);
        }

        setSubmitted(true);

    } catch (err: any) {
        console.error("Erro ao processar solicitação:", err);
        // Exibe mensagem amigável ou a mensagem específica de erro (ex: Rate Limit)
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
        
        // Define o intervalo proposto para o agendamento
        const slotStart = new Date(selectedDate);
        slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
        
        // Verifica se o horário já passou (caso seja o dia atual)
        if (isAfter(now, slotStart)) continue;

        const slotEnd = addMinutes(slotStart, serviceDuration);

        // 0. Verifica se o término do serviço ultrapassa o expediente
        const workEnd = new Date(selectedDate);
        workEnd.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
        if (isAfter(slotEnd, workEnd)) continue;

        // 1. Check Lunch Pause (Overlap Logic)
        if (pauseStartMinutes !== -1) {
            const lunchStart = new Date(selectedDate);
            lunchStart.setHours(Math.floor(pauseStartMinutes / 60), pauseStartMinutes % 60, 0, 0);
            const lunchEnd = new Date(selectedDate);
            lunchEnd.setHours(Math.floor(pauseEndMinutes / 60), pauseEndMinutes % 60, 0, 0);

            if (slotStart < lunchEnd && slotEnd > lunchStart) {
                continue;
            }
        }

        // 2. Check Partial Blocked Times
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

        // 3. Check Existing Appointments (Direct DB Check via Secure View)
        const hasConflict = existingAppointments.some(appt => {
            const apptStart = parseISO(appt.start_time);
            const apptEnd = parseISO(appt.end_time);
            
            // Verifica sobreposição de intervalos
            return areIntervalsOverlapping(
                { start: slotStart, end: slotEnd },
                { start: apptStart, end: apptEnd }
            );
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
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 bg-gray-50">
          <Loader2 className="animate-spin text-primary mb-4" size={40} />
          <p className="font-medium">Carregando informações...</p>
      </div>
  );
  
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md animate-fade-in-up">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitação Enviada!</h2>
          <p className="text-gray-600 mb-6">
            A clínica <strong>{clinic?.name}</strong> recebeu seu pedido. 
            {patientForm.email ? " Você receberá uma confirmação por e-mail em breve." : " Aguarde o contato da clínica."}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Se houver erro, mostramos o Modal mas mantemos um fundo genérico (sem dados da clínica)
  if (errorMsg || !clinic) {
      return (
        <div className="min-h-screen bg-gray-50 relative flex flex-col">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
                    <div className="bg-red-100 p-3 rounded-full inline-block mb-4">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Ops! Algo deu errado</h3>
                    <p className="text-gray-600 mb-6 text-sm">{errorMsg || "Não foi possível carregar os dados da clínica."}</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-bold transition"
                    >
                        Ir para o Início
                    </button>
                </div>
            </div>
            
            <header className="bg-white shadow py-6 opacity-30 pointer-events-none">
                <div className="max-w-3xl mx-auto px-4 flex flex-col items-center text-center">
                    <div className="bg-gray-200 p-3 rounded-full h-16 w-16 mb-3"></div>
                    <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-64 bg-gray-200 rounded"></div>
                </div>
            </header>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <header className="bg-white shadow py-6 relative">
        <div className="absolute top-6 left-4 sm:left-8">
            <button 
                onClick={() => navigate('/')} 
                className="flex items-center text-gray-500 hover:text-primary transition-colors text-sm font-medium bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200 hover:border-primary"
            >
                <ArrowLeft size={16} className="mr-1" />
                <span className="hidden sm:inline">Voltar</span>
            </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 flex flex-col items-center text-center">
            {clinic.logo_url ? (
              <img 
                src={clinic.logo_url} 
                alt={`${clinic.name} Logo`} 
                className="h-16 w-auto object-contain mb-3"
              />
            ) : (
              <div className="bg-primary p-3 rounded-full text-white mb-3 shadow-lg shadow-primary/30">
                  <Smile size={32} />
              </div>
            )}
            
            <h1 className="text-2xl font-black text-gray-800 tracking-tight mb-2">{clinic.name}</h1>
            
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-2">
                {(clinic.address || (clinic.city && clinic.state)) && (
                  <div className="flex items-center">
                     <MapPin size={14} className="mr-1 text-primary" />
                     {clinic.address}
                     {clinic.address && clinic.city ? ' - ' : ''}
                     {clinic.city && clinic.state ? `${clinic.city}/${clinic.state}` : ''}
                  </div>
                )}
                {clinic.whatsapp && (
                  <a 
                    href={`https://wa.me/55${clinic.whatsapp.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-green-600 transition-colors cursor-pointer"
                  >
                     <Smartphone size={14} className="mr-1 text-green-600" />
                     {clinic.whatsapp}
                  </a>
                )}
                {clinic.phone && (
                  <div className="flex items-center">
                     <Phone size={14} className="mr-1 text-gray-500" />
                     {clinic.phone}
                  </div>
                )}
            </div>

            {clinic.observation && (
              <div className="flex items-center text-sm text-gray-500 mt-2 max-w-lg mx-auto bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                 <Info size={14} className="mr-2 text-blue-500 flex-shrink-0" />
                 <span className="truncate">{clinic.observation}</span>
              </div>
            )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {step === 1 && (
            <div className="animate-fade-in-up">
                <h2 className="text-xl font-semibold mb-6 text-gray-800">Escolha um Profissional</h2>
                <div className="grid gap-4">
                    {dentists.map(d => (
                        <button 
                            key={d.id} 
                            onClick={() => { setSelectedDentist(d); setStep(2); }}
                            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition text-left border-l-4 border-primary group"
                        >
                            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{d.name}</h3>
                            <p className="text-gray-500 text-sm mb-3">{d.specialties?.join(', ') || 'Clínico Geral'}</p>
                            
                            {d.accepted_plans && d.accepted_plans.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center">
                                        <ShieldCheck size={12} className="mr-1 text-primary"/> Aceita Convênios:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {d.accepted_plans.map((plan, idx) => (
                                            <span key={idx} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium">
                                                {plan}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {d.services && d.services.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Principais Procedimentos:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {d.services.slice(0,3).map((s, idx) => (
                                            <span key={idx} className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-100">
                                                {s.name}
                                            </span>
                                        ))}
                                        {d.services.length > 3 && (
                                            <span className="text-[10px] text-gray-400 py-1 px-1">+{d.services.length - 3}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </button>
                    ))}
                    {dentists.length === 0 && (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                            Nenhum profissional disponível no momento.
                        </div>
                    )}
                </div>
            </div>
        )}

        {step === 2 && (
            <div className="animate-fade-in-up">
                <button onClick={() => setStep(1)} className="text-sm text-gray-500 mb-4 hover:underline">&larr; Voltar</button>
                <h2 className="text-xl font-semibold mb-6">Selecione o Serviço</h2>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <p className="font-bold text-gray-800 mb-4">Profissional: <span className="text-primary">{selectedDentist?.name}</span></p>
                    <div className="space-y-3">
                        {selectedDentist?.services && selectedDentist.services.length > 0 ? (
                            selectedDentist.services.map((service, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => { setSelectedService(service); setStep(3); }}
                                    className="w-full flex justify-between items-center p-4 border rounded-lg hover:border-primary hover:bg-blue-50 transition"
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-gray-800">{service.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center mt-1">
                                            <Clock size={12} className="mr-1"/> {service.duration} minutos
                                        </div>
                                    </div>
                                    {service.covered_by_plans && (
                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-bold flex items-center">
                                            <ShieldCheck size={12} className="mr-1"/> Aceita Plano
                                        </span>
                                    )}
                                </button>
                            ))
                        ) : (
                             <button 
                                onClick={() => { setSelectedService({name: 'Consulta Geral', price: 0, duration: 60}); setStep(3); }}
                                className="w-full flex justify-between items-center p-4 border rounded-lg hover:border-primary hover:bg-blue-50 transition"
                            >
                                <div className="text-left">
                                    <div className="font-bold text-gray-800">Consulta Geral / Avaliação</div>
                                    <div className="text-xs text-gray-500 flex items-center mt-1">
                                        <Clock size={12} className="mr-1"/> 60 minutos
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {step === 3 && (
            <div className="animate-fade-in-up">
                <button onClick={() => setStep(2)} className="text-sm text-gray-500 mb-4 hover:underline">&larr; Voltar</button>
                <h2 className="text-xl font-semibold mb-6">Escolha Data e Horário</h2>
                
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                        {Array.from({length: 14}).map((_, i) => {
                            const date = addDays(startOfToday(), i); 
                            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                            const blocked = isDateBlocked(date);
                            
                            return (
                                <button
                                    key={i}
                                    disabled={blocked}
                                    onClick={() => setSelectedDate(date)}
                                    className={`flex-shrink-0 w-16 h-20 rounded-lg flex flex-col items-center justify-center border transition-opacity ${
                                        blocked ? 'bg-gray-100 opacity-50 cursor-not-allowed border-gray-200' :
                                        isSelected ? 'bg-primary text-white border-primary' : 'bg-gray-50 border-gray-200 hover:border-primary'
                                    }`}
                                >
                                    <span className="text-xs uppercase">{format(date, 'EEE', {locale: ptBR})}</span>
                                    <span className={`text-xl font-bold ${blocked ? 'line-through' : ''}`}>{format(date, 'd')}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 min-h-[200px]">
                    {loadingSlots ? (
                        <div className="col-span-3 flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    ) : getAvailableTimes().length > 0 ? getAvailableTimes().map(time => (
                         <button
                            key={time}
                            onClick={() => { setSelectedTime(time); setStep(4); }}
                            className="py-3 border rounded-lg hover:bg-gray-50 text-center font-medium text-primary transition-colors"
                        >
                            {time}
                        </button>
                    )) : (
                        <div className="col-span-3 text-center text-gray-400 py-4 italic border rounded-lg border-dashed border-gray-200 flex flex-col justify-center items-center h-full">
                            <Clock size={24} className="mb-2 opacity-50"/>
                            {isDateBlocked(selectedDate) 
                                ? "Data indisponível na agenda do profissional." 
                                : "Nenhum horário disponível para esta data com duração suficiente."}
                        </div>
                    )}
                </div>
            </div>
        )}

        {step === 4 && (
             <div className="animate-fade-in-up">
                <button onClick={() => setStep(3)} className="text-sm text-gray-500 mb-4 hover:underline">&larr; Voltar</button>
                <h2 className="text-xl font-semibold mb-6">Seus Dados</h2>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="mb-6 p-4 bg-blue-50 rounded text-sm text-blue-800 flex items-start">
                        <Clock className="mr-2 flex-shrink-0" size={18}/>
                        <div>
                            <span className="font-bold">Resumo:</span><br/>
                            {selectedDentist?.name} - {selectedService?.name}<br/>
                            {format(selectedDate, "dd 'de' MMMM", {locale: ptBR})} às {selectedTime}<br/>
                            <span className="text-xs mt-1 block opacity-80">Duração aprox: {selectedService?.duration}min</span>
                        </div>
                    </div>

                    <form onSubmit={handleBooking} className="space-y-4">
                        {/* HONEYPOT FIELD (Hidden) - Segurança Anti-Spam */}
                        <div className="hidden" aria-hidden="true">
                            <label>Não preencha este campo</label>
                            <input 
                                type="text" 
                                name="website_url" 
                                tabIndex={-1} 
                                autoComplete="off"
                                value={patientForm.website_url}
                                onChange={e => setPatientForm({...patientForm, website_url: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome Completo *</label>
                            <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 outline-none focus:ring-1 focus:ring-primary" 
                                value={patientForm.name} onChange={e => setPatientForm({...patientForm, name: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">WhatsApp *</label>
                                <input 
                                    type="text" required 
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 outline-none focus:ring-1 focus:ring-primary"
                                    value={patientForm.phone} 
                                    onChange={e => {
                                        let v = e.target.value.replace(/\D/g, '');
                                        if (v.length > 11) v = v.slice(0, 11);
                                        v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
                                        v = v.replace(/(\d)(\d{4})$/, '$1-$2');
                                        setPatientForm({...patientForm, phone: v});
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">CPF *</label>
                                <input 
                                    type="text" 
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="000.000.000-00"
                                    value={patientForm.cpf} 
                                    onChange={e => {
                                      let v = e.target.value.replace(/\D/g, ''); 
                                      if (v.length > 11) v = v.slice(0, 11); 
                                      v = v.replace(/(\d{3})(\d)/, '$1.$2');
                                      v = v.replace(/(\d{3})(\d)/, '$1.$2');
                                      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                      setPatientForm({...patientForm, cpf: v});
                                    }}
                                />
                            </div>
                        </div>

                        {/* Campos Opcionais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">E-mail (Opcional)</label>
                                <input type="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 outline-none focus:ring-1 focus:ring-primary" 
                                    value={patientForm.email} onChange={e => setPatientForm({...patientForm, email: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Data de Nascimento (Opcional)</label>
                                <input type="date" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 outline-none focus:ring-1 focus:ring-primary" 
                                    value={patientForm.birthDate} onChange={e => setPatientForm({...patientForm, birthDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Endereço Residencial (Opcional)</label>
                            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 outline-none focus:ring-1 focus:ring-primary" 
                                value={patientForm.address} onChange={e => setPatientForm({...patientForm, address: e.target.value})}
                                placeholder="Rua, Número, Bairro, Cidade - UF"
                            />
                        </div>

                        <button type="submit" disabled={processing} className="w-full py-3 bg-primary text-white rounded-lg font-bold text-lg hover:bg-sky-600 shadow mt-4 flex items-center justify-center disabled:opacity-50">
                            {processing ? <Loader2 className="animate-spin mr-2" /> : 'Confirmar Agendamento'}
                        </button>
                    </form>
                </div>
            </div>
        )}
      </main>

      {/* Warning Modal */}
      {warningMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center animate-fade-in-up">
             <div className="bg-yellow-100 p-3 rounded-full inline-block mb-4">
                <AlertTriangle className="text-yellow-600" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Dados Incompletos</h3>
             <p className="text-gray-600 mb-6 text-sm">
               {warningMsg}
             </p>
             <button 
               onClick={() => setWarningMsg('')}
               className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-sky-600 font-bold transition shadow-md"
             >
               Entendi
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicBookingPage;
