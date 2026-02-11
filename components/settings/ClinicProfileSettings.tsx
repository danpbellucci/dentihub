import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useDashboard } from '../DashboardLayout';
import { Save, Loader2, Upload, Copy, X } from 'lucide-react';
import Toast, { ToastType } from '../Toast';

const sanitizeSlug = (text: string) => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
};

const maskPhone = (value: string) => { if (!value) return ''; return value.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15); };

const ClinicProfileSettings: React.FC = () => {
  const { userProfile, refreshProfile } = useDashboard() || {};
  const [clinicData, setClinicData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (userProfile?.clinic_id) {
          fetchData();
      }
  }, [userProfile?.clinic_id]);

  const fetchData = async () => {
      setLoading(true);
      try {
          const { data } = await supabase.from('clinics').select('*').eq('id', userProfile?.clinic_id).maybeSingle();
          if (data) {
              if (data.slug === data.id) data.slug = sanitizeSlug(data.name);
              setClinicData(data);
          }
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { setToast({ message: "Máximo 5MB.", type: 'warning' }); return; }
    setUploadingLogo(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${clinicData.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('clinic-logos').upload(fileName, file, { cacheControl: '3600', upsert: true });
        if (uploadError) throw uploadError; 
        const { data: { publicUrl } } = supabase.storage.from('clinic-logos').getPublicUrl(fileName);
        setClinicData({ ...clinicData, logo_url: publicUrl });
        setToast({ message: "Logo carregado!", type: 'success' });
    } catch (error: any) { setToast({ message: "Erro: " + error.message, type: 'error' }); } finally { setUploadingLogo(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let slug = clinicData.slug || sanitizeSlug(clinicData.name);
      if (/^[0-9a-f]{8}-/.test(slug)) slug = sanitizeSlug(clinicData.name);
      
      const payload = { 
          name: clinicData.name, 
          slug, 
          address: clinicData.address, 
          city: clinicData.city, 
          state: clinicData.state, 
          phone: clinicData.phone, 
          whatsapp: clinicData.whatsapp, 
          email: clinicData.email, 
          logo_url: clinicData.logo_url,
          observation: clinicData.observation 
      };
      await supabase.from('clinics').update(payload).eq('id', clinicData.id);
      setToast({ message: "Perfil atualizado!", type: 'success' }); 
      if (refreshProfile) await refreshProfile();
    } catch (err: any) { setToast({ message: "Erro: " + err.message, type: 'error' }); } finally { setSaving(false); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); setToast({ message: "Copiado!", type: 'success' }); };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-sm p-6 animate-fade-in border border-white/5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <h2 className="text-xl font-bold text-white mb-6 pb-2 border-b border-white/10">Dados da Clínica</h2>
        <form onSubmit={handleSaveProfile} className="space-y-6">
            <div><label className="block text-sm font-medium text-gray-400 mb-1">Nome *</label><input required className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={clinicData.name || ''} onChange={e => setClinicData({ ...clinicData, name: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-400 mb-1">Endereço *</label><input required className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={clinicData.address || ''} onChange={e => setClinicData({...clinicData, address: e.target.value})} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-gray-400 mb-1">Cidade *</label><input required className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={clinicData.city || ''} onChange={e => setClinicData({...clinicData, city: e.target.value})} /></div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Estado *</label>
                    <select required className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:border-primary outline-none" value={clinicData.state || ''} onChange={e => setClinicData({...clinicData, state: e.target.value})}>
                        <option value="">UF</option>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-gray-400 mb-1">Telefone</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" value={clinicData.phone || ''} onChange={e => setClinicData({...clinicData, phone: maskPhone(e.target.value)})} maxLength={15}/></div>
                <div><label className="block text-sm font-medium text-gray-400 mb-1">WhatsApp</label><input className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" value={clinicData.whatsapp || ''} onChange={e => setClinicData({...clinicData, whatsapp: maskPhone(e.target.value)})} maxLength={15}/></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-400 mb-1">E-mail de contato</label><input type="email" className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" value={clinicData.email || ''} onChange={e => setClinicData({...clinicData, email: e.target.value})} /></div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Logo</label>
                <div className="flex items-center gap-4">
                    {clinicData.logo_url && <div className="h-16 w-16 relative border border-white/10 rounded-lg overflow-hidden group"><img src={clinicData.logo_url} className="object-cover h-full w-full" /><button type="button" onClick={(e) => { e.stopPropagation(); setClinicData({...clinicData, logo_url: null}); }} className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition"><X size={12} /></button></div>}
                    <div className={`flex-1 border-2 border-dashed border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-800 transition cursor-pointer ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => fileInputRef.current?.click()}>
                        {uploadingLogo ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <><Upload className="h-6 w-6 mb-1 text-gray-600" /><span className="text-xs">Clique para {clinicData.logo_url ? 'alterar' : 'enviar'}</span></>}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </div>
                </div>
            </div>
            <div><button type="submit" disabled={saving} className="bg-primary text-white px-6 py-2.5 rounded-md font-bold hover:bg-sky-600 transition flex items-center shadow-md disabled:opacity-50">{saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}Salvar</button></div>
        </form>
        <div className="mt-8 bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2 mb-2"><Copy size={16} /> Link de Agendamento</h4>
            <div className="flex gap-2">
                <input type="text" readOnly className="flex-1 border border-blue-500/20 rounded px-3 py-2 text-sm text-blue-300 bg-blue-900/10" value={`${window.location.origin}/#/${clinicData.slug}`} />
                <button onClick={() => copyToClipboard(`${window.location.origin}/#/${clinicData.slug}`)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">Copiar</button>
            </div>
        </div>
    </div>
  );
};

export default ClinicProfileSettings;