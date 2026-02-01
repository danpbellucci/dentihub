
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Client, Dentist } from '../types';
import { Mic, Square, Save, Loader2, Info, FileText, CheckCircle, Lock, Zap, HelpCircle, X } from 'lucide-react';

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
  
  // Usage Limit States
  const [tier, setTier] = useState<'free' | 'starter' | 'pro'>('free');
  const [usageCount, setUsageCount] = useState(0);
  const [canRecord, setCanRecord] = useState(true);
  const [limitMessage, setLimitMessage] = useState('');
  const [maxTime, setMaxTime] = useState(1800); // Default 30 min

  const [showHelp, setShowHelp] = useState(false);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    initialize();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Monitor timer to enforce max duration
  useEffect(() => {
    if (isRecording && recordingTime >= maxTime) {
        stopRecording();
        alert(`Tempo limite de ${Math.floor(maxTime/60)} minutos atingido. O áudio será processado automaticamente.`);
    }
  }, [recordingTime, isRecording, maxTime]);

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Identificar Perfil e Clínica Correta
    let targetClinicId = user.id;
    const { data: profile } = await supabase.from('user_profiles').select('clinic_id, role').eq('id', user.id).maybeSingle();
    
    if (profile) {
        targetClinicId = profile.clinic_id;
    }
    setClinicId(targetClinicId);

    // 2. Carregar Dados usando o ID correto
    await Promise.all([
        fetchAuxData(targetClinicId),
        checkUsageLimits(targetClinicId)
    ]);
  };

  const checkUsageLimits = async (targetId: string) => {
    // 1. Get Clinic Tier
    const { data: clinic } = await supabase
        .from('clinics')
        .select('subscription_tier')
        .eq('id', targetId)
        .single();
    
    const currentTier = clinic?.subscription_tier || 'free';
    setTier(currentTier);

    // 2. Set Time Limit based on Tier
    if (currentTier === 'free') {
        setMaxTime(300); // 5 minutes for Free tier
    } else {
        setMaxTime(1800); // 30 minutes for Paid tiers
    }

    // 3. Calculate Usage based on Tier Rules
    let count = 0;
    
    if (currentTier === 'free') {
        // Free: Total lifetime usage limit of 3 (Updated)
        const { count: totalCount } = await supabase
            .from('clinical_records')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', targetId);
        count = totalCount || 0;
        
        if (count >= 3) {
            setCanRecord(false);
            setLimitMessage("Você atingiu o limite de 3 usos do plano Gratuito.");
        } else {
            setLimitMessage(`Você tem ${3 - count} usos restantes no plano Gratuito.`);
        }

    } else if (currentTier === 'starter') {
        // Starter: 5 uses per day
        const today = new Date().toISOString().split('T')[0];
        const { count: dailyCount } = await supabase
            .from('clinical_records')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', targetId)
            .gte('created_at', today); 
        count = dailyCount || 0;

        if (count >= 5) {
            setCanRecord(false);
            setLimitMessage("Você atingiu o limite diário de 5 usos do plano Starter.");
        } else {
            setLimitMessage(`Uso diário: ${count}/5.`);
        }

    } else {
        // Pro: Unlimited
        setLimitMessage("Uso ilimitado (Plano Pro).");
    }
    
    setUsageCount(count);
  };

  const fetchAuxData = async (targetId: string) => {
    const { data: clientsData } = await supabase.from('clients').select('*').eq('clinic_id', targetId).order('name');
    if (clientsData) setClients(clientsData as unknown as Client[]);

    const { data: dentistsData } = await supabase.from('dentists').select('*').eq('clinic_id', targetId).order('name');
    if (dentistsData) setDentists(dentistsData as unknown as Dentist[]);
  };

  const startRecording = async () => {
    if (!canRecord) {
        alert("Limite de uso atingido para seu plano atual. Atualize em Configurações.");
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        // AUTO-TRIGGER: Chama o processamento imediatamente ao parar
        processAudio(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Erro ao acessar microfone. Verifique as permissões.");
    }
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

  // Aceita um blob opcional para usar o arquivo recém-criado antes do estado atualizar
  const processAudio = async (blobToUse?: Blob) => {
    const targetBlob = blobToUse || audioBlob;
    if (!targetBlob) return;
    
    setProcessing(true);

    try {
      // Converter Blob para Base64
      const reader = new FileReader();
      reader.readAsDataURL(targetBlob);
      reader.onloadend = async () => {
        try {
            const base64Audio = (reader.result as string).split(',')[1];
            
            // CHAMADA SEGURA VIA EDGE FUNCTION
            const { data, error } = await supabase.functions.invoke('process-audio', {
              body: {
                audio: base64Audio,
                mimeType: targetBlob.type || 'audio/webm'
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
                setIsReviewed(false); // Reset review state
            }
        } catch (innerErr: any) {
            console.error("AI Processing Error:", innerErr);
            alert("Erro ao processar com IA: " + (innerErr.message || "Falha na comunicação com o servidor."));
        } finally {
            setProcessing(false);
        }
      };
    } catch (err: any) {
      console.error("FileReader Error:", err);
      alert("Erro ao ler arquivo de áudio: " + err.message);
      setProcessing(false);
    }
  };

  const handleSave = async () => {
     if (!selectedClientId || !selectedDentistId) {
         alert("Selecione o paciente e o dentista.");
         return;
     }
     if (!clinicId) {
         alert("Erro de identificação da clínica. Recarregue a página.");
         return;
     }
     if (!isReviewed) {
         alert("Você deve revisar e aprovar o resumo SOAP antes de salvar.");
         return;
     }
     
     setSaving(true);

     const fullDescription = `
[Transcrição Automática]
${transcription}

[Resumo SOAP]
S: ${soapData.subjective}
O: ${soapData.objective}
A: ${soapData.assessment}
P: ${soapData.plan}
     `.trim();

     const { error } = await supabase.from('clinical_records').insert({
         clinic_id: clinicId,
         client_id: selectedClientId,
         dentist_id: selectedDentistId,
         date: new Date().toISOString().split('T')[0],
         description: fullDescription,
         created_at: new Date().toISOString() // Ensure created_at is set for logic check
     });

     setSaving(false);
     if (error) {
         alert("Erro ao salvar: " + error.message);
     } else {
         alert("Prontuário salvo com sucesso!");
         setAudioBlob(null);
         setTranscription('');
         setSoapData({ subjective: '', objective: '', assessment: '', plan: '' });
         setSelectedClientId('');
         setSelectedDentistId('');
         setIsReviewed(false);
         
         // Refresh Limits
         checkUsageLimits(clinicId);
     }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Mic className="mr-2 text-primary" /> Prontuário Inteligente (IA)
        </h1>
        <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors">
            <HelpCircle size={20} />
        </button>
      </div>

      {/* Info Banner & Limits */}
      <div className={`border-l-4 p-4 mb-6 rounded-r shadow-sm flex justify-between items-center ${canRecord ? 'bg-blue-50 border-blue-400' : 'bg-red-50 border-red-400'}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            {canRecord ? <Info size={20} className="text-blue-400" /> : <Lock size={20} className="text-red-400" />}
          </div>
          <div className="ml-3">
            <p className={`text-sm font-bold ${canRecord ? 'text-blue-700' : 'text-red-700'}`}>
              Plano {tier === 'free' ? 'Gratuito' : tier === 'starter' ? 'Starter' : 'Pro'}
            </p>
            <p className={`text-sm ${canRecord ? 'text-blue-600' : 'text-red-600'}`}>
              {limitMessage} Duração máx: {Math.floor(maxTime/60)} minutos.
            </p>
          </div>
        </div>
        {!canRecord && tier !== 'pro' && (
            <button className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold hover:bg-red-200 transition">
                Fazer Upgrade
            </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Paciente</label>
                <select 
                    className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                >
                    <option value="">Selecione um paciente...</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Dentista Responsável</label>
                <select 
                    className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    value={selectedDentistId}
                    onChange={e => setSelectedDentistId(e.target.value)}
                >
                    <option value="">Selecione um dentista...</option>
                    {dentists.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
             </div>
         </div>

         <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 relative">
             {!isRecording && !audioBlob && !processing && (
                 <>
                    <button 
                        onClick={startRecording}
                        disabled={!selectedClientId || !selectedDentistId || !canRecord}
                        className={`h-20 w-20 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${(!selectedClientId || !selectedDentistId || !canRecord) ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                        title={!canRecord ? "Limite atingido" : (!selectedClientId || !selectedDentistId) ? "Selecione Paciente e Dentista" : "Iniciar Gravação"}
                    >
                        <Mic size={32} />
                    </button>
                    {!canRecord && <p className="text-red-500 font-bold text-xs mt-4">Limite do plano atingido.</p>}
                 </>
             )}

             {isRecording && (
                 <div className="flex flex-col items-center">
                     <div className="animate-pulse h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mb-4 border-4 border-red-500 relative">
                        <span className="text-red-600 font-mono text-xl font-bold">{formatTime(recordingTime)}</span>
                     </div>
                     <p className="text-xs font-bold text-red-500 mb-4">Limite: {Math.floor(maxTime/60)}:00</p>
                     
                     <button 
                        onClick={stopRecording}
                        className="px-6 py-2 bg-gray-800 text-white rounded-full font-bold flex items-center hover:bg-black transition"
                     >
                        <Square size={16} className="mr-2" /> Parar & Processar
                     </button>
                 </div>
             )}

             {processing && (
                 <div className="flex flex-col items-center">
                     <Loader2 size={48} className="animate-spin text-primary mb-4" />
                     <p className="text-gray-600 font-medium">Transcrevendo e analisando (IA)...</p>
                 </div>
             )}

             {audioBlob && !isRecording && !processing && !transcription && (
                 <div className="text-center text-gray-500">
                     <p>Finalizando áudio...</p>
                 </div>
             )}
         </div>
      </div>

      {transcription && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
              <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center"><FileText size={18} className="mr-2"/> Transcrição</h3>
                      <button onClick={() => { setAudioBlob(null); setTranscription(''); setSoapData({subjective:'', objective:'', assessment:'', plan:''}); setIsReviewed(false); }} className="text-xs text-red-500 hover:underline">Descartar e Gravar Novo</button>
                  </div>
                  <textarea 
                    className="w-full h-64 p-3 border rounded-lg text-sm text-gray-700 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none resize-none"
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                  ></textarea>
              </div>

              <div className="bg-white p-6 rounded-lg shadow flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center"><CheckCircle size={18} className="mr-2 text-green-600"/> Resumo SOAP</h3>
                  
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2">
                      <div>
                          <label className="text-xs font-bold text-primary uppercase">S - Subjetivo</label>
                          <textarea 
                             className="w-full p-2 border rounded text-sm mt-1" 
                             rows={3}
                             value={soapData.subjective}
                             onChange={e => setSoapData({...soapData, subjective: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-primary uppercase">O - Objetivo</label>
                          <textarea 
                             className="w-full p-2 border rounded text-sm mt-1" 
                             rows={3}
                             value={soapData.objective}
                             onChange={e => setSoapData({...soapData, objective: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-primary uppercase">A - Avaliação</label>
                          <textarea 
                             className="w-full p-2 border rounded text-sm mt-1" 
                             rows={3}
                             value={soapData.assessment}
                             onChange={e => setSoapData({...soapData, assessment: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-primary uppercase">P - Plano</label>
                          <textarea 
                             className="w-full p-2 border rounded text-sm mt-1" 
                             rows={3}
                             value={soapData.plan}
                             onChange={e => setSoapData({...soapData, plan: e.target.value})}
                          />
                      </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="flex items-center cursor-pointer">
                          <input 
                              type="checkbox" 
                              className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary transition"
                              checked={isReviewed}
                              onChange={(e) => setIsReviewed(e.target.checked)}
                          />
                          <span className="ml-2 text-sm text-gray-700 font-medium select-none">Li, revisei e concordo com o resumo SOAP.</span>
                      </label>
                  </div>

                  <button 
                     onClick={handleSave}
                     disabled={saving || !isReviewed}
                     className={`mt-4 w-full py-3 text-white rounded-lg font-bold transition flex items-center justify-center shadow ${
                        saving || !isReviewed 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                        : 'bg-green-600 hover:bg-green-700'
                     }`}
                  >
                     {saving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2" size={18}/>}
                     Salvar no Prontuário
                  </button>
              </div>
          </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center text-gray-800 gap-2"><HelpCircle className="text-primary"/> Como usar o Prontuário IA</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-600">
                <p>O Prontuário Inteligente usa IA para transcrever e organizar o áudio da sua consulta.</p>
                <ol className="list-decimal pl-5 space-y-2">
                   <li><strong>Identificação:</strong> Selecione o Paciente e o Dentista.</li>
                   <li><strong>Gravação:</strong> Clique no microfone e dite as observações da consulta. Fale com clareza sobre o exame clínico e o plano de tratamento.</li>
                   <li><strong>Processamento:</strong> Clique em "Parar & Processar" para finalizar. A IA irá transcrever o áudio e gerar um resumo no formato SOAP.</li>
                   <li><strong>Revisão:</strong> Leia o resumo gerado. Você pode editar o texto se necessário.</li>
                   <li><strong>Confirmação:</strong> Marque a caixa "Li, revisei e concordo" para liberar o botão de salvar.</li>
                </ol>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartRecordPage;
