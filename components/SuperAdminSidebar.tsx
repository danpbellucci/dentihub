
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, BarChart3, Sparkles, Users, CreditCard, Tag, ArrowLeft, X, Megaphone
} from 'lucide-react';

interface SuperAdminSidebarProps {
  activePage: 'overview' | 'leads' | 'subscriptions' | 'plans' | 'marketing' | 'ads';
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ activePage, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex-shrink-0 flex flex-col border-r border-gray-800
      transform transition-transform duration-300 ease-in-out
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0
    `}>
      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2"><Activity className="text-red-600" /> GOD MODE</h1>
          <p className="text-xs text-gray-500 mt-1">Super Admin Dashboard</p>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white md:hidden"><X size={24} /></button>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <button 
          onClick={() => navigate('/super-admin')} 
          className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activePage === 'overview' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          <BarChart3 size={18} className="mr-3"/> Visão Geral
        </button>
        
        <div className="pt-4 mt-4 border-t border-gray-800">
          <p className="text-[10px] font-bold text-gray-600 uppercase px-4 mb-2 tracking-widest">Crescimento</p>
          <button 
            onClick={() => navigate('/super-admin/leads')} 
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activePage === 'leads' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Users size={18} className="mr-3"/> Gestão de Leads
          </button>
          <button 
            onClick={() => navigate('/super-admin/campaigns')} 
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activePage === 'marketing' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Sparkles size={18} className="mr-3"/> Marketing Studio
          </button>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-800">
          <p className="text-[10px] font-bold text-gray-600 uppercase px-4 mb-2 tracking-widest">Financeiro</p>
          <button 
            onClick={() => navigate('/super-admin/subscriptions')} 
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activePage === 'subscriptions' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <CreditCard size={18} className="mr-3"/> Assinaturas
          </button>
          <button 
            onClick={() => navigate('/super-admin/plans')} 
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activePage === 'plans' ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Tag size={18} className="mr-3"/> Preços e Planos
          </button>
        </div>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <button onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-center px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:text-white hover:border-gray-500 transition text-xs font-bold"><ArrowLeft size={14} className="mr-2"/> Voltar à Clínica</button>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;
