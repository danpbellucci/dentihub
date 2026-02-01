
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { Search, MapPin, Smile, Phone, ArrowRight, Home, Filter, Loader2 } from 'lucide-react';

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const FindClinicPage: React.FC = () => {
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [searchName, setSearchName] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [searchCity, setSearchCity] = useState('');
  
  // Lista de cidades disponíveis carregada do banco
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Debounce para não chamar a API a cada tecla no nome
  const [debouncedName, setDebouncedName] = useState(searchName);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(searchName);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchName]);

  // Carrega cidades quando o Estado muda (ou na montagem inicial)
  useEffect(() => {
      fetchCities();
      // Resetar cidade selecionada se o estado mudar e a cidade atual não for vazia
      if (selectedState) {
          setSearchCity('');
      }
  }, [selectedState]);

  // Busca clínicas quando os filtros mudam
  useEffect(() => {
    fetchClinics();
  }, [debouncedName, selectedState, searchCity]);

  const fetchCities = async () => {
      setLoadingCities(true);
      try {
        // SEGURANÇA: Usa a View 'public_clinics'
        let query = supabase
            .from('public_clinics')
            .select('city')
            .neq('city', null)
            .neq('city', '');

        if (selectedState) {
            query = query.eq('state', selectedState);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
            // Processamento local para obter cidades únicas e ordenadas
            const distinctCities = ([...new Set(data.map((item: any) => item.city?.trim()))]
                .filter((city: any) => typeof city === 'string' && city.length > 0) as string[])
                .sort((a: string, b: string) => a.localeCompare(b));
            
            setAvailableCities(distinctCities);
        }
      } catch (err) {
          console.error("Erro ao buscar cidades:", err);
      } finally {
          setLoadingCities(false);
      }
  };

  const fetchClinics = async () => {
    setLoading(true);
    setError('');
    
    try {
        // SEGURANÇA: Usa a View 'public_clinics' em vez da tabela direta
        let query = supabase
            .from('public_clinics')
            .select('id, name, slug, address, city, state, logo_url, phone, observation')
            .limit(50); // Limite de segurança

        if (debouncedName) {
            query = query.ilike('name', `%${debouncedName}%`);
        }
        if (selectedState) {
            query = query.eq('state', selectedState);
        }
        if (searchCity) {
            query = query.eq('city', searchCity);
        }

        query = query.order('name');

        const { data, error } = await query;

        if (error) throw error;

        setClinics(data || []);

    } catch (err: any) {
        console.error('Erro na busca:', err);
        setError('Não foi possível carregar as clínicas no momento.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Simples - Sticky */}
      <header className="bg-white shadow-sm py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
            <Logo className="w-8 h-8" />
            <span>DentiHub</span>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-primary flex items-center"
          >
            <Home size={16} className="mr-1" /> Início
          </button>
        </div>
      </header>

      {/* Hero Busca */}
      <div className="bg-primary py-12 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-4">Encontre uma Clínica Próxima</h1>
        <p className="text-white/90 text-lg mb-8">Agende sua consulta de forma rápida e online.</p>
        
        <div className="max-w-4xl mx-auto bg-white p-4 rounded-xl shadow-2xl flex flex-col md:flex-row gap-4 items-center">
            
            {/* Input Nome */}
            <div className="flex-1 w-full relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                    type="text" 
                    placeholder="Nome da clínica..." 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 outline-none focus:ring-2 focus:ring-primary transition"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                />
            </div>

            {/* Select Estado */}
            <div className="w-full md:w-48 relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <select 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                >
                    <option value="">Todo Brasil (UF)</option>
                    {BRAZIL_STATES.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                    ))}
                </select>
            </div>

            {/* Select Cidade (Alterado de Input para Select) */}
            <div className="w-full md:w-64 relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className={`h-5 w-5 ${loadingCities ? 'text-primary animate-spin' : 'text-gray-400'}`} />
                </div>
                <select
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    disabled={loadingCities}
                >
                    <option value="">Todas as Cidades</option>
                    {availableCities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
            </div>
        </div>
      </div>

      {/* Lista de Clínicas */}
      <div className="max-w-7xl mx-auto px-4 py-12 flex-1 w-full">
        {loading ? (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-primary h-10 w-10" />
            </div>
        ) : error ? (
            <div className="text-center text-red-500 py-12 bg-white rounded-xl shadow-sm border border-red-100">
                <p>{error}</p>
            </div>
        ) : clinics.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-xl mb-2 font-bold text-gray-700">Nenhuma clínica encontrada.</p>
                <p className="text-sm">Tente ajustar os filtros de busca.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clinics.map(clinic => (
                    <div key={clinic.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
                        <div className="p-6 flex-1">
                            <div className="flex items-center mb-4">
                                {clinic.logo_url ? (
                                    <img src={clinic.logo_url} alt={clinic.name} className="h-16 w-16 object-contain rounded-lg border bg-gray-50" />
                                ) : (
                                    <Logo className="h-16 w-16" />
                                )}
                                <div className="ml-4 flex-1 min-w-0">
                                    <h3 className="font-bold text-lg text-gray-900 leading-tight truncate" title={clinic.name}>{clinic.name}</h3>
                                    {clinic.city && clinic.state && (
                                        <p className="text-sm text-gray-500 flex items-center mt-1">
                                            <MapPin size={14} className="mr-1 flex-shrink-0" />
                                            <span className="truncate">{clinic.city} - {clinic.state}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {clinic.address && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[40px]">
                                    {clinic.address}
                                </p>
                            )}
                            
                            {clinic.observation && (
                                <div className="bg-gray-50 p-2 rounded mb-2">
                                    <p className="text-xs text-gray-500 italic line-clamp-2">
                                        "{clinic.observation}"
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center mt-auto">
                            {clinic.phone ? (
                                <div className="text-xs text-gray-500 flex items-center">
                                    <Phone size={14} className="mr-1" /> {clinic.phone}
                                </div>
                            ) : (
                                <span></span>
                            )}
                            <button 
                                onClick={() => navigate(`/${clinic.slug}`)}
                                className="text-sm font-bold text-primary hover:text-sky-700 flex items-center transition bg-white px-3 py-1.5 rounded-full border border-primary/20 hover:border-primary shadow-sm"
                            >
                                Agendar <ArrowRight size={16} className="ml-1" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
      
      <footer className="bg-white border-t py-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} DentiHub. Conectando pacientes a sorrisos.
      </footer>
    </div>
  );
};

export default FindClinicPage;
