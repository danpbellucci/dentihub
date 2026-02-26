import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Users, Building2, Calendar, Mic, Activity, 
  FileText, CalendarRange, RefreshCw,
  BarChart3, ArrowLeft, Sparkles, CreditCard,
  Monitor, Menu, X, HeartPulse, AlertTriangle, CheckCircle, TrendingUp,
  Megaphone, Trash2, Send, AlertOctagon, UserX, Clock, Tag, Copy, Mail, Image, DollarSign,
  CalendarClock, Timer, Target, MousePointer, Type, List, Layout, Loader2, Image as ImageIcon,
  Download, FileSpreadsheet, Ban, Star, Box, ChevronUp, ChevronDown
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInHours, isToday } from 'date-fns';
import * as XLSX from 'xlsx';
import Toast, { ToastType } from './Toast';

// ... (MetricCard e HealthIndicator mantidos iguais) ...
const MetricCard: React.FC<{title: string, value: string, icon: any, color: string, trend?: string, subtext?: string}> = ({ title, value, icon: Icon, color, trend, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center relative overflow-hidden">
    <div className={`p-4 rounded-full mr-4 ${color.replace('text-', 'bg-').replace('600', '50').replace('500', '50')}`}>
      <Icon size={24} className={color} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium uppercase">{title}</p>
      <p className="text-2xl font-black text-gray-800">{value}</p>
      {trend && <p className="text-xs text-green-500 font-bold mt-1 flex items-center"><TrendingUp size={10} className="mr-1"/> {trend}</p>}
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

const HealthIndicator: React.FC<{ label: string; date: string | null }> = ({ label, date }) => {
    if (!date) return <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200 text-gray-400 text-sm"><span>{label}</span> <span>Nunca</span></div>;
    const diff = differenceInHours(new Date(), parseISO(date));
    const isCritical = diff > 24;
    const isWarning = diff > 4 && diff <= 24;
    return (
        <div className={`flex justify-between items-center p-3 rounded border text-sm font-medium ${isCritical ? 'bg-red-50 border-red-200 text-red-700' : isWarning ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <span className="flex items-center gap-2">{isCritical ? <AlertTriangle size={14}/> : <CheckCircle size={14}/>}{label}</span>
            <span>Há {diff}h</span>
        </div>
    );
};

const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // New States
  const [activeTab, setActiveTab] = useState<'overview' | 'churn' | 'broadcast' | 'marketing' | 'nano-banana' | 'clinics' | 'campaign_emails' | 'google-ads' | 'meta-ads'>('overview');
  const [atRiskClinics, setAtRiskClinics] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  
  // Ads States
  const [googleAdsData, setGoogleAdsData] = useState<any>(null);
  const [metaAdsData, setMetaAdsData] = useState<any>(null);
  const [isLoadingAds, setIsLoadingAds] = useState(false);

  // Nano Banana States
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string | null>(null);
  const [clinicsMetrics, setClinicsMetrics] = useState<any[]>([]);
  const [campaignForecast, setCampaignForecast] = useState<any[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [filterForecastStatus, setFilterForecastStatus] = useState<string>('Pending');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // State atualizado para incluir datas
  const [newAnnouncement, setNewAnnouncement] = useState({ 
      title: '', 
      message: '', 
      type: 'info',
      start_at: '',
      expires_at: ''
  });

  // --- DASHBOARD STATES ---
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [metrics, setMetrics] = useState({ clinics: 0, transactionsCount: 0, appointments: 0, aiRecords: 0 });

  useEffect(() => {
    if (activeTab === 'overview') fetchData();
    if (activeTab === 'churn') fetchChurnData();
    if (activeTab === 'broadcast') fetchAnnouncements();
    if (activeTab === 'marketing') fetchUsers();
    if (activeTab === 'clinics') fetchClinicsMetrics();
    if (activeTab === 'campaign_emails') fetchCampaignForecast();
  }, [dateRange, activeTab]);

  const fetchCampaignForecast = async () => {
    setLoadingForecast(true);
    try {
        const { data, error } = await supabase.rpc('get_campaign_forecast');
        if (error) throw error;
        setCampaignForecast(data || []);
    } catch (err: any) {
        console.error(err);
        setToast({ message: "Erro ao carregar previsão: " + err.message, type: 'error' });
    } finally {
        setLoadingForecast(false);
    }
  };

  const fetchClinicsMetrics = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase.rpc('get_clinics_metrics', {
              p_start_date: dateRange.start,
              p_end_date: dateRange.end
          });
          if (error) throw error;
          setClinicsMetrics(data || []);
      } catch (err: any) {
          setToast({ message: "Erro ao carregar métricas das clínicas: " + err.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data: any[]) => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleGenerateAds = async (type: 'google' | 'meta') => {
    setIsLoadingAds(true);
    if (type === 'google') setGoogleAdsData(null);
    else setMetaAdsData(null);

    try {
        const prompt = type === 'google' 
            ? 'Crie uma campanha de Pesquisa Google Ads completa para o DentiHub. FOCO: Dentistas que buscam inovação e automação. \n\nREQUISITOS OBRIGATÓRIOS:\n- Gere pelo menos 15 palavras-chave de alta intenção.\n- Gere pelo menos 10 palavras-chave negativas (ex: crack, pirata, gratis).\n- Sugira pelo menos 10 Títulos (headlines) persuasivos.\n- Sugira pelo menos 4 Descrições fortes.'
            : 'Crie uma campanha de Meta Ads (Facebook/Instagram) completa para o DentiHub. FOCO: Dentistas que buscam inovação e automação. \n\nREQUISITOS OBRIGATÓRIOS:\n- Sugira 3 variações de Criativos (Copy para imagem/vídeo).\n- Sugira 5 Títulos (headlines) chamativos.\n- Sugira 3 opções de Texto Principal (Primary Text) persuasivos.\n- Sugira segmentação de público (Interesses, Idade, Comportamento).';

        const { data, error } = await supabase.functions.invoke('generate-campaign-content', {
            body: { 
                taskType: type === 'google' ? 'google_ads_setup' : 'meta_ads_setup',
                prompt 
            }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        
        if (type === 'google') setGoogleAdsData(data);
        else setMetaAdsData(data);
        
        setToast({ message: `Campanha de ${type === 'google' ? 'Google' : 'Meta'} Ads gerada!`, type: 'success' });

    } catch (err: any) {
        console.error(err);
        setToast({ message: "Erro ao gerar: " + err.message, type: 'error' });
    } finally {
        setIsLoadingAds(false);
    }
  };

  const handleExportAdsExcel = (type: 'google' | 'meta') => {
    const campaignData = type === 'google' ? googleAdsData : metaAdsData;
    if (!campaignData) return;

    const wb = XLSX.utils.book_new();
    const campaignName = campaignData.campaign_name || `Campanha DentiHub ${type === 'google' ? 'Google' : 'Meta'}`;
    const adGroupName = "Grupo de Anúncios 1";
    const finalUrl = "https://dentihub.com.br";

    if (type === 'google') {
        const mainData: any[] = [];
        const adRow: any = {
            'Campaign': campaignName,
            'Ad Group': adGroupName,
            'Final URL': finalUrl,
            'Ad type': 'Responsive search ad'
        };

        (campaignData.ads?.headlines || []).forEach((h: string, i: number) => {
            adRow[`Headline ${i + 1}`] = h;
        });

        (campaignData.ads?.descriptions || []).forEach((d: string, i: number) => {
            adRow[`Description ${i + 1}`] = d;
        });

        mainData.push(adRow);

        (campaignData.keywords || []).forEach((kw: string) => {
            mainData.push({
                'Campaign': campaignName,
                'Ad Group': adGroupName,
                'Keyword': kw,
                'Criterion Type': 'Phrase',
                'Final URL': finalUrl
            });
        });

        const wsMain = XLSX.utils.json_to_sheet(mainData);
        XLSX.utils.book_append_sheet(wb, wsMain, "Anuncios_e_KWs");

        const negData = (campaignData.negative_keywords || []).map((nkw: string) => ({
            'Campaign': campaignName,
            'Keyword': nkw,
            'Criterion Type': 'Negative Broad'
        }));
        const wsNeg = XLSX.utils.json_to_sheet(negData);
        XLSX.utils.book_append_sheet(wb, wsNeg, "KWs_Negativas");
    } else {
        // Meta Ads Export
        const metaData = [
            { 'Campo': 'Nome da Campanha', 'Valor': campaignData.campaign_name },
            { 'Campo': 'Objetivo', 'Valor': campaignData.objective },
            { 'Campo': 'Público Alvo', 'Valor': campaignData.target_audience },
            { 'Campo': 'Segmentação', 'Valor': campaignData.targeting?.join(', ') },
            ... (campaignData.ads?.creatives || []).map((c: any, i: number) => ({
                'Campo': `Criativo ${i+1}`, 'Valor': c.copy
            })),
            ... (campaignData.ads?.headlines || []).map((h: string, i: number) => ({
                'Campo': `Título ${i+1}`, 'Valor': h
            }))
        ];
        const wsMeta = XLSX.utils.json_to_sheet(metaData);
        XLSX.utils.book_append_sheet(wb, wsMeta, "Meta_Ads_Config");
    }

    const fileName = `${campaignName.replace(/\s+/g, '_')}_${type === 'google' ? 'Google' : 'Meta'}Ads.xlsx`;
    XLSX.writeFile(wb, fileName);
    setToast({ message: "Planilha exportada com sucesso!", type: 'success' });
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setToast({ message: "Copiado!", type: 'success' });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: healthData, error: healthError } = await supabase.rpc('get_system_health');
        if (healthError) throw healthError;
        if (healthData && healthData.length > 0) setSystemHealth(healthData[0]);

        const start = startOfDay(parseISO(dateRange.start)).toISOString();
        const end = endOfDay(parseISO(dateRange.end)).toISOString();
        const { count: appts } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        const { count: trans } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('date', start).lte('date', end);
        const { count: recs } = await supabase.from('clinical_records').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);

        setMetrics({ clinics: 0, transactionsCount: trans || 0, appointments: appts || 0, aiRecords: recs || 0 });
    } catch (err: any) { console.error(err); setToast({ message: "Erro ao carregar dados.", type: 'error' }); } finally { setLoading(false); }
  };

  const fetchChurnData = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase.rpc('get_at_risk_clinics');
          if (error) throw error;
          setAtRiskClinics(data || []);
      } catch (err: any) { setToast({ message: "Erro churn: " + err.message, type: 'error' }); } finally { setLoading(false); }
  };

  const fetchAnnouncements = async () => {
      const { data } = await supabase.from('system_announcements').select('*').order('created_at', { ascending: false });
      setAnnouncements(data || []);
  };

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('id, email, role, clinic_id, clinics(name)')
            .order('email');
          if (error) throw error;
          setUsers(data || []);
      } catch (err: any) {
          setToast({ message: "Erro ao carregar usuários: " + err.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleSendBulkEmail = async () => {
      if (selectedUsers.length === 0) {
          setToast({ message: "Selecione pelo menos um usuário.", type: 'warning' });
          return;
      }

      setIsSendingEmails(true);
      try {
          const recipients = users
            .filter(u => selectedUsers.includes(u.id))
            .map(u => ({ email: u.email, name: 'Doutor(a)' }));

          const { data, error } = await supabase.functions.invoke('send-emails', {
              body: {
                  type: selectedTemplate,
                  recipients,
                  clinicName: 'DentiHub'
              }
          });

          if (error) throw error;
          const sentCount = data?.results?.count ?? recipients.length;
          setToast({ message: `E-mails enviados com sucesso para ${sentCount} usuários!`, type: 'success' });
          setSelectedUsers([]);
      } catch (err: any) {
          setToast({ message: "Erro ao enviar e-mails: " + err.message, type: 'error' });
      } finally {
          setIsSendingEmails(false);
      }
  };

  const handleGenerateImagePrompt = async () => {
      if (!imagePrompt.trim()) {
          setToast({ message: "Descreva a imagem que deseja criar.", type: 'warning' });
          return;
      }

      setIsGeneratingImage(true);
      setGeneratedImagePrompt(null);
      try {
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          
          const dentiHubIdentity = `
            Identidade Visual DentiHub:
            - Cores: Gradientes de Azul, Roxo e Rosa (moderno e vibrante).
            - Estilo: Limpo, profissional, tecnológico, futurista, minimalista.
            - Tema: Odontologia inovadora, Inteligência Artificial, cuidado humano com tecnologia.
            - Ambiente: Consultórios modernos, interfaces de software elegantes, iluminação suave.
            - Atmosfera: Confiança, precisão, inovação e brilho.
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3.1-pro-preview',
              contents: `Você é um especialista em engenharia de prompts para modelos de geração de imagem (como Midjourney, DALL-E 3 ou Imagen).
              
              Sua tarefa é criar um prompt extremamente detalhado e técnico para gerar uma imagem para redes sociais do DentiHub, baseando-se na solicitação do usuário e na identidade visual da marca.
              
              ${dentiHubIdentity}
              
              Solicitação do usuário: "${imagePrompt}"
              
              O prompt gerado deve:
              1. Ser em inglês (pois modelos de imagem funcionam melhor assim).
              2. Descrever a cena, iluminação, estilo artístico, enquadramento e detalhes técnicos (ex: 8k, photorealistic, cinematic lighting).
              3. Incorporar sutilmente as cores e a atmosfera do DentiHub.
              4. Ser otimizado para gerar uma imagem impactante.
              
              Retorne APENAS o prompt final, sem explicações adicionais.`,
          });

          const prompt = response.text;
          if (prompt) {
              setGeneratedImagePrompt(prompt);
              setToast({ message: "Prompt gerado com sucesso!", type: 'success' });
          } else {
              throw new Error("Não foi possível gerar o prompt.");
          }
      } catch (err: any) {
          console.error(err);
          setToast({ message: "Erro ao gerar prompt: " + err.message, type: 'error' });
      } finally {
          setIsGeneratingImage(false);
      }
  };

  const handlePostAnnouncement = async () => {
      if(!newAnnouncement.title || !newAnnouncement.message) {
          setToast({ message: "Preencha título e mensagem.", type: 'warning' });
          return;
      }
      
      try {
          const payload = {
              title: newAnnouncement.title,
              message: newAnnouncement.message,
              type: newAnnouncement.type,
              start_at: newAnnouncement.start_at ? new Date(newAnnouncement.start_at).toISOString() : new Date().toISOString(),
              expires_at: newAnnouncement.expires_at ? new Date(newAnnouncement.expires_at).toISOString() : null
          };

          const { error } = await supabase.from('system_announcements').insert(payload);
          if (error) throw error;
          
          setToast({ message: "Aviso publicado!", type: 'success' });
          setNewAnnouncement({ title: '', message: '', type: 'info', start_at: '', expires_at: '' });
          fetchAnnouncements();
      } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
      await supabase.from('system_announcements').delete().eq('id', id);
      fetchAnnouncements();
  };

  const getStatusBadge = (status: string, date: string) => {
    const isTodayDate = isToday(parseISO(date));
    
    switch (status) {
        case 'Pending':
            if (isTodayDate) return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit"><Clock size={12} className="mr-1"/> Envia Hoje</span>;
            return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit"><Timer size={12} className="mr-1"/> Agendado</span>;
        case 'Sent': return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit"><CheckCircle size={12} className="mr-1"/> Enviado</span>;
        default: return <span className="bg-gray-200 text-gray-500 px-2 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex-shrink-0 flex flex-col border-r border-gray-800 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div><h1 className="text-xl font-black text-white flex items-center gap-2"><Activity className="text-red-600" /> GOD MODE</h1><p className="text-xs text-gray-500 mt-1">Centro de Comando</p></div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white md:hidden"><X size={24} /></button>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <button onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><BarChart3 size={18} className="mr-3"/> Visão Geral</button>
              <button onClick={() => { setActiveTab('clinics'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'clinics' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><Building2 size={18} className="mr-3"/> Clínicas</button>
              <button onClick={() => { setActiveTab('churn'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'churn' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><UserX size={18} className="mr-3"/> Radar de Churn</button>
              <button onClick={() => { setActiveTab('broadcast'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'broadcast' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><Megaphone size={18} className="mr-3"/> Comunicados</button>
              <button onClick={() => { setActiveTab('marketing'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'marketing' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><Mail size={18} className="mr-3"/> E-mail Marketing</button>
              <button onClick={() => { setActiveTab('campaign_emails'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'campaign_emails' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><CalendarClock size={18} className="mr-3"/> Emails de Campanha</button>
              <button onClick={() => { setActiveTab('nano-banana'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'nano-banana' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><Image size={18} className="mr-3"/> Nano Banana</button>
              <button onClick={() => { setActiveTab('google-ads'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'google-ads' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><Monitor size={18} className="mr-3"/> Google Ads</button>
              <button onClick={() => { setActiveTab('meta-ads'); setSidebarOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'meta-ads' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}><Megaphone size={18} className="mr-3"/> Meta Ads</button>
              
              <div className="pt-4 mt-4 border-t border-gray-800">
                  <button onClick={() => { navigate('/super-admin/campaigns'); }} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><Sparkles size={18} className="mr-3"/> Marketing Studio</button>
                  <button onClick={() => { navigate('/super-admin/leads'); }} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><Users size={18} className="mr-3"/> Gestão de Leads</button>
                  <button onClick={() => { navigate('/super-admin/subscriptions'); }} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><CreditCard size={18} className="mr-3"/> Assinaturas</button>
                  <button onClick={() => { navigate('/super-admin/plans'); }} className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white"><Tag size={18} className="mr-3"/> Preços e Planos</button>
              </div>
          </nav>
          <div className="p-4 border-t border-gray-800"><button onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-center px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:text-white hover:border-gray-500 transition text-xs font-bold"><ArrowLeft size={14} className="mr-2"/> Voltar à Clínica</button></div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col w-full relative">
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><Activity className="text-red-600" size={20} /> God Mode</h2>
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-1"><Menu size={24} /></button>
        </div>

        <div className="p-4 sm:p-8 space-y-8 animate-fade-in w-full">
            
            {activeTab === 'overview' && (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-800">Saúde do Sistema</h2>
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200 w-full sm:w-auto overflow-x-auto">
                            <CalendarRange size={16} className="text-gray-400 ml-2 flex-shrink-0" />
                            <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="border-none text-sm text-gray-600 outline-none bg-transparent"/>
                            <span className="text-gray-300">-</span>
                            <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="border-none text-sm text-gray-600 outline-none bg-transparent"/>
                            <button onClick={fetchData} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-500 transition"><RefreshCw size={14}/></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard title="MRR Estimado" value={systemHealth?.mrr_estimate ? `R$ ${systemHealth.mrr_estimate.toLocaleString('pt-BR')}` : 'R$ 0'} icon={CreditCard} color="text-green-600" subtext="Baseado em assinaturas ativas"/>
                        <MetricCard title="Clínicas Ativas" value={(systemHealth?.active_clinics || 0).toString()} icon={Building2} color="text-indigo-600" trend={`+${systemHealth?.new_clinics_month || 0} este mês`}/>
                        <MetricCard title="Volume (Filtro)" value={metrics.transactionsCount.toString()} icon={FileText} color="text-blue-600" subtext="Lançamentos Financeiros" />
                        <MetricCard title="Uso de IA" value={metrics.aiRecords.toString()} icon={Mic} color="text-purple-600" subtext="Prontuários Gerados"/>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><HeartPulse className="text-red-500"/> Sinais Vitais (Última Atividade)</h3>
                            <div className="space-y-3">
                                <HealthIndicator label="Novo Agendamento" date={systemHealth?.last_appointment_at} />
                                <HealthIndicator label="Novo Paciente" date={systemHealth?.last_patient_at} />
                                <HealthIndicator label="Uso de IA (Prontuário)" date={systemHealth?.last_record_at} />
                                <HealthIndicator label="Login de Usuário" date={systemHealth?.last_login_at} />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="text-orange-500"/> Monitoramento de Erros</h3>
                            <div className="flex items-center justify-center h-40">
                                {systemHealth?.errors_today > 0 ? (
                                    <div className="text-center"><span className="text-4xl font-black text-red-500">{systemHealth.errors_today}</span><p className="text-gray-500 font-medium">Erros críticos hoje</p><p className="text-xs text-red-400 mt-2">Verifique os logs das Edge Functions.</p></div>
                                ) : (
                                    <div className="text-center"><CheckCircle size={48} className="text-green-500 mx-auto mb-2"/><p className="text-gray-800 font-bold">Sistema Estável</p><p className="text-sm text-gray-500">Nenhum erro registrado hoje.</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'clinics' && (
                <div className="p-4 md:p-8 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                                <Building2 className="text-primary" /> Gestão de Clínicas
                            </h2>
                            <p className="text-gray-500 text-sm">Métricas detalhadas por unidade no período selecionado.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                            <input 
                                type="date" 
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="text-xs font-bold text-gray-600 bg-transparent px-3 py-2 outline-none"
                            />
                            <span className="text-gray-300">|</span>
                            <input 
                                type="date" 
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="text-xs font-bold text-gray-600 bg-transparent px-3 py-2 outline-none"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold border-b">
                                    <tr>
                                        <th className="px-6 py-4">Clínica</th>
                                        <th className="px-6 py-4 text-center">Dentistas</th>
                                        <th className="px-6 py-4 text-center">Pacientes</th>
                                        <th className="px-6 py-4 text-center">Agendamentos</th>
                                        <th className="px-6 py-4 text-center">Mov. Financeiras</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {clinicsMetrics.map((clinic) => (
                                        <tr key={clinic.clinic_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{clinic.clinic_name}</div>
                                                <div className="text-[10px] text-gray-400 font-mono">{clinic.clinic_id}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                                                    {clinic.dentists_count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">
                                                {clinic.patients_count}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1 text-sm font-bold text-gray-700">
                                                    <Calendar size={14} className="text-gray-400" />
                                                    {clinic.appointments_count}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1 text-sm font-bold text-emerald-600">
                                                    <DollarSign size={14} />
                                                    {clinic.transactions_count}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {clinicsMetrics.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                                Nenhuma clínica encontrada ou erro ao carregar dados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'churn' && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><AlertOctagon className="text-red-500"/> Radar de Risco (Churn)</h2>
                    <p className="text-gray-600">Clínicas sem atividade há mais de 7 dias ou sem uso de agendamento recente.</p>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-4">Clínica</th>
                                    <th className="px-6 py-4">Dias Inativo</th>
                                    <th className="px-6 py-4">Contato</th>
                                    <th className="px-6 py-4">Plano</th>
                                    <th className="px-6 py-4">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {atRiskClinics.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma clínica em risco no momento. 👏</td></tr> : 
                                atRiskClinics.map((clinic, idx) => (
                                    <tr key={clinic.clinic_id || idx} className="hover:bg-red-50 transition">
                                        <td className="px-6 py-4 font-bold text-gray-800">{clinic.clinic_name}</td>
                                        <td className="px-6 py-4"><span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold text-xs">{clinic.days_inactive} dias</span></td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-600">{clinic.owner_email}</div>
                                            <div className="text-xs text-gray-500">{clinic.owner_phone}</div>
                                        </td>
                                        <td className="px-6 py-4 uppercase text-xs font-bold text-gray-500">{clinic.subscription_tier}</td>
                                        <td className="px-6 py-4">
                                            <a href={`https://wa.me/55${clinic.owner_phone?.replace(/\D/g, '')}?text=Olá, vi que faz um tempinho que não acessa o DentiHub. Precisa de ajuda?`} target="_blank" className="text-green-600 font-bold text-xs hover:underline bg-green-50 px-2 py-1 rounded">WhatsApp</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'broadcast' && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Megaphone className="text-blue-500"/> Comunicados Globais</h2>
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">Novo Aviso</h3>
                        <div className="grid gap-4">
                            <input className="w-full border rounded p-2 text-sm" placeholder="Título" value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} />
                            <textarea className="w-full border rounded p-2 text-sm h-24" placeholder="Mensagem" value={newAnnouncement.message} onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Início da Exibição</label>
                                    <input type="datetime-local" className="w-full border rounded p-2 text-sm" value={newAnnouncement.start_at} onChange={e => setNewAnnouncement({...newAnnouncement, start_at: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Fim da Exibição (Expira em)</label>
                                    <input type="datetime-local" className="w-full border rounded p-2 text-sm" value={newAnnouncement.expires_at} onChange={e => setNewAnnouncement({...newAnnouncement, expires_at: e.target.value})} />
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-2">
                                <select className="border rounded p-2 text-sm w-48" value={newAnnouncement.type} onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value})}>
                                    <option value="info">Informação (Azul)</option>
                                    <option value="warning">Alerta (Amarelo)</option>
                                    <option value="success">Sucesso (Verde)</option>
                                    <option value="error">Erro (Vermelho)</option>
                                </select>
                                <button onClick={handlePostAnnouncement} className="bg-primary text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-600 transition flex items-center"><Send size={16} className="mr-2"/> Publicar</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {announcements.map(ann => {
                            const now = new Date();
                            const start = ann.start_at ? parseISO(ann.start_at) : null;
                            const end = ann.expires_at ? parseISO(ann.expires_at) : null;
                            const isActive = (!start || start <= now) && (!end || end > now);

                            return (
                                <div key={ann.id} className={`bg-white p-4 rounded-xl shadow-sm border ${isActive ? 'border-green-300' : 'border-gray-200 opacity-60'} flex justify-between items-center relative overflow-hidden`}>
                                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>}
                                    <div className="pl-2">
                                        <h4 className="font-bold text-gray-800 flex items-center">
                                            {ann.title} 
                                            <span className={`text-[10px] uppercase px-2 py-0.5 rounded ml-2 ${ann.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : ann.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{ann.type}</span>
                                            {isActive ? <span className="text-[10px] text-green-600 font-bold ml-2 flex items-center"><Clock size={10} className="mr-1"/> No Ar</span> : <span className="text-[10px] text-gray-400 font-bold ml-2">Inativo / Agendado</span>}
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1">{ann.message}</p>
                                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                            <span>Início: {ann.start_at ? format(parseISO(ann.start_at), "dd/MM/yyyy HH:mm") : 'Imediato'}</span>
                                            <span>Fim: {ann.expires_at ? format(parseISO(ann.expires_at), "dd/MM/yyyy HH:mm") : 'Nunca'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'nano-banana' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Image className="text-yellow-500"/> Nano Banana Studio</h2>
                            <p className="text-gray-600">Gere prompts profissionais para criação de imagens com a identidade do DentiHub.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-700 mb-4">Criar Prompt de Imagem</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">O que deseja criar?</label>
                                        <textarea 
                                            value={imagePrompt} 
                                            onChange={(e) => setImagePrompt(e.target.value)}
                                            placeholder="Ex: Um dentista moderno usando um tablet com o logo do DentiHub em um consultório futurista..."
                                            className="w-full border rounded-lg p-3 text-sm h-32 focus:ring-2 focus:ring-primary outline-none resize-none"
                                        />
                                    </div>

                                    <button 
                                        onClick={handleGenerateImagePrompt}
                                        disabled={isGeneratingImage || !imagePrompt.trim()}
                                        className="w-full bg-yellow-500 text-black py-3 rounded-lg font-bold hover:bg-yellow-400 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                                    >
                                        {isGeneratingImage ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                        {isGeneratingImage ? 'Gerando Prompt...' : 'Gerar Prompt com Gemini 3 Pro'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                                <h4 className="text-yellow-700 font-bold text-xs mb-2 flex items-center gap-2">
                                    <Sparkles size={14} /> Identidade DentiHub
                                </h4>
                                <p className="text-xs text-yellow-800 leading-relaxed">
                                    O Gemini 3 Pro criará um prompt técnico em inglês otimizado para modelos como Midjourney ou Imagen, mantendo as cores e o estilo do DentiHub.
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-gray-900 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden border-4 border-gray-800 min-h-[400px]">
                            {isGeneratingImage ? (
                                <div className="text-center">
                                    <RefreshCw size={48} className="text-yellow-500 animate-spin mx-auto mb-4" />
                                    <p className="text-yellow-500 font-bold animate-pulse">O Gemini 3 Pro está arquitetando seu prompt...</p>
                                    <p className="text-gray-500 text-[10px] mt-2 uppercase tracking-widest">Modelo: Gemini 3.1 Pro Preview</p>
                                </div>
                            ) : generatedImagePrompt ? (
                                <div className="w-full h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-yellow-500 font-bold text-sm uppercase tracking-widest">Prompt Gerado</h3>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(generatedImagePrompt);
                                                setToast({ message: "Prompt copiado para a área de transferência!", type: 'success' });
                                            }}
                                            className="bg-yellow-500 text-black px-3 py-1.5 rounded-lg font-bold text-[10px] hover:bg-yellow-400 transition flex items-center gap-2"
                                        >
                                            <Copy size={12} /> Copiar Prompt
                                        </button>
                                    </div>
                                    <div className="flex-1 bg-black/50 border border-gray-700 rounded-lg p-6 font-mono text-sm text-gray-300 leading-relaxed overflow-y-auto max-h-[300px]">
                                        {generatedImagePrompt}
                                    </div>
                                    <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                        <p className="text-yellow-500 text-xs flex items-center gap-2">
                                            <AlertOctagon size={14} />
                                            <span>Copie este prompt e use-o no seu projeto de geração de imagem no AI Studio.</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                                        <FileText size={40} className="text-yellow-500/50" />
                                    </div>
                                    <p className="text-gray-500 font-medium">Seu prompt aparecerá aqui</p>
                                    <p className="text-[10px] text-gray-600 mt-2">Descreva sua ideia ao lado e clique em gerar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'marketing' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Mail className="text-blue-500"/> E-mail Marketing</h2>
                            <p className="text-gray-600">Envie e-mails em massa para os usuários da plataforma.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-700 mb-4">Configuração do Disparo</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Template do E-mail</label>
                                        <select 
                                            value={selectedTemplate} 
                                            onChange={(e) => setSelectedTemplate(e.target.value)}
                                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            <option value="welcome">Boas-vindas (Novo Template)</option>
                                            <option value="recall">Recall (Retorno de Pacientes)</option>
                                            <option value="subscription_success">Assinatura Concluída</option>
                                            <option value="feedback_request">Pedido de Feedback</option>
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1 italic">O template selecionado será enviado para todos os usuários marcados.</p>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Resumo</span>
                                            <span className="text-xs font-black text-primary">{selectedUsers.length} selecionados</span>
                                        </div>
                                        <button 
                                            onClick={handleSendBulkEmail}
                                            disabled={isSendingEmails || selectedUsers.length === 0}
                                            className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                                        >
                                            {isSendingEmails ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                                            {isSendingEmails ? 'Enviando...' : 'Disparar E-mails'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                <h4 className="text-blue-700 font-bold text-xs mb-2 flex items-center gap-2">
                                    <Sparkles size={14} /> Dica de Uso
                                </h4>
                                <p className="text-xs text-blue-600 leading-relaxed">
                                    Use o template de <strong>Boas-vindas</strong> para educar usuários antigos sobre as novas funcionalidades do sistema.
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[600px]">
                            <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <h3 className="text-sm font-bold text-gray-700">Lista de Usuários</h3>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <input 
                                        type="text" 
                                        placeholder="Buscar e-mail ou clínica..." 
                                        value={searchUser}
                                        onChange={(e) => setSearchUser(e.target.value)}
                                        className="text-xs border rounded-lg px-3 py-2 w-full sm:w-48 outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button 
                                        onClick={() => {
                                            if (selectedUsers.length === users.length) setSelectedUsers([]);
                                            else setSelectedUsers(users.map(u => u.id));
                                        }}
                                        className="text-[10px] font-bold text-primary hover:underline whitespace-nowrap"
                                    >
                                        {selectedUsers.length === users.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold sticky top-0 z-10 border-b">
                                        <tr>
                                            <th className="px-6 py-3 w-10"></th>
                                            <th className="px-6 py-3">E-mail</th>
                                            <th className="px-6 py-3">Clínica</th>
                                            <th className="px-6 py-3">Perfil</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs">
                                        {users.filter(u => 
                                            u.email.toLowerCase().includes(searchUser.toLowerCase()) || 
                                            (u.clinics?.name || '').toLowerCase().includes(searchUser.toLowerCase())
                                        ).map((user) => (
                                            <tr 
                                                key={user.id} 
                                                className={`hover:bg-blue-50 transition cursor-pointer ${selectedUsers.includes(user.id) ? 'bg-blue-50/50' : ''}`}
                                                onClick={() => {
                                                    if (selectedUsers.includes(user.id)) setSelectedUsers(prev => prev.filter(id => id !== user.id));
                                                    else setSelectedUsers(prev => [...prev, user.id]);
                                                }}
                                            >
                                                <td className="px-6 py-3">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedUsers.includes(user.id)}
                                                        onChange={() => {}} // Handled by row click
                                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                </td>
                                                <td className="px-6 py-3 font-medium text-gray-800">{user.email}</td>
                                                <td className="px-6 py-3 text-gray-500">{user.clinics?.name || 'N/A'}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.role === 'administrator' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'campaign_emails' && (
                <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CalendarClock size={20} className="text-blue-600"/> Previsão de Envios Automáticos</h3>
                            <p className="text-sm text-gray-500">Visualização de quando cada clínica receberá os e-mails do sistema.</p>
                        </div>
                        <div className="flex gap-2">
                            <select value={filterForecastStatus} onChange={(e) => setFilterForecastStatus(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="All">Todos Status</option>
                                <option value="Pending">Pendentes</option>
                                <option value="Sent">Enviados</option>
                            </select>
                            <button onClick={fetchCampaignForecast} className="p-2 bg-white border rounded-lg hover:bg-gray-100 text-gray-600 transition"><RefreshCw size={18} className={loadingForecast ? "animate-spin" : ""}/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition" onClick={() => handleSort('scheduled_for')}>
                                        <div className="flex items-center gap-1">
                                            Data Prevista
                                            {sortConfig?.key === 'scheduled_for' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition" onClick={() => handleSort('campaign_type')}>
                                        <div className="flex items-center gap-1">
                                            Campanha
                                            {sortConfig?.key === 'campaign_type' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition" onClick={() => handleSort('clinic_name')}>
                                        <div className="flex items-center gap-1">
                                            Clínica
                                            {sortConfig?.key === 'clinic_name' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-200 transition" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-center gap-1">
                                            Status
                                            {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4">Motivo / Detalhes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loadingForecast ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Carregando previsão...</td></tr>
                                ) : getSortedData(campaignForecast.filter(item => filterForecastStatus === 'All' || item.status === filterForecastStatus)).length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                                ) : (
                                    getSortedData(campaignForecast.filter(item => filterForecastStatus === 'All' || item.status === filterForecastStatus)).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                {format(parseISO(item.scheduled_for), "dd/MM/yyyy")}
                                                {isToday(parseISO(item.scheduled_for)) && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">HOJE</span>}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">{item.campaign_type}</td>
                                            <td className="px-6 py-4 font-bold text-gray-800">{item.clinic_name}</td>
                                            <td className="px-6 py-4 flex justify-center">{getStatusBadge(item.status, item.scheduled_for)}</td>
                                            <td className="px-6 py-4 text-xs text-gray-500">{item.reason || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {(activeTab === 'google-ads' || activeTab === 'meta-ads') && (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                                {activeTab === 'google-ads' ? <Monitor className="text-blue-600" /> : <Megaphone className="text-pink-600" />}
                                {activeTab === 'google-ads' ? 'Google Ads Generator' : 'Meta Ads Generator'}
                            </h2>
                            <p className="text-gray-500 text-sm">IA treinada especificamente para o mercado odontológico e DentiHub.</p>
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                            {(activeTab === 'google-ads' ? googleAdsData : metaAdsData) && (
                                <button 
                                    onClick={() => handleExportAdsExcel(activeTab === 'google-ads' ? 'google' : 'meta')}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition flex items-center gap-2 shadow-sm text-sm"
                                >
                                    <FileSpreadsheet size={18} /> Exportar Excel
                                </button>
                            )}
                            
                            <button 
                                onClick={() => handleGenerateAds(activeTab === 'google-ads' ? 'google' : 'meta')} 
                                disabled={isLoadingAds}
                                className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 text-sm"
                            >
                                {isLoadingAds ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                {isLoadingAds ? 'Gerando...' : 'Gerar Campanha'}
                            </button>
                        </div>
                    </div>

                    {!(activeTab === 'google-ads' ? googleAdsData : metaAdsData) && !isLoadingAds && (
                        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <Megaphone className="text-gray-200 mx-auto mb-4" size={64} />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Acelere seu Tráfego Pago</h3>
                            <p className="text-gray-500 max-w-md mx-auto text-sm">
                                Clique no botão acima para gerar uma estrutura profissional de {activeTab === 'google-ads' ? 'Google Ads' : 'Meta Ads'}, focada em converter dentistas.
                            </p>
                        </div>
                    )}

                    {isLoadingAds && (
                        <div className="space-y-6 animate-pulse">
                            <div className="h-24 bg-white rounded-xl border"></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="h-64 bg-white rounded-xl border"></div>
                                <div className="h-64 bg-white rounded-xl border"></div>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'google-ads' ? googleAdsData : metaAdsData) && (
                        <div className="space-y-8 pb-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <div className="flex items-center gap-2 mb-3 text-blue-600">
                                        <Box size={20}/>
                                        <h3 className="font-bold uppercase text-[10px] tracking-wider">Produto / Serviço</h3>
                                    </div>
                                    <p className="text-gray-800 font-bold text-lg">{(activeTab === 'google-ads' ? googleAdsData : metaAdsData).product_service || 'DentiHub - Gestão Inteligente'}</p>
                                </section>
                                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <div className="flex items-center gap-2 mb-3 text-yellow-600">
                                        <Star size={20}/>
                                        <h3 className="font-bold uppercase text-[10px] tracking-wider">Diferencial (USP)</h3>
                                    </div>
                                    <p className="text-gray-800 font-bold text-lg">{(activeTab === 'google-ads' ? googleAdsData : metaAdsData).unique_selling_proposition || 'IA Generativa e Automação Total.'}</p>
                                </section>
                            </div>

                            {activeTab === 'google-ads' ? (
                                <>
                                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                                            <Target className="text-gray-500" size={18} />
                                            <h2 className="font-bold text-gray-800 text-xs uppercase">Configurações</h2>
                                        </div>
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nome</label>
                                                <div className="font-bold text-gray-900">{googleAdsData.campaign_name}</div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Objetivo</label>
                                                <div className="font-bold text-gray-900">{googleAdsData.objective}</div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Estratégia</label>
                                                <div className="font-bold text-gray-900">{googleAdsData.bidding_strategy}</div>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <List className="text-green-600" size={18} />
                                                    <h2 className="font-bold text-gray-800 text-xs uppercase">Keywords (+)</h2>
                                                </div>
                                                <button onClick={() => copyToClipboard(googleAdsData.keywords?.join('\n'))} className="text-[10px] font-bold text-blue-600 hover:underline">Copiar</button>
                                            </div>
                                            <div className="p-6 flex flex-wrap gap-2">
                                                {googleAdsData.keywords?.map((kw: string, i: number) => (
                                                    <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded text-[10px] border border-green-100 font-bold">{kw}</span>
                                                ))}
                                            </div>
                                        </section>
                                        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <Ban className="text-red-600" size={18} />
                                                    <h2 className="font-bold text-gray-800 text-xs uppercase">Keywords (-)</h2>
                                                </div>
                                                <button onClick={() => copyToClipboard(googleAdsData.negative_keywords?.join('\n'))} className="text-[10px] font-bold text-red-600 hover:underline">Copiar</button>
                                            </div>
                                            <div className="p-6 flex flex-wrap gap-2">
                                                {googleAdsData.negative_keywords?.map((kw: string, i: number) => (
                                                    <span key={i} className="px-2 py-1 bg-red-50 text-red-700 rounded text-[10px] border border-red-100 font-bold line-through">{kw}</span>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                                            <Target className="text-gray-500" size={18} />
                                            <h2 className="font-bold text-gray-800 text-xs uppercase">Público e Segmentação</h2>
                                        </div>
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Público Alvo</label>
                                                <div className="text-sm text-gray-800 font-medium">{metaAdsData.target_audience}</div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Interesses / Segmentação</label>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {metaAdsData.targeting?.map((t: string, i: number) => (
                                                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                                            <ImageIcon className="text-gray-500" size={18} />
                                            <h2 className="font-bold text-gray-800 text-xs uppercase">Criativos Sugeridos</h2>
                                        </div>
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {metaAdsData.ads?.creatives?.map((c: any, i: number) => (
                                                <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Variação {i+1}</div>
                                                    <p className="text-xs text-gray-700 leading-relaxed flex-1 italic">"{c.copy}"</p>
                                                    <button onClick={() => copyToClipboard(c.copy)} className="mt-3 text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline"><Copy size={10}/> Copiar Texto</button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                        <h2 className="font-bold text-gray-800 text-xs uppercase">Títulos</h2>
                                        <span className="text-[9px] bg-gray-200 px-1.5 py-0.5 rounded font-bold">HOOKS</span>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {(activeTab === 'google-ads' ? googleAdsData : metaAdsData).ads?.headlines?.map((h: string, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 group">
                                                <span className="text-xs font-medium text-gray-700 truncate">{h}</span>
                                                <button onClick={() => copyToClipboard(h)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600"><Copy size={12}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                        <h2 className="font-bold text-gray-800 text-xs uppercase">Textos Principais / Descrições</h2>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {(activeTab === 'google-ads' ? googleAdsData : metaAdsData).ads?.descriptions?.map((d: string, i: number) => (
                                            <div key={i} className="bg-gray-50 p-3 rounded border border-gray-100 group">
                                                <p className="text-xs text-gray-800 leading-relaxed mb-2">{d}</p>
                                                <button onClick={() => copyToClipboard(d)} className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-600 flex items-center gap-1"><Copy size={10}/> Copiar</button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
      </main>
    </div>
  );
};

export default SuperAdminPage;