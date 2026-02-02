
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
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white flex flex-col">
      
      {/* BACKGROUND GLOWS (Similar to Landing Page) */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="fixed w-full top-0 z-50 border-b border-white/5 bg-gray-950/90 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-2 text-white font-bold text-2xl cursor-pointer hover:opacity-80 transition" onClick={() => navigate('/')}>
            <Logo className="w-8 h-8" />
            <span className="tracking-tight">
                Denti<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hub</span>
            </span>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-sm font-medium text-gray-300 hover:text-white flex items-center px-3 py-2 rounded-lg hover:bg-white/5 transition"
          >
            <Home size={16} className="mr-2" /> Início
          </button>
        </div>
      </header>

      {/* Hero Busca */}
      <div className="relative z-10 pt-32 pb-12 px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-black text-white mb-6 drop-shadow-xl">
            Encontre uma Clínica Próxima
        </h1>
        <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            Agende sua consulta de forma rápida e online.
        </p>
        
        <div className="max-w-4xl mx-auto bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row gap-4 items-center">
            
            {/* Input Nome */}
            <div className="flex-1 w-full relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-500" />
                </div>
                <input 
                    type="text" 
                    placeholder="Nome da clínica..." 
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition placeholder-gray-500"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                />
            </div>

            {/* Select Estado */}
            <div className="w-full md:w-48 relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-500" />
                </div>
                <select 
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer placeholder-gray-500"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                >
                    <option value="" className="text-gray-500">Todo Brasil (UF)</option>
                    {BRAZIL_STATES.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                    ))}
                </select>
            </div>

            {/* Select Cidade */}
            <div className="w-full md:w-64 relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className={`h-5 w-5 ${loadingCities ? 'text-primary animate-spin' : 'text-gray-500'}`} />
                </div>
                <select
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 flex-1 w-full">
        {loading ? (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-primary h-10 w-10" />
            </div>
        ) : error ? (
            <div className="text-center text-red-400 py-12 bg-gray-900/60 rounded-xl border border-red-900/50">
                <p>{error}</p>
            </div>
        ) : clinics.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-gray-900/40 backdrop-blur rounded-xl border border-white/5">
                <div className="inline-block p-4 bg-gray-800 rounded-full mb-4">
                    <Search className="h-8 w-8 text-gray-600" />
                </div>
                <p className="text-xl mb-2 font-bold text-gray-300">Nenhuma clínica encontrada.</p>
                <p className="text-sm">Tente ajustar os filtros de busca.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clinics.map(clinic => (
                    <div key={clinic.id} className="bg-gray-900/60 backdrop-blur-md rounded-2xl border border-white/5 hover:border-white/10 transition duration-300 overflow-hidden flex flex-col h-full group hover:shadow-lg hover:shadow-purple-900/10">
                        <div className="p-6 flex-1">
                            <div className="flex items-center mb-4">
                                {clinic.logo_url ? (
                                    <img src={clinic.logo_url} alt={clinic.name} className="h-16 w-16 object-contain rounded-lg border border-white/10 bg-gray-800" />
                                ) : (
                                    <div className="h-16 w-16 bg-gray-800 rounded-lg flex items-center justify-center border border-white/10">
                                        <Logo className="h-10 w-10" />
                                    </div>
                                )}
                                <div className="ml-4 flex-1 min-w-0">
                                    <h3 className="font-bold text-lg text-white leading-tight truncate group-hover:text-primary transition-colors" title={clinic.name}>{clinic.name}</h3>
                                    {clinic.city && clinic.state && (
                                        <p className="text-sm text-gray-400 flex items-center mt-1">
                                            <MapPin size={14} className="mr-1 flex-shrink-0 text-gray-500" />
                                            <span className="truncate">{clinic.city} - {clinic.state}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {clinic.address && (
                                <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                                    {clinic.address}
                                </p>
                            )}
                            
                            {clinic.observation && (
                                <div className="bg-gray-800/50 p-3 rounded-lg border border-white/5">
                                    <p className="text-xs text-gray-500 italic line-clamp-2">
                                        "{clinic.observation}"
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-gray-800/40 border-t border-white/5 flex justify-between items-center mt-auto">
                            {clinic.phone ? (
                                <div className="text-xs text-gray-500 flex items-center">
                                    <Phone size={14} className="mr-1" /> {clinic.phone}
                                </div>
                            ) : (
                                <span></span>
                            )}
                            <button 
                                onClick={() => navigate(`/${clinic.slug}`)}
                                className="text-sm font-bold text-white bg-primary hover:bg-sky-600 transition px-4 py-2 rounded-lg shadow-lg shadow-blue-900/20 flex items-center group-hover:scale-105 transform duration-200"
                            >
                                Agendar <ArrowRight size={16} className="ml-1" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
      
      <footer className="bg-gray-950 border-t border-white/5 py-12 text-center text-sm text-gray-500 relative z-10">
        &copy; {new Date().getFullYear()} DentiHub. Conectando pacientes a sorrisos.
      </footer>
    </div>
  );
};

export default FindClinicPage;
