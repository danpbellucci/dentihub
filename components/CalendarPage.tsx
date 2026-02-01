
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Appointment, Dentist, Client } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  parseISO,
  isToday,
  addMinutes,
  isWithinInterval,
  areIntervalsOverlapping
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  AlertTriangle, 
  Trash2, 
  Filter, 
  User, 
  X, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  LayoutGrid,
  List as ListIcon,
  Calendar,
  DollarSign,
  Clock,
  CalendarCheck,
  CreditCard,
  UserCheck,
  Activity,
  CheckCircle
} from 'lucide-react';
import Toast, { ToastType } from './Toast';

const CalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('list');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  
  // Filters
  const [filterClientId, setFilterClientId] = useState('');
  const [filterDentistId, setFilterDentistId] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [hideCompletedPaid, setHideCompletedPaid] = useState(false);
  const [hideCancelled, setHideCancelled] = useState(true); // Default true para limpar a visualização

  // Modal Principal (Novo/Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    dentist_id: '',
    service_name: '',
    date: '',
    time: '',
    duration: 60,
    status: 'scheduled',
    payment_status: 'pending',
    amount: 0
  });
  
  // Estado para controlar a exibição do input "Outro" serviço
  const [isCustomService, setIsCustomService] = useState(false);
  // Estado para armazenar os horários disponíveis gerados
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Delete Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Return Visit Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [apptForReturn, setApptForReturn] = useState<Appointment | null>(null);

  // Time Validation Warning Modal
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  
  // Payment Confirmation Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');

  // Finance Auto Entry Modal
  const [showFinanceAutoModal, setShowFinanceAutoModal] = useState(false);

  // Permissions
  const [canDelete, setCanDelete] = useState(true); // Default true: quem acessa a página, pode deletar.
  const [isDentistUser, setIsDentistUser] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const paymentMethods = ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência', 'Convênio'];

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (clinicId) {
        fetchAppointments();
    }
  }, [currentMonth, filterClientId, filterDentistId, filterPaymentStatus, filterStatus, hideCompletedPaid, hideCancelled, clinicId]);

  // Recalcula horários quando muda o dentista, a data ou a DURAÇÃO no formulário
  useEffect(() => {
    if (isModalOpen && formData.dentist_id && formData.date) {
        generateTimeSlots();
    }
  }, [formData.dentist_id, formData.date, formData.duration, isModalOpen]);

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Identificar Perfil e Clínica Correta
    let targetClinicId = user.id;
    const { data: profile } = await supabase.from('user_profiles').select('clinic_id, role').eq('id', user.id).maybeSingle();
    
    if (profile) {
        targetClinicId = profile.clinic_id;
        
        // Se o usuário está aqui, ele tem acesso ao módulo 'calendar' (validado no Layout).
        // Portanto, ele tem permissão total de CRUD.
        setCanDelete(true); 
        
        // Mantemos apenas a lógica de filtro automático se o papel for explicitamente 'dentist',
        // para facilitar a UX deles verem apenas a própria agenda por padrão.
        if (profile.role === 'dentist') {
            setIsDentistUser(true);
            const { data: myDentistRecord } = await supabase
                .from('dentists')
                .select('id')
                .eq('email', user.email)
                .eq('clinic_id', targetClinicId)
                .maybeSingle();
            
            if (myDentistRecord) {
                setFilterDentistId(myDentistRecord.id);
            }
        }
    }
    setClinicId(targetClinicId);

    // 2. Carregar Dados Auxiliares usando o ID correto
    await fetchAuxiliaryData(targetClinicId);
  };

  const fetchAuxiliaryData = async (targetId: string) => {
    // Busca Dentistas com tratamento do JSON de serviços
    const { data: dentistsData } = await supabase
        .from('dentists')
        .select('*')
        .eq('clinic_id', targetId)
        .order('name');
    
    if (dentistsData) {
        const formattedDentists = dentistsData.map((d: any) => ({
            ...d,
            services: Array.isArray(d.services) 
            ? d.services.map((s: any) => {
                if (typeof s === 'string') {
                    if (s.trim().startsWith('{')) {
                        try {
                            const parsed = JSON.parse(s);
                            return { 
                                name: parsed.name || s, 
                                price: parsed.price || 0,
                                duration: parsed.duration || 60 
                            };
                        } catch {
                            return { name: s, price: 0, duration: 60 };
                        }
                    }
                    return { name: s, price: 0, duration: 60 };
                }
                return s;
            })
            : []
        }));
        setDentists(formattedDentists as unknown as Dentist[]);
    }

    const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('clinic_id', targetId)
        .order('name');
    if (clientsData) setClients(clientsData as unknown as Client[]);
  };

  const fetchAppointments = async () => {
    if (!clinicId) return;
    
    const start = startOfWeek(startOfMonth(currentMonth)).toISOString();
    const end = endOfWeek(endOfMonth(currentMonth)).toISOString();

    let query = supabase
      .from('appointments')
      .select('*, dentist:dentists(name, color), client:clients(name, email)')
      .eq('clinic_id', clinicId)
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time', { ascending: true }); 

    if (filterClientId) query = query.eq('client_id', filterClientId);
    if (filterDentistId) query = query.eq('dentist_id', filterDentistId);
    if (filterPaymentStatus !== 'all') query = query.eq('payment_status', filterPaymentStatus as "paid" | "pending");
    if (filterStatus !== 'all') query = query.eq('status', filterStatus as "scheduled" | "completed" | "cancelled" | "confirmed");
    
    // Apply server-side filtering for Cancelled if checkbox is checked
    if (hideCancelled) query = query.neq('status', 'cancelled');

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching appointments:', error);
    } else {
      let filteredData = data as any || [];
      
      // Apply client-side filtering for Completed & Paid
      if (hideCompletedPaid) {
          filteredData = filteredData.filter((a: any) => !(a.status === 'completed' && a.payment_status === 'paid'));
      }

      setAppointments(filteredData);
    }
    setLoading(false);
  };

  const clearFilters = () => {
      setFilterClientId('');
      // Only clear dentist filter if NOT a dentist user
      if (!isDentistUser) {
          setFilterDentistId('');
      }
      setFilterPaymentStatus('all');
      setFilterStatus('all');
      setHideCompletedPaid(false);
      setHideCancelled(true); // Reset to default true
  };

  // --- LÓGICA DE HORÁRIOS CORRIGIDA ---
  const generateTimeSlots = () => {
      const dentist = dentists.find(d => d.id === formData.dentist_id);
      if (!dentist || !dentist.schedule_config) {
          setAvailableTimes(['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
          return;
      }

      const dateStr = formData.date; // YYYY-MM-DD
      const dateObj = new Date(dateStr + 'T00:00:00'); 
      const dayIndex = dateObj.getDay(); 
      const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayKey = daysMap[dayIndex];
      
      const config = dentist.schedule_config as any;
      const dayConfig = config[dayKey];
      const blockedDates = config.blocked_dates || [];
      
      // Get Duration from form
      const duration = formData.duration || 30;

      // 1. Verifica se o dia inteiro está bloqueado
      const isFullDayBlocked = blockedDates.some((entry: any) => {
          if (typeof entry === 'string') return entry === dateStr;
          return entry.date === dateStr && entry.allDay;
      });

      if (isFullDayBlocked || !dayConfig || !dayConfig.active) {
          setAvailableTimes([]); 
          return;
      }

      // 2. Prepara agendamentos existentes no dia para verificar colisão
      const existingAppts = appointments.filter(a => 
          a.dentist_id === formData.dentist_id &&
          a.status !== 'cancelled' &&
          a.id !== editingAppointment?.id && // Não colidir consigo mesmo na edição
          isSameDay(parseISO(a.start_time), dateObj)
      );

      // 3. Prepara bloqueios parciais do dia
      const partialBlocks = blockedDates.filter((entry: any) => {
          return typeof entry === 'object' && entry.date === dateStr && !entry.allDay;
      });

      const times: string[] = [];
      const startParts = dayConfig.start.split(':').map(Number);
      const endParts = dayConfig.end.split(':').map(Number);
      
      let startMins = startParts[0] * 60 + startParts[1];
      const endMins = endParts[0] * 60 + endParts[1];

      let pauseStartMins = -1;
      let pauseEndMins = -1;
      if (dayConfig.pause_start && dayConfig.pause_end) {
          const ps = dayConfig.pause_start.split(':').map(Number);
          const pe = dayConfig.pause_end.split(':').map(Number);
          pauseStartMins = ps[0] * 60 + ps[1];
          pauseEndMins = pe[0] * 60 + pe[1];
      }

      // Loop de 30 em 30 min (Horários de início possíveis)
      while (startMins < endMins) {
          const currentSlotStartMins = startMins;
          const currentSlotEndMins = startMins + duration; // Projeta o término baseado na duração

          // A. Verifica se o serviço termina DEPOIS do expediente
          if (currentSlotEndMins > endMins) {
              startMins += 30;
              continue;
          }

          // B. Verifica Colisão com Almoço
          // Lógica de sobreposição: (StartA < EndB) && (EndA > StartB)
          if (pauseStartMins !== -1) {
              const overlapsLunch = (currentSlotStartMins < pauseEndMins) && (currentSlotEndMins > pauseStartMins);
              if (overlapsLunch) {
                  startMins += 30;
                  continue;
              }
          }

          // C. Verifica Colisão com Bloqueios Parciais
          const overlapsBlock = partialBlocks.some((block: any) => {
              const bStartParts = block.start.split(':').map(Number);
              const bEndParts = block.end.split(':').map(Number);
              const bStartMins = bStartParts[0] * 60 + bStartParts[1];
              const bEndMins = bEndParts[0] * 60 + bEndParts[1];
              
              return (currentSlotStartMins < bEndMins) && (currentSlotEndMins > bStartMins);
          });

          if (overlapsBlock) {
              startMins += 30;
              continue;
          }

          // D. Conflito com Agendamentos Existentes
          const slotStart = new Date(dateObj);
          slotStart.setHours(Math.floor(currentSlotStartMins / 60), currentSlotStartMins % 60, 0, 0);
          
          const slotEnd = addMinutes(slotStart, duration); // Usa a duração real selecionada

          const hasConflict = existingAppts.some(appt => {
              const apptStart = parseISO(appt.start_time);
              const apptEnd = parseISO(appt.end_time);
              // Verifica se o intervalo proposto (slotStart até slotEnd) sobrepõe o agendamento existente
              return areIntervalsOverlapping(
                  { start: slotStart, end: slotEnd },
                  { start: apptStart, end: apptEnd }
              );
          });

          if (!hasConflict) {
              const h = Math.floor(startMins / 60);
              const m = startMins % 60;
              const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              times.push(timeString);
          }
          
          startMins += 30;
      }

      setAvailableTimes(times);
  };

  const processPaymentConfirmation = async () => {
      if (!pendingPaymentId || !clinicId) return;
      setProcessing(true);
      const id = pendingPaymentId;
      const finalAmount = paymentAmount;
      const method = paymentMethod;
      try {
          const { error: apptError } = await supabase.from('appointments').update({ payment_status: 'paid', amount: finalAmount }).eq('id', id);
          if (apptError) throw apptError;
          const { data: existing } = await supabase.from('transactions').select('id').eq('appointment_id', id).maybeSingle();
          if (existing) {
             await supabase.from('transactions').update({ amount: finalAmount, payment_method: method, status: 'completed' }).eq('id', existing.id);
          } else {
             const appt = appointments.find(a => a.id === id);
             await supabase.from('transactions').insert({
                clinic_id: clinicId,
                amount: finalAmount,
                category: 'Consulta',
                type: 'income',
                status: 'completed',
                date: new Date().toISOString(),
                appointment_id: id,
                observation: `Gerado automaticamente via Agenda (Paciente: ${(appt?.client as any)?.name || '---'})`,
                payment_method: method
             });
          }
          const updatedAppointments = appointments.map(a => a.id === id ? { ...a, payment_status: 'paid' as any, amount: finalAmount } : a);
          setAppointments(updatedAppointments);
          setPaymentModalOpen(false);
          setPendingPaymentId(null);
          setShowFinanceAutoModal(true);
      } catch (err: any) {
          console.error("Erro ao confirmar pagamento:", err);
          setToast({ message: "Erro ao processar pagamento: " + err.message, type: 'error' });
      } finally {
          setProcessing(false);
      }
  };

  const handleQuickUpdate = async (id: string, field: string, value: any) => {
    if (field === 'payment_status' && value === 'paid') {
        const appt = appointments.find(a => a.id === id);
        if (appt) {
            setPendingPaymentId(id);
            setPaymentAmount(appt.amount || 0);
            setPaymentMethod('Pix'); 
            setPaymentModalOpen(true);
        }
        return;
    }
    const originalAppointments = [...appointments];
    const updatedAppointments = appointments.map(a => a.id === id ? { ...a, [field]: value } : a);
    setAppointments(updatedAppointments);
    try {
        const { error } = await supabase.from('appointments').update({ [field]: value }).eq('id', id);
        if (error) throw error;
        if (field === 'amount') {
            await supabase.from('transactions').update({ amount: Number(value) }).eq('appointment_id', id);
        }
        if (field === 'payment_status' && value === 'pending') {
            await supabase.from('transactions').delete().eq('appointment_id', id);
        }
        if (field === 'status' && value === 'completed') {
            const appt = updatedAppointments.find(a => a.id === id);
            if (appt) {
                setApptForReturn(appt);
                setReturnModalOpen(true);
            }
        }
    } catch (err) {
        console.error('Erro ao atualizar agendamento:', err);
        setAppointments(originalAppointments);
        setToast({ message: "Erro ao atualizar o registro.", type: 'error' });
    }
  };

  const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleOpenModal = (date?: Date, appointment?: Appointment, isReturn = false) => {
    setIsCustomService(false); 
    if (isReturn && appointment) {
        setEditingAppointment(null);
        setFormData({ client_id: appointment.client_id, dentist_id: appointment.dentist_id, service_name: 'Retorno', date: '', time: '', duration: 30, status: 'scheduled', payment_status: 'pending', amount: 0 });
        setReturnModalOpen(false);
        setIsModalOpen(true);
        return;
    }
    if (appointment) {
      setEditingAppointment(appointment);
      const start = parseISO(appointment.start_time);
      const end = parseISO(appointment.end_time);
      const diffMins = Math.round((end.getTime() - start.getTime()) / 60000);
      const dentist = dentists.find(d => d.id === appointment.dentist_id);
      const isKnownService = dentist?.services?.some(s => s.name === appointment.service_name);
      setIsCustomService(!isKnownService && appointment.service_name !== '');
      setFormData({ client_id: appointment.client_id, dentist_id: appointment.dentist_id, service_name: appointment.service_name, date: format(start, 'yyyy-MM-dd'), time: format(start, 'HH:mm'), duration: diffMins, status: appointment.status, payment_status: appointment.payment_status || 'pending', amount: appointment.amount || 0 });
    } else {
      setEditingAppointment(null);
      const defaultDentistId = filterDentistId || (dentists[0]?.id || '');
      setFormData({ client_id: '', dentist_id: defaultDentistId, service_name: '', date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), time: '', duration: 60, status: 'scheduled', payment_status: 'pending', amount: 0 });
    }
    setIsModalOpen(true);
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === 'custom_option_other') {
          setIsCustomService(true);
          setFormData({ ...formData, service_name: '' }); 
      } else {
          setIsCustomService(false);
          const dentist = dentists.find(d => d.id === formData.dentist_id);
          const service = dentist?.services?.find(s => s.name === val);
          setFormData({ ...formData, service_name: val, amount: service ? service.price : formData.amount, duration: service ? (service.duration || 60) : 60 });
      }
  };

  const sendNotification = async (type: 'created' | 'updated' | 'deleted', appointment: any) => {
      try {
          const client = clients.find(c => c.id === appointment.client_id);
          const dentist = dentists.find(d => d.id === appointment.dentist_id);
          
          if (!client?.email) return; // Não envia se não tiver email

          // Prepara objeto seguro para envio
          const apptData = {
              id: appointment.id,
              date: format(parseISO(appointment.start_time), "dd/MM/yyyy"),
              time: format(parseISO(appointment.start_time), "HH:mm"),
              service_name: appointment.service_name,
              dentist_name: dentist?.name || 'Clínica'
          };

          // Obter a URL base correta (origem), removendo a barra final se existir
          const getOrigin = () => {
              const url = window.location.href.split('#')[0].split('?')[0]; 
              return url.replace(/\/$/, '');
          };

          await supabase.functions.invoke('send-emails', {
              body: {
                  type: 'appointment',
                  subtype: type,
                  appointment: apptData,
                  client: { name: client.name, email: client.email },
                  origin: getOrigin()
              }
          });
      } catch (err) {
          console.error("Erro ao enviar notificação de agendamento:", err);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.time) { setShowTimeWarning(true); return; }
    if (!clinicId) { setToast({ message: "Erro de identificação da clínica. Recarregue a página.", type: 'error' }); return; }

    setProcessing(true);
    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = addMinutes(startDateTime, formData.duration);
      const payload = { clinic_id: clinicId, client_id: formData.client_id, dentist_id: formData.dentist_id, service_name: formData.service_name, start_time: startDateTime.toISOString(), end_time: endDateTime.toISOString(), status: formData.status as any, payment_status: formData.payment_status as 'paid' | 'pending', amount: Number(formData.amount) };
      
      let finalAppt = null;
      let actionType: 'created' | 'updated' = 'created';

      if (editingAppointment) {
        actionType = 'updated';
        const { data, error: updateError } = await supabase.from('appointments').update(payload).eq('id', editingAppointment.id).select().single();
        if (updateError) throw updateError;
        finalAppt = data;

        if (payload.payment_status === 'paid') {
            const { data: existingT } = await supabase.from('transactions').select('id').eq('appointment_id', editingAppointment.id).maybeSingle();
            if (existingT) { await supabase.from('transactions').update({ amount: Number(payload.amount) }).eq('id', existingT.id); } else { const clientName = clients.find(c => c.id === formData.client_id)?.name || 'Paciente'; await supabase.from('transactions').insert({ clinic_id: clinicId, amount: Number(payload.amount), category: 'Consulta', type: 'income', status: 'completed', date: new Date().toISOString(), appointment_id: editingAppointment.id, observation: `Gerado via Edição (Paciente: ${clientName})`, payment_method: 'Dinheiro' }); }
        } else { await supabase.from('transactions').delete().eq('appointment_id', editingAppointment.id); }
      } else {
        const { data: newAppt, error: insertError } = await supabase.from('appointments').insert(payload).select().single();
        if (insertError) throw insertError;
        finalAppt = newAppt;
        
        if (finalAppt && payload.payment_status === 'paid') {
             const clientName = clients.find(c => c.id === formData.client_id)?.name || 'Paciente';
             await supabase.from('transactions').insert({ clinic_id: clinicId, amount: payload.amount, category: 'Consulta', type: 'income', status: 'completed', date: new Date().toISOString(), appointment_id: newAppt.id, observation: `Gerado via Novo Agendamento (Paciente: ${clientName})`, payment_method: 'Dinheiro' });
        }
      }

      // Feedback e Notificação
      const clientHasEmail = clients.find(c => c.id === formData.client_id)?.email;
      const successMessage = actionType === 'created' ? 'Agendamento criado com sucesso!' : 'Agendamento atualizado com sucesso!';
      const emailNote = clientHasEmail ? ' Notificação enviada ao paciente (e-mail cadastrado).' : ' Paciente sem e-mail para notificação.';
      
      setToast({ 
          message: successMessage + emailNote, 
          type: 'success' 
      });

      // Envia notificação por e-mail (Background)
      if (finalAppt) {
          sendNotification(actionType, finalAppt);
      }

      setIsModalOpen(false);
      fetchAppointments();
    } catch (err: any) {
      setToast({ message: 'Erro ao salvar agendamento: ' + err.message, type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setProcessing(true);
    
    // Recupera o agendamento antes de deletar para enviar o email
    const apptToDelete = appointments.find(a => a.id === deleteId);
    const clientHasEmail = apptToDelete?.client?.email;

    try {
        await supabase.from('transactions').delete().eq('appointment_id', deleteId);
        const { error } = await supabase.from('appointments').delete().eq('id', deleteId);
        if (error) throw error;
        
        const successMessage = 'Agendamento excluído com sucesso.';
        const emailNote = clientHasEmail ? ' Notificação de cancelamento enviada ao paciente.' : ' Paciente sem e-mail para notificação.';

        setToast({ 
            message: successMessage + emailNote, 
            type: 'success' 
        });

        // Envia notificação de exclusão
        if (apptToDelete) {
            sendNotification('deleted', apptToDelete);
        }

        setIsModalOpen(false);
        setEditingAppointment(null);
        fetchAppointments();
    } catch (err: any) {
        setToast({ message: 'Erro ao excluir: ' + err.message, type: 'error' });
    } finally {
        setProcessing(false);
        setDeleteId(null);
    }
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth))
  });

  const getDayAppointments = (day: Date) => {
    return appointments.filter(appt => isSameDay(parseISO(appt.start_time), day));
  };

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
    <div className="h-full flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white">Agenda</h1>
          <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors">
            <HelpCircle size={20} />
          </button>
        </div>
        
        <div className="flex items-center space-x-2 bg-gray-900 border border-white/10 p-1 rounded-lg shadow-sm">
          <button onClick={handlePreviousMonth} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition"><ChevronLeft size={20}/></button>
          <span className="text-lg font-bold text-white min-w-[140px] text-center capitalize px-2">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button onClick={handleNextMonth} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition"><ChevronRight size={20}/></button>
          
          <div className="w-px h-6 bg-white/10 mx-1"></div>
          
          <button onClick={handleToday} className="text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-md transition-colors">
            Hoje
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="bg-gray-900 p-1 rounded-lg border border-white/10 shadow-sm flex items-center">
                <button 
                    onClick={() => setViewMode('month')} 
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'month' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    title="Visualização Mensal"
                >
                    <LayoutGrid size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('list')} 
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    title="Visualização em Lista"
                >
                    <ListIcon size={18} />
                </button>
            </div>

            <button 
            onClick={() => handleOpenModal()} 
            className="flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold w-full sm:w-auto justify-center"
            >
            <Plus size={18} className="mr-2" />
            <span className="hidden md:inline">Novo Agendamento</span>
            <span className="md:hidden">Novo</span>
            </button>
        </div>
      </div>

      {/* Grid Filters - DARK MODE */}
      <div className="bg-gray-900/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-white/5 mb-4">
        <div className="flex items-center text-gray-400 text-sm font-bold mb-3">
          <Filter size={16} className="mr-2" /> Filtros Avançados:
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {/* 1. Paciente */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-gray-500" />
                </div>
                <select 
                  value={filterClientId} 
                  onChange={e => setFilterClientId(e.target.value)}
                  className="border border-white/10 rounded-md pl-8 sm:pl-10 pr-2 sm:pr-3 py-2 text-xs sm:text-sm bg-gray-800 text-gray-200 outline-none focus:border-primary w-full appearance-none cursor-pointer hover:bg-gray-700/50 transition"
                >
                  <option value="">Todos Pacientes</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
            </div>

            {/* 2. Dentista */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                    <UserCheck size={16} className="text-gray-500" />
                </div>
                <select 
                  value={filterDentistId} 
                  onChange={e => setFilterDentistId(e.target.value)}
                  disabled={isDentistUser}
                  className={`border border-white/10 rounded-md pl-8 sm:pl-10 pr-2 sm:pr-3 py-2 text-xs sm:text-sm bg-gray-800 text-gray-200 outline-none focus:border-primary w-full appearance-none ${isDentistUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-700/50'} transition`}
                >
                  <option value="">Todos Dentistas</option>
                  {dentists.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
            </div>

            {/* 3. Status Pagamento */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                    <DollarSign size={16} className="text-gray-500" />
                </div>
                <select 
                  value={filterPaymentStatus} 
                  onChange={e => setFilterPaymentStatus(e.target.value)}
                  className="border border-white/10 rounded-md pl-8 sm:pl-10 pr-2 sm:pr-3 py-2 text-xs sm:text-sm bg-gray-800 text-gray-200 outline-none focus:border-primary w-full appearance-none cursor-pointer hover:bg-gray-700/50 transition"
                >
                  <option value="all">Financeiro (Todos)</option>
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                </select>
            </div>

            {/* 4. Status Agendamento */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                    <Activity size={16} className="text-gray-500" />
                </div>
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  className="border border-white/10 rounded-md pl-8 sm:pl-10 pr-2 sm:pr-3 py-2 text-xs sm:text-sm bg-gray-800 text-gray-200 outline-none focus:border-primary w-full appearance-none cursor-pointer hover:bg-gray-700/50 transition"
                >
                  <option value="all">Status (Todos)</option>
                  <option value="scheduled">Agendados</option>
                  <option value="confirmed">Confirmados (Paciente)</option>
                  <option value="completed">Concluídos</option>
                  <option value="cancelled">Cancelados</option>
                </select>
            </div>
        </div>

        <div className="flex flex-wrap items-center justify-between mt-4 pt-3 border-t border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2 sm:mb-0">
                <label className="flex items-center text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                    <input 
                        type="checkbox" 
                        checked={hideCompletedPaid} 
                        onChange={e => setHideCompletedPaid(e.target.checked)} 
                        className="mr-2 h-4 w-4 rounded bg-gray-800 border-gray-600 text-primary focus:ring-primary focus:ring-offset-gray-900" 
                    />
                    Esconder concluídos e pagos
                </label>
                <label className="flex items-center text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                    <input 
                        type="checkbox" 
                        checked={hideCancelled} 
                        onChange={e => setHideCancelled(e.target.checked)} 
                        className="mr-2 h-4 w-4 rounded bg-gray-800 border-gray-600 text-primary focus:ring-primary focus:ring-offset-gray-900" 
                    />
                    Esconder cancelados
                </label>
            </div>
            <button 
                onClick={clearFilters} 
                className="text-xs sm:text-sm text-red-400 hover:text-red-300 font-bold flex items-center bg-red-500/10 px-3 py-1.5 rounded transition-colors border border-red-500/20 hover:bg-red-500/20"
            >
                <X size={14} className="mr-1"/> Limpar Filtros
            </button>
        </div>
      </div>

      {/* VIEW CONTENT - DARK MODE */}
      {viewMode === 'month' ? (
          /* Grid View */
          <div className="flex-1 bg-gray-900 rounded-lg shadow-lg border border-white/5 overflow-hidden flex flex-col">
            <div className="grid grid-cols-7 border-b border-white/5 bg-gray-800/50">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto custom-scrollbar">
                {days.map((day, idx) => {
                  const dayAppts = getDayAppointments(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);

                  return (
                    <div 
                      key={day.toISOString()} 
                      className={`min-h-[100px] border-b border-r border-white/5 p-2 transition-colors relative group ${!isCurrentMonth ? 'bg-gray-950/50 text-gray-600' : 'bg-gray-900'} ${isTodayDate ? 'bg-blue-900/10' : ''} hover:bg-gray-800/50`}
                      onClick={() => handleOpenModal(day)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-bold ${isTodayDate ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20' : 'text-gray-300'}`}>
                          {format(day, 'd')}
                        </span>
                        <button className="opacity-0 group-hover:opacity-100 p-1 text-primary hover:bg-blue-500/20 rounded-full transition-opacity">
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        {dayAppts.map(appt => (
                          <div 
                            key={appt.id}
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(undefined, appt); }}
                            className={`text-[10px] p-1 rounded border-l-2 cursor-pointer hover:brightness-110 transition-all truncate shadow-sm flex items-center ${
                              appt.status === 'cancelled' ? 'bg-red-900/20 border-red-500 text-red-300 line-through opacity-60' :
                              appt.status === 'completed' ? 'bg-green-900/20 border-green-500 text-green-300' :
                              appt.status === 'confirmed' ? 'bg-teal-900/20 border-teal-500 text-teal-300 font-bold' :
                              'bg-gray-800 border-gray-600 text-gray-300'
                            }`}
                            style={appt.status === 'scheduled' ? { borderLeftColor: (appt.dentist as any)?.color || '#ccc' } : {}}
                          >
                            <span className="font-bold mr-1 text-gray-400">{format(parseISO(appt.start_time), 'HH:mm')}</span>
                            {(appt.client as any)?.name}
                            {appt.status === 'confirmed' && <CheckCircle size={10} className="ml-1 text-teal-400 inline" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
      ) : (
          /* Table View */
          <div className="flex-1 bg-gray-900 rounded-lg shadow-lg border border-white/5 overflow-hidden flex flex-col">
             <div className="overflow-auto flex-1 custom-scrollbar">
                {appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 h-full text-gray-500">
                        <Calendar size={48} className="mb-4 opacity-20"/>
                        <p>Nenhum agendamento encontrado para este período.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Horário</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Paciente</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Dentista</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pagamento</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Valor (R$)</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-transparent divide-y divide-white/5">
                            {appointments.map((appt) => {
                                const startTime = parseISO(appt.start_time);
                                const endTime = parseISO(appt.end_time);
                                
                                return (
                                    <tr 
                                        key={appt.id} 
                                        className="hover:bg-gray-800/50 transition-colors cursor-pointer"
                                        onClick={() => handleOpenModal(undefined, appt)}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200 font-medium">
                                            {format(startTime, 'dd/MM')}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                                            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                                            <div className="font-bold">{(appt.client as any)?.name}</div>
                                            <div className="text-xs text-gray-500">{appt.service_name}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: (appt.dentist as any)?.color || '#ccc' }} />
                                                {(appt.dentist as any)?.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                            <select 
                                                value={appt.status}
                                                onChange={(e) => handleQuickUpdate(appt.id, 'status', e.target.value)}
                                                className={`text-xs font-bold uppercase px-2 py-1 rounded border outline-none cursor-pointer appearance-none w-full bg-transparent ${
                                                    appt.status === 'completed' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                                                    appt.status === 'cancelled' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                                                    appt.status === 'confirmed' ? 'text-teal-400 border-teal-500/30 bg-teal-500/10' :
                                                    'text-blue-400 border-blue-500/30 bg-blue-500/10'
                                                }`}
                                            >
                                                <option value="scheduled" className="bg-gray-800 text-white">Agendado</option>
                                                <option value="confirmed" className="bg-gray-800 text-white">Confirmado (Paciente)</option>
                                                <option value="completed" className="bg-gray-800 text-white">Concluído</option>
                                                <option value="cancelled" className="bg-gray-800 text-white">Cancelado</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                            <select 
                                                value={appt.payment_status || 'pending'}
                                                onChange={(e) => handleQuickUpdate(appt.id, 'payment_status', e.target.value)}
                                                className={`text-xs font-bold uppercase px-2 py-1 rounded border outline-none cursor-pointer appearance-none w-full bg-transparent ${
                                                    appt.payment_status === 'paid' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                                                    'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                                                }`}
                                            >
                                                <option value="pending" className="bg-gray-800 text-white">Pendente</option>
                                                <option value="paid" className="bg-gray-800 text-white">Pago</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                defaultValue={appt.amount || 0}
                                                onBlur={(e) => handleQuickUpdate(appt.id, 'amount', parseFloat(e.target.value))}
                                                className="w-20 text-sm text-gray-300 border border-transparent hover:border-gray-600 focus:border-primary rounded px-1 py-0.5 outline-none bg-transparent text-right font-medium"
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                                            {canDelete && (
                                                <button 
                                                    onClick={() => setDeleteId(appt.id)}
                                                    className="text-gray-500 hover:text-red-400 transition p-1 rounded hover:bg-white/5"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
             </div>
          </div>
      )}

      {/* ... Modals (Updated for Dark Mode) ... */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white">
                {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Paciente</label>
                <div className="relative">
                  <select 
                    required 
                    className="w-full border border-gray-700 bg-gray-800 text-white p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary appearance-none hover:bg-gray-750 transition"
                    value={formData.client_id}
                    onChange={e => setFormData({...formData, client_id: e.target.value})}
                  >
                    <option value="">Selecione um paciente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <User className="absolute right-3 top-3 text-gray-500 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Dentist Selection */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Dentista</label>
                  <select 
                    required 
                    className={`w-full border border-gray-700 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary ${isDentistUser ? 'bg-gray-800/50 cursor-not-allowed text-gray-500' : 'bg-gray-800 text-white hover:bg-gray-750'}`}
                    value={formData.dentist_id}
                    disabled={isDentistUser}
                    onChange={e => setFormData({...formData, dentist_id: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {dentists.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Service Selection */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Serviço</label>
                  <select 
                    className="w-full border border-gray-700 bg-gray-800 text-white p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary mb-2 hover:bg-gray-750"
                    value={isCustomService ? 'custom_option_other' : formData.service_name}
                    onChange={handleServiceChange}
                    disabled={!formData.dentist_id}
                  >
                    <option value="">Selecione...</option>
                    {dentists.find(d => d.id === formData.dentist_id)?.services?.map((s, idx) => (
                        <option key={idx} value={s.name}>{s.name} - {s.duration}min - R$ {Number(s.price).toFixed(2)}</option>
                    ))}
                    <option value="custom_option_other">Outro...</option>
                  </select>
                  
                  {isCustomService && (
                      <input 
                        type="text" required
                        className="w-full border border-gray-700 bg-gray-800 text-white p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary animate-fade-in-up"
                        placeholder="Digite o nome do serviço..."
                        value={formData.service_name}
                        onChange={e => setFormData({...formData, service_name: e.target.value})}
                        autoFocus
                      />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data</label>
                   <input 
                    type="date" required
                    className="w-full border border-gray-700 bg-gray-800 text-white p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value, time: ''})}
                   />
                </div>
                <div className="col-span-1">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Duração (min)</label>
                   <input 
                    type="number" required step="15" min="15"
                    className="w-full border border-gray-700 bg-gray-800 text-white p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    value={formData.duration}
                    onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}
                   />
                </div>
                
                {/* Time Selection Grid */}
                <div className="col-span-3">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Horário Disponível</label>
                   <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                       {availableTimes.length > 0 ? (
                           availableTimes.map(time => (
                               <button 
                                  key={time} 
                                  type="button"
                                  onClick={() => setFormData({...formData, time})}
                                  className={`border rounded-lg py-2 text-sm font-medium transition-colors ${
                                      formData.time === time 
                                      ? 'bg-primary text-white border-primary shadow-lg shadow-blue-500/30' 
                                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-primary hover:text-white hover:bg-gray-700'
                                  }`}
                               >
                                   {time}
                               </button>
                           ))
                       ) : (
                           <div className="col-span-4 text-center text-gray-500 text-sm py-4 italic border border-gray-700 border-dashed rounded-lg">
                               {(!formData.dentist_id || !formData.date) 
                                ? "Selecione dentista e data." 
                                : "Nenhum horário disponível para esta duração."}
                           </div>
                       )}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-3 rounded-lg border border-white/5">
                 <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
                    <select 
                      className="w-full border border-gray-700 bg-gray-900 text-white p-2 rounded text-sm outline-none focus:border-primary"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="scheduled">Agendado</option>
                      <option value="confirmed">Confirmado (Paciente)</option>
                      <option value="completed">Concluído</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Pagamento</label>
                    <select 
                      className="w-full border border-gray-700 bg-gray-900 text-white p-2 rounded text-sm outline-none focus:border-primary"
                      value={formData.payment_status}
                      onChange={e => setFormData({...formData, payment_status: e.target.value})}
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                    </select>
                 </div>
                 <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor (R$)</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full border border-gray-700 bg-gray-900 text-white p-2 rounded text-sm outline-none focus:border-primary"
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    />
                 </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-2">
                {editingAppointment && canDelete ? (
                  <button 
                    type="button"
                    onClick={() => setDeleteId(editingAppointment.id)}
                    className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center px-2 py-1 rounded hover:bg-red-500/10 transition"
                  >
                    <Trash2 size={16} className="mr-1" /> Excluir
                  </button>
                ) : <div></div>}
                
                <div className="flex space-x-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded font-medium transition">Cancelar</button>
                  <button 
                    type="submit" 
                    disabled={processing}
                    className="px-6 py-2 bg-primary text-white rounded hover:bg-sky-600 font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition"
                  >
                    {processing ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm animate-fade-in-up">
             <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="text-green-600" size={20}/>
                    Confirmar Pagamento
                </h3>
                <button onClick={() => { setPaymentModalOpen(false); setPendingPaymentId(null); }} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             
             <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Recebido (R$)</label>
                    <input 
                        type="number" step="0.01" min="0"
                        className="w-full border p-2 rounded text-lg font-bold text-gray-800 bg-white"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Forma de Pagamento</label>
                    <select 
                        className="w-full border p-2 rounded bg-white text-gray-800"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                        {paymentMethods.map(method => (
                            <option key={method} value={method}>{method}</option>
                        ))}
                    </select>
                 </div>

                 <div className="flex space-x-2 pt-2">
                    <button 
                        onClick={() => { setPaymentModalOpen(false); setPendingPaymentId(null); }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-bold transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={processPaymentConfirmation}
                        disabled={processing}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition shadow-md disabled:opacity-50"
                    >
                        {processing ? '...' : 'Confirmar'}
                    </button>
                 </div>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation (Mantido estilo Light para contraste de alerta) */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-100 p-3 rounded-full inline-block mb-4">
                <AlertTriangle className="text-red-600" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Agendamento?</h3>
             <p className="text-gray-600 mb-6 text-sm">
               Tem certeza que deseja remover este compromisso?
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
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg shadow-red-200"
                >
                  {processing ? '...' : 'Sim, Excluir'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Agendamento de Retorno */}
      {returnModalOpen && apptForReturn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-indigo-100 p-3 rounded-full inline-block mb-4">
                <CalendarCheck className="text-indigo-600" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Atendimento Concluído!</h3>
             <p className="text-gray-600 mb-6 text-sm">
               Deseja deixar agendado o retorno de <strong>{(apptForReturn.client as any)?.name}</strong>?
             </p>
             <div className="flex space-x-3 w-full">
                <button 
                  onClick={() => setReturnModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold transition"
                >
                  Não
                </button>
                <button 
                  onClick={() => handleOpenModal(undefined, apptForReturn, true)}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition shadow-lg shadow-indigo-200"
                >
                  Agendar Retorno
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Time Selection Warning Modal */}
      {showTimeWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center animate-fade-in-up">
             <div className="bg-yellow-100 p-3 rounded-full inline-block mb-4">
                <Clock className="text-yellow-600" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Horário Necessário</h3>
             <p className="text-gray-600 mb-6 text-sm">
               Por favor, selecione um horário disponível na grade para continuar.
             </p>
             <button 
               onClick={() => setShowTimeWarning(false)}
               className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-sky-600 font-bold transition shadow-md"
             >
               Entendi
             </button>
          </div>
        </div>
      )}

      {/* Finance Auto Modal */}
      {showFinanceAutoModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center animate-fade-in-up">
                <div className="bg-green-100 p-3 rounded-full inline-block mb-4">
                    <DollarSign className="text-green-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Financeiro Atualizado!</h3>
                <p className="text-gray-600 mb-6 text-sm">
                    O valor deste agendamento foi lançado automaticamente como receita na página <strong>Financeiro</strong>.
                </p>
                <button 
                    onClick={() => setShowFinanceAutoModal(false)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition shadow-md"
                >
                    Entendi
                </button>
            </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="text-xl font-bold flex items-center text-white gap-2"><HelpCircle className="text-primary"/> Como usar a Agenda</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-400">
                <p>Gerencie seus compromissos com facilidade:</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Visualização:</strong> Alterne entre Grade (Mensal) e Lista usando os ícones no topo.</li>
                   <li><strong>Edição Rápida (Lista):</strong> Na visualização em Lista, altere Status e Pagamento na tabela.</li>
                   <li><strong>Financeiro Automático:</strong> Ao marcar como "Pago" na tabela, uma receita é lançada automaticamente.</li>
                   <li><strong>Retorno:</strong> Ao marcar como "Concluído", o sistema pergunta se deseja agendar o retorno.</li>
                   <li><strong>Cores:</strong> As cores dos agendamentos seguem a cor configurada no perfil de cada Dentista.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
