
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Client, Dentist } from '../types';
import { Mic, Square, Save, Loader2, Info, FileText, CheckCircle, Lock, Zap, HelpCircle, X, AlertTriangle, Sparkles } from 'lucide-react';
import Toast, { ToastType } from './Toast';
import { useNavigate } from 'react-router-dom';

const SmartRecordPage: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedDentistId, setSelectedDentistId] = useState('');
  
  const [transcription, setTranscription] = useState('');
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  const [isReviewed, setIsReviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  
  const [tier, setTier] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('free');
  const [customAiLimit, setCustomAiLimit] = useState<number | null>(null);
  const [customDentistLimit, setCustomDentistLimit] = useState<number | null>(null);
  const [canRecord, setCanRecord] = useState(true);
  const [limitMessage, setLimitMessage] = useState('');
  const [maxTime, setMaxTime] = useState(600); // Default 10 min

  const [showHelp, setShowHelp] = useState(false);
  
  // Novos estados para UI melhorada
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // UPGRADE MODAL
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // INSTRUCTION MODAL STATES
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const timerRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    initialize();
    
    // Check localStorage for instruction preference
    const hideInstruction = localStorage.getItem('denti_hide_smart_record_instruction');
    if (hideInstruction !== 'true') {
        setShowInstructionModal(true);
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Re-verifica limites quando o dentista muda (para planos Starter/Pro que são por dentista)
  useEffect(() => {
      if (clinicId) {
          checkUsageLimits(clinicId, selectedDentistId);
      }
  }, [selectedDentistId, clinicId]);

  useEffect(() => {
    if (isRecording && recordingTime >= maxTime) {
        stopRecording();
        setToast({ message: `Tempo limite de ${Math.floor(maxTime/60)} minutos atingido.`, type: 'warning' });
    }
  }, [recordingTime, isRecording, maxTime]);

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let targetClinicId = user.id;
    const { data: profile } = await supabase.from('user_profiles').select('clinic_id').eq('id', user.id).maybeSingle();
    if (profile) targetClinicId = profile.clinic_id;
    setClinicId(targetClinicId);
    await Promise.all([fetchAuxData(targetClinicId), checkUsageLimits(targetClinicId, selectedDentistId)]);
  };

  const checkUsageLimits = async (targetId: string, dentistId: string) => {
    const { data: clinic } = await supabase.from('clinics').select('subscription_tier, custom_ai_daily_limit, custom_dentist_limit').eq('id', targetId).single();
    const currentTier = clinic?.subscription_tier || 'free';
    const limitDb = clinic?.custom_ai_daily_limit;
    const dentistsDb = clinic?.custom_dentist_limit;
    
    setTier(currentTier as any);
    setCustomAiLimit(limitDb || null);
    setCustomDentistLimit(dentistsDb || null);
    
    // Configuração de Tempo Máximo
    if (currentTier === 'free') {
        setMaxTime(300); // 5 minutos para Free
    } else {
        setMaxTime(600); // 10 minutos para Starter e Pro
    }

    let count = 0;
    if (currentTier === 'free') {
        // Limite Global da Clínica (Total)
        const { count: totalCount } = await supabase.from('clinical_records').select('*', { count: 'exact', head: true }).eq('clinic_id', targetId);
        count = totalCount || 0;
        if (count >= 3) { setCanRecord(false); setLimitMessage("Limite de 3 usos do plano Gratuito atingido."); } 
        else { setCanRecord(true); setLimitMessage(`Restam ${3 - count} usos no plano Gratuito.`); }
    } 
    else if (currentTier === 'starter' || currentTier === 'pro' || currentTier === 'enterprise') {
        // Limite Diário POR DENTISTA
        if (!dentistId) {
            setCanRecord(true); // Permite selecionar, mas valida no startRecording se não tiver dentista
            setLimitMessage("Selecione um dentista para verificar cotas.");
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const { count: dailyCount } = await supabase
            .from('clinical_records')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', targetId)
            .eq('dentist_id', dentistId)
            .gte('created_at', today); 
        
        count = dailyCount || 0;
        
        // CALCULO DO LIMITE
        let limit = 0;
        if (currentTier === 'enterprise') {
            // Regra Enterprise: Total IA / Total Dentistas
            const totalAi = limitDb || 0;
            const totalDentists = dentistsDb || 1;
            limit = Math.floor(totalAi / totalDentists);
        } else {
            // Regra Padrão (Starter/Pro): Valor direto do custom_ai_daily_limit (que veio do plano)
            limit = limitDb || 5; 
        }

        if (count >= limit) { setCanRecord(false); setLimitMessage(`Limite diário de ${limit} usos para este dentista atingido.`); } 
        else { setCanRecord(true); setLimitMessage(`Uso diário (Dentista): ${count}/${limit}.`); }
    }
  };

  const fetchAuxData = async (targetId: string) => {
    const { data: clientsData } = await supabase.from('clients').select('*').eq('clinic_id', targetId).order('name');
    if (clientsData) setClients(clientsData as unknown as Client[]);
    const { data: dentistsData } = await supabase.from('dentists').select('*').eq('clinic_id', targetId).order('name');
    if (dentistsData) setDentists(dentistsData as unknown as Dentist[]);
  };

  const startRecording = async () => {
    if (!selectedDentistId) { setToast({ message: "Selecione um dentista responsável.", type: 'warning' }); return; }
    if (!selectedClientId) { setToast({ message: "Selecione um paciente.", type: 'warning' }); return; }
    
    if (!canRecord) { 
        setShowUpgradeModal(true);
        return; 
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        processAudio(blob);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000);
    } catch (err) { console.error(err); setToast({ message: "Erro ao acessar microfone.", type: 'error' }); }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const processAudio = async (blobToUse?: Blob) => {
    const targetBlob = blobToUse || audioBlob;
    if (!targetBlob) return;
    setProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(targetBlob);
      reader.onloadend = async () => {
        try {
            const base64Audio = (reader.result as string).split(',')[1];
            // Passa o ID do dentista para validação no backend
            const { data, error } = await supabase.functions.invoke('process-audio', {
              body: { 
                  audio: base64Audio, 
                  mimeType: targetBlob.type || 'audio/webm',
                  dentistId: selectedDentistId 
              }
            });
            if (error) throw error;
            if (data) {
                setTranscription(data.transcription || '');
                if (data.summary) {
                    setSoapData({
                        subjective: data.summary.subjective || '',
                        objective: data.summary.objective || '',
                        assessment: data.summary.assessment || '',
                        plan: data.summary.plan || ''
                    });
                }
                setIsReviewed(false);
            }
        } catch (innerErr: any) { setToast({ message: "Erro IA: " + innerErr.message, type: 'error' }); } finally { setProcessing(false); }
      };
    } catch (err: any) { setToast({ message: "Erro arquivo: " + err.message, type: 'error' }); setProcessing(false); }
  };

  // Abre o modal de confirmação
  const handleSaveClick = () => {
     if (!selectedClientId || !selectedDentistId || !clinicId) { setToast({ message: "Selecione paciente e dentista.", type: 'warning' }); return; }
     if (!isReviewed) { setToast({ message: "Revise o resumo antes de salvar.", type: 'warning' }); return; }
     setShowConfirmModal(true);
  };

  // Executa a gravação real
  const confirmSave = async () => {
     if (!clinicId) return;
     setSaving(true);
     
     const fullDescription = `[Transcrição]\n${transcription}\n\n[SOAP]\nS: ${soapData.subjective}\nO: ${soapData.objective}\nA: ${soapData.assessment}\nP: ${soapData.plan}`;
     
     const { error } = await supabase.from('clinical_records').insert({
         clinic_id: clinicId, client_id: selectedClientId, dentist_id: selectedDentistId,
         date: new Date().toISOString().split('T')[0], description: fullDescription, created_at: new Date().toISOString()
     });
     
     setSaving(false);
     setShowConfirmModal(false);

     if (error) {
         setToast({ message: "Erro ao salvar: " + error.message, type: 'error' });
     } else {
         setToast({ message: "Prontuário salvo com sucesso!", type: 'success' });
         // Reset form
         setAudioBlob(null); setTranscription(''); setSoapData({ subjective: '', objective: '', assessment: '', plan: '' }); setIsReviewed(false);
         checkUsageLimits(clinicId, selectedDentistId);
     }
  };

  const closeInstructionModal = () => {
      if (dontShowAgain) {
          localStorage.setItem('denti_hide_smart_record_instruction', 'true');
      }
      setShowInstructionModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center">
            <Mic className="mr-2 text-primary" /> Prontuário Inteligente (IA)
        </h1>
        <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors"><HelpCircle size={20} /></button>
      </div>

      {/* Info Banner */}
      <div className={`border-l-4 p-4 mb-6 rounded-r shadow-sm flex justify-between items-center ${canRecord ? 'bg-blue-900/20 border-blue-500' : 'bg-red-900/20 border-red-500'}`}>
        <div className="flex">
          <div className="flex-shrink-0">{canRecord ? <Info size={20} className="text-blue-400" /> : <Lock size={20} className="text-red-400" />}</div>
          <div className="ml-3">
            <p className={`text-sm font-bold ${canRecord ? 'text-blue-300' : 'text-red-300'}`}>
                Plano {tier === 'free' ? 'Gratuito' : tier === 'starter' ? 'Starter' : tier === 'pro' ? 'Pro' : 'Enterprise'}
            </p>
            <p className={`text-sm ${canRecord ? 'text-blue-400' : 'text-red-400'}`}>{limitMessage} Duração máx: {Math.floor(maxTime/60)} minutos.</p>
          </div>
        </div>
      </div>

      {/* Main Recording Area */}
      <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/5 mb-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
             <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Paciente</label>
                <select className="w-full bg-gray-800 border border-gray-700 text-white p-3 rounded-lg outline-none focus:border-primary" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                    <option value="">Selecione um paciente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Dentista Responsável</label>
                <select className="w-full bg-gray-800 border border-gray-700 text-white p-3 rounded-lg outline-none focus:border-primary" value={selectedDentistId} onChange={e => setSelectedDentistId(e.target.value)}>
                    <option value="">Selecione um dentista...</option>
                    {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
             </div>
         </div>

         <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30 relative">
             {!isRecording && !audioBlob && !processing && (
                 <>
                    <button onClick={startRecording} disabled={!selectedClientId || !selectedDentistId} className={`h-20 w-20 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${(!selectedClientId || !selectedDentistId) ? 'bg-gray-700 cursor-not-allowed text-gray-500' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                        <Mic size={32} />
                    </button>
                    {!canRecord && <p className="text-red-400 font-bold text-xs mt-4">Limite atingido.</p>}
                 </>
             )}
             {isRecording && (
                 <div className="flex flex-col items-center">
                     <div className="animate-pulse h-20 w-20 rounded-full bg-red-900/30 flex items-center justify-center mb-4 border-4 border-red-600 relative">
                        <span className="text-red-500 font-mono text-xl font-bold">{formatTime(recordingTime)}</span>
                     </div>
                     <button onClick={stopRecording} className="px-6 py-2 bg-gray-700 text-white rounded-full font-bold flex items-center hover:bg-gray-600 transition"><Square size={16} className="mr-2" /> Parar & Processar</button>
                 </div>
             )}
             {processing && <div className="flex flex-col items-center"><Loader2 size={48} className="animate-spin text-primary mb-4" /><p className="text-gray-400 font-medium">Transcrevendo e analisando (IA)...</p></div>}
             {audioBlob && !isRecording && !processing && !transcription && <div className="text-center text-gray-500"><p>Finalizando áudio...</p></div>}
         </div>
      </div>

      {/* Results Area */}
      {transcription && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
              <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-white flex items-center"><FileText size={18} className="mr-2 text-gray-400"/> Transcrição</h3>
                      <button onClick={() => { setAudioBlob(null); setTranscription(''); setSoapData({subjective:'', objective:'', assessment:'', plan:''}); setIsReviewed(false); }} className="text-xs text-red-400 hover:text-red-300">Descartar</button>
                  </div>
                  <textarea className="w-full h-64 p-3 border border-gray-700 rounded-lg text-sm text-gray-300 bg-gray-800 focus:bg-gray-800/80 focus:border-primary outline-none resize-none" value={transcription} onChange={(e) => setTranscription(e.target.value)}></textarea>
              </div>

              <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/5 flex flex-col">
                  <h3 className="font-bold text-white mb-4 flex items-center"><CheckCircle size={18} className="mr-2 text-green-500"/> Resumo SOAP</h3>
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                      {['Subjetivo', 'Objetivo', 'Avaliação', 'Plano'].map((label) => {
                          const key = label === 'Subjetivo' ? 'subjective' : label === 'Objetivo' ? 'objective' : label === 'Avaliação' ? 'assessment' : 'plan';
                          return (
                              <div key={key}>
                                  <label className="text-xs font-bold text-primary uppercase">{label.charAt(0)} - {label}</label>
                                  <textarea className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 mt-1 focus:border-primary outline-none" rows={3} value={soapData[key as keyof typeof soapData]} onChange={e => setSoapData({...soapData, [key]: e.target.value})}/>
                              </div>
                          );
                      })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                      <label className="flex items-center cursor-pointer">
                          <input type="checkbox" className="w-5 h-5 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary transition" checked={isReviewed} onChange={(e) => setIsReviewed(e.target.checked)}/>
                          <span className="ml-2 text-sm text-gray-400 font-medium select-none">Li, revisei e concordo com o resumo.</span>
                      </label>
                  </div>
                  <button onClick={handleSaveClick} disabled={saving || !isReviewed} className={`mt-4 w-full py-3 text-white rounded-lg font-bold transition flex items-center justify-center shadow ${saving || !isReviewed ? 'bg-gray-700 text-gray-500 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700'}`}>
                     {saving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2" size={18}/>} Salvar no Prontuário
                  </button>
              </div>
          </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-sm text-center">
                <div className="bg-green-900/20 p-3 rounded-full inline-block mb-4 border border-green-500/30">
                    <Save className="text-green-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Salvar Prontuário?</h3>
                <p className="text-gray-400 mb-6 text-sm">
                    Você está prestes a gravar o resumo SOAP no histórico do paciente <strong>{clients.find(c => c.id === selectedClientId)?.name}</strong>.
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => setShowConfirmModal(false)}
                        className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg font-bold hover:bg-gray-800 transition"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmSave}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition shadow-lg flex items-center"
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="animate-spin mr-2" size={18}/> : <CheckCircle className="mr-2" size={18}/>}
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* INSTRUCTION MODAL */}
      {showInstructionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-white/10 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
                <div className="flex justify-center mb-6">
                    <div className="bg-gradient-to-tr from-purple-600 to-blue-600 p-4 rounded-full shadow-lg shadow-purple-500/30">
                        <Sparkles size={32} className="text-white" />
                    </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">Como funciona a IA?</h3>
                
                <div className="text-gray-300 text-sm leading-relaxed mb-8 bg-gray-800/50 p-4 rounded-xl border border-white/5">
                    <p className="mb-3">
                        Essa funcionalidade deve ser usada pelo dentista <strong>logo após a conclusão da consulta</strong>.
                    </p>
                    <p>
                        Basta clicar no microfone e <strong>ditar o que foi feito</strong>. A Inteligência Artificial irá transcrever sua fala e criar um resumo técnico organizado (SOAP) automaticamente.
                    </p>
                </div>

                <div className="mb-6 flex items-center justify-center">
                    <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-400 hover:text-white transition group select-none">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-primary border-primary' : 'border-gray-600 bg-gray-800'}`}>
                            {dontShowAgain && <CheckCircle size={14} className="text-white"/>}
                        </div>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                        />
                        <span>Não exibir esta mensagem novamente</span>
                    </label>
                </div>

                <button
                    onClick={closeInstructionModal}
                    className="w-full py-3.5 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition shadow-lg flex items-center justify-center"
                >
                    Entendi, vamos começar!
                </button>
            </div>
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
                    Você atingiu o limite de usos da IA para o seu plano atual. Faça um upgrade para liberar mais acessos.
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

      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="text-xl font-bold flex items-center text-white gap-2"><HelpCircle className="text-primary"/> Como usar</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-400">
                <p>O Prontuário Inteligente usa IA para transcrever e organizar o áudio da consulta.</p>
                <ol className="list-decimal pl-5 space-y-2">
                   <li><strong>Identificação:</strong> Selecione Paciente e Dentista.</li>
                   <li><strong>Gravação:</strong> Clique no microfone e dite as observações.</li>
                   <li><strong>Processamento:</strong> Clique em "Parar & Processar". A IA gerará o SOAP.</li>
                   <li><strong>Revisão:</strong> Edite se necessário e salve.</li>
                </ol>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartRecordPage;
