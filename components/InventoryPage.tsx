
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { InventoryItem, UserProfile, Dentist } from '../types';
import { Box, Plus, Edit2, Trash2, Loader2, AlertTriangle, Save, X, Search, Filter, HelpCircle, Users, User } from 'lucide-react';
import Toast, { ToastType } from './Toast';
import { useOutletContext } from 'react-router-dom';

const PREDEFINED_CATEGORIES = ['Geral', 'Descartável', 'Instrumento', 'Medicamento', 'Papelaria', 'Limpeza'];
const PREDEFINED_UNITS = ['un', 'cx', 'ml', 'l', 'g', 'kg', 'pct'];

const InventoryPage: React.FC = () => {
  const { userProfile } = useOutletContext<{ userProfile: UserProfile | null }>();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ 
      name: '', 
      quantity: 0, 
      min_quantity: 5, 
      unit: 'un', 
      category: 'Geral',
      dentist_id: '' // Empty string = Shared
  });
  
  // States para controlar input personalizado
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [ownerFilter, setOwnerFilter] = useState('all'); // 'all', 'shared', or dentist_id

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (userProfile?.clinic_id) {
        fetchData();
    }
  }, [userProfile?.clinic_id]);

  const fetchData = async () => {
    if (!userProfile?.clinic_id) return;
    setLoading(true);
    
    // 1. Fetch Dentists
    const { data: dentistsData } = await supabase
        .from('dentists')
        .select('id, name')
        .eq('clinic_id', userProfile.clinic_id)
        .order('name');
    
    if (dentistsData) {
        setDentists(dentistsData as Dentist[]);
    }

    // 2. Fetch Inventory Items with Dentist info
    const { data: itemsData, error } = await supabase
      .from('inventory_items')
      .select('*, dentist:dentists(name)')
      .eq('clinic_id', userProfile.clinic_id)
      .order('name');
    
    if (error) {
        console.error("Erro ao buscar estoque:", error);
        setToast({ message: "Erro ao carregar estoque: " + error.message, type: 'error' });
    } else {
        setItems(itemsData as InventoryItem[]);
    }
    setLoading(false);
  };

  const checkLowStockAlert = async (item: InventoryItem, newQty: number) => {
      if (newQty <= item.min_quantity) {
          // 1. Busca configurações de notificação
          const { data: configs } = await supabase
              .from('role_notifications')
              .select('role')
              .eq('clinic_id', userProfile?.clinic_id)
              .eq('notification_type', 'stock_low')
              .eq('is_enabled', true);
          
          if (!configs || configs.length === 0) return;

          const roles = configs.map(c => c.role);
          
          // 2. Busca todos os usuários com esses perfis
          const { data: potentialRecipients } = await supabase
              .from('user_profiles')
              .select('email, role')
              .eq('clinic_id', userProfile?.clinic_id)
              .in('role', roles);
          
          if (!potentialRecipients || potentialRecipients.length === 0) return;

          let finalRecipients = potentialRecipients;

          // 3. Se o item tem um dentista dono, filtra os destinatários
          if (item.dentist_id) {
              // Busca e-mail do dentista dono
              const { data: dentistOwner } = await supabase
                  .from('dentists')
                  .select('email')
                  .eq('id', item.dentist_id)
                  .single();
              
              const ownerEmail = dentistOwner?.email;

              finalRecipients = potentialRecipients.filter(user => {
                  // Se não é dentista (ex: admin, funcionário), mantém na lista se estiver configurado
                  if (user.role !== 'dentist') return true;
                  
                  // Se é dentista, só mantém se for o dono do item
                  return user.email === ownerEmail;
              });
          }

          if (finalRecipients.length === 0) return;

          // 4. Envia e-mail via Edge Function
          const uniqueRecipients = finalRecipients.map(r => ({ email: r.email }));
          await supabase.functions.invoke('send-emails', {
              body: {
                  type: 'stock_alert',
                  recipients: uniqueRecipients,
                  item: { ...item, quantity: newQty }
              }
          });
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.clinic_id) return;
    
    setProcessing(true);
    try {
        const payload = {
            clinic_id: userProfile.clinic_id,
            name: formData.name,
            quantity: Number(formData.quantity),
            min_quantity: Number(formData.min_quantity),
            unit: formData.unit,
            category: formData.category,
            dentist_id: formData.dentist_id || null, // Convert empty string to null for shared
            updated_at: new Date().toISOString()
        };

        if (editingItem) {
            const { error } = await supabase.from('inventory_items').update(payload).eq('id', editingItem.id);
            if (error) throw error;
            
            if (Number(formData.quantity) <= Number(formData.min_quantity) && editingItem.quantity > Number(formData.min_quantity)) {
               checkLowStockAlert({ ...editingItem, ...payload } as InventoryItem, Number(formData.quantity));
            }

            setToast({ message: "Item atualizado!", type: 'success' });
        } else {
            const { data, error } = await supabase.from('inventory_items').insert(payload).select().single();
            if (error) throw error;
            
            if (Number(formData.quantity) <= Number(formData.min_quantity)) {
               checkLowStockAlert(data, Number(formData.quantity));
            }

            setToast({ message: "Item adicionado!", type: 'success' });
        }
        setIsModalOpen(false);
        fetchData();
    } catch (err: any) {
        setToast({ message: "Erro ao salvar: " + err.message, type: 'error' });
    } finally {
        setProcessing(false);
    }
  };

  const handleDelete = async () => {
      if (!deleteId) return;
      setProcessing(true);
      try {
          const { error } = await supabase.from('inventory_items').delete().eq('id', deleteId);
          if (error) throw error;
          setToast({ message: "Item removido.", type: 'success' });
          setDeleteId(null);
          fetchData();
      } catch (err: any) {
          setToast({ message: "Erro ao remover.", type: 'error' });
      } finally {
          setProcessing(false);
      }
  };

  const handleOpenModal = (item?: InventoryItem) => {
      if (item) {
          setEditingItem(item);
          
          const isCustUnit = !PREDEFINED_UNITS.includes(item.unit || '');
          const isCustCat = !PREDEFINED_CATEGORIES.includes(item.category || '');
          
          setIsCustomUnit(isCustUnit);
          setIsCustomCategory(isCustCat);

          setFormData({ 
              name: item.name, 
              quantity: item.quantity, 
              min_quantity: item.min_quantity, 
              unit: item.unit || '', 
              category: item.category || '',
              dentist_id: item.dentist_id || ''
          });
      } else {
          setEditingItem(null);
          setIsCustomUnit(false);
          setIsCustomCategory(false);
          setFormData({ 
              name: '', 
              quantity: 0, 
              min_quantity: 5, 
              unit: 'un', 
              category: 'Geral',
              dentist_id: ''
          });
      }
      setIsModalOpen(true);
  };

  const handleQuickUpdate = async (item: InventoryItem, change: number) => {
      const newQty = Math.max(0, item.quantity + change);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));

      try {
          const { error } = await supabase.from('inventory_items').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', item.id);
          if (error) throw error;

          if (change < 0 && newQty <= item.min_quantity && item.quantity > item.min_quantity) {
              checkLowStockAlert(item, newQty);
          }
      } catch (err) {
          console.error(err);
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: item.quantity } : i));
          setToast({ message: "Erro ao atualizar quantidade.", type: 'error' });
      }
  };

  const filteredItems = items.filter(i => {
      const matchesCategory = categoryFilter === 'Todos' || i.category === categoryFilter;
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesOwner = true;
      if (ownerFilter === 'shared') {
          matchesOwner = !i.dentist_id;
      } else if (ownerFilter !== 'all') {
          matchesOwner = i.dentist_id === ownerFilter;
      }

      return matchesCategory && matchesSearch && matchesOwner;
  });

  return (
    <div className="max-w-7xl mx-auto pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Box className="text-primary"/> Controle de Estoque</h1>
            <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-primary transition-colors"><HelpCircle size={20} /></button>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-sky-600 transition shadow-sm font-bold w-full sm:w-auto">
            <Plus size={18} className="mr-2" /> Novo Item
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-white/5 mb-6 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
              <input 
                  type="text" 
                  placeholder="Buscar item..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="relative w-full sm:w-48">
                  <Filter className="absolute left-3 top-2.5 text-gray-500" size={18} />
                  <select 
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary outline-none appearance-none"
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                  >
                      <option value="Todos">Todas Categorias</option>
                      {PREDEFINED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      {Array.from(new Set(items.map(i => i.category))).filter(c => c && !PREDEFINED_CATEGORIES.includes(c)).map(c => (
                          <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
              </div>

              <div className="relative w-full sm:w-48">
                  <User className="absolute left-3 top-2.5 text-gray-500" size={18} />
                  <select 
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary outline-none appearance-none"
                      value={ownerFilter}
                      onChange={e => setOwnerFilter(e.target.value)}
                  >
                      <option value="all">Todos Proprietários</option>
                      <option value="shared">Compartilhado (Geral)</option>
                      {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
              </div>
          </div>
      </div>

      {/* List */}
      <div className="bg-gray-900/60 backdrop-blur-md rounded-lg shadow-lg border border-white/5 overflow-hidden">
          {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>
          ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                  <Box className="mx-auto mb-3 opacity-20" size={48}/>
                  <p>Nenhum item encontrado.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {filteredItems.map(item => (
                      <div key={item.id} className={`bg-gray-800/50 border rounded-xl p-4 flex flex-col justify-between transition-all ${item.quantity <= item.min_quantity ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-white/5 hover:border-white/20'}`}>
                          <div>
                              <div className="flex justify-between items-start mb-2">
                                  <h3 className="font-bold text-white text-lg truncate" title={item.name}>{item.name}</h3>
                                  <span className="text-[10px] bg-gray-900 text-gray-400 px-2 py-1 rounded border border-white/10 uppercase tracking-wide">{item.category}</span>
                              </div>
                              
                              <div className="mb-3">
                                  {item.dentist ? (
                                      <span className="inline-flex items-center text-xs text-blue-300 bg-blue-900/20 px-2 py-0.5 rounded border border-blue-500/20">
                                          <User size={10} className="mr-1"/> {item.dentist.name}
                                      </span>
                                  ) : (
                                      <span className="inline-flex items-center text-xs text-gray-400 bg-gray-700/30 px-2 py-0.5 rounded border border-white/5">
                                          <Users size={10} className="mr-1"/> Compartilhado
                                      </span>
                                  )}
                              </div>

                              <div className="flex items-center gap-2 mb-4">
                                  {item.quantity <= item.min_quantity && <span className="text-xs text-red-400 flex items-center font-bold bg-red-900/20 px-2 py-0.5 rounded"><AlertTriangle size={12} className="mr-1"/> Baixo Estoque</span>}
                                  <span className="text-xs text-gray-500">Mínimo: {item.min_quantity} {item.unit}</span>
                              </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                              <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-1 border border-white/10">
                                  <button onClick={() => handleQuickUpdate(item, -1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded transition">-</button>
                                  <span className={`font-mono font-bold w-12 text-center ${item.quantity <= item.min_quantity ? 'text-red-400' : 'text-white'}`}>{item.quantity}</span>
                                  <button onClick={() => handleQuickUpdate(item, 1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded transition">+</button>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => handleOpenModal(item)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded transition"><Edit2 size={18}/></button>
                                  <button onClick={() => setDeleteId(item.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition"><Trash2 size={18}/></button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-gray-900 border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white">{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Item</label>
                          <input required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      
                      {/* Owner Selection */}
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Proprietário / Responsável</label>
                          <select 
                              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary"
                              value={formData.dentist_id}
                              onChange={e => setFormData({...formData, dentist_id: e.target.value})}
                          >
                              <option value="">Compartilhado (Todos)</option>
                              {dentists.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quantidade</label>
                              <input required type="number" min="0" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mínimo (Alerta)</label>
                              <input required type="number" min="0" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" value={formData.min_quantity} onChange={e => setFormData({...formData, min_quantity: Number(e.target.value)})} />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Unidade</label>
                              {isCustomUnit ? (
                                  <div className="flex gap-1">
                                      <input 
                                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary"
                                        value={formData.unit}
                                        onChange={e => setFormData({...formData, unit: e.target.value})}
                                        placeholder="Digite..."
                                        autoFocus
                                      />
                                      <button 
                                        type="button" 
                                        onClick={() => { setIsCustomUnit(false); setFormData({...formData, unit: 'un'}); }}
                                        className="bg-gray-800 border border-gray-700 text-gray-400 hover:text-white px-2 rounded hover:bg-gray-700"
                                      >
                                          <X size={16} />
                                      </button>
                                  </div>
                              ) : (
                                  <select 
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" 
                                    value={formData.unit} 
                                    onChange={e => {
                                        if (e.target.value === 'custom') {
                                            setIsCustomUnit(true);
                                            setFormData({...formData, unit: ''});
                                        } else {
                                            setFormData({...formData, unit: e.target.value});
                                        }
                                    }}
                                  >
                                      {PREDEFINED_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                      <option value="custom">Outro...</option>
                                  </select>
                              )}
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoria</label>
                              {isCustomCategory ? (
                                  <div className="flex gap-1">
                                      <input 
                                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary"
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        placeholder="Digite..."
                                        autoFocus
                                      />
                                      <button 
                                        type="button" 
                                        onClick={() => { setIsCustomCategory(false); setFormData({...formData, category: 'Geral'}); }}
                                        className="bg-gray-800 border border-gray-700 text-gray-400 hover:text-white px-2 rounded hover:bg-gray-700"
                                      >
                                          <X size={16} />
                                      </button>
                                  </div>
                              ) : (
                                  <select 
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-primary" 
                                    value={formData.category} 
                                    onChange={e => {
                                        if (e.target.value === 'custom') {
                                            setIsCustomCategory(true);
                                            setFormData({...formData, category: ''});
                                        } else {
                                            setFormData({...formData, category: e.target.value});
                                        }
                                    }}
                                  >
                                      {PREDEFINED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                      <option value="custom">Outro...</option>
                                  </select>
                              )}
                          </div>
                      </div>
                      <div className="flex justify-end pt-4 gap-3">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white font-bold transition">Cancelar</button>
                          <button type="submit" disabled={processing} className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-sky-600 transition flex items-center shadow-md">
                              {processing ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2" size={18}/>} Salvar
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
             <div className="bg-red-900/20 p-3 rounded-full inline-block mb-4"><Trash2 className="text-red-500" size={32} /></div>
             <h3 className="text-lg font-bold text-white mb-2">Excluir Item?</h3>
             <p className="text-gray-400 mb-6 text-sm">Tem certeza que deseja remover este item do estoque?</p>
             <div className="flex space-x-3 w-full">
                <button onClick={() => setDeleteId(null)} disabled={processing} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 font-bold transition">Cancelar</button>
                <button onClick={handleDelete} disabled={processing} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition shadow-lg">{processing ? <Loader2 className="animate-spin" size={20}/> : 'Sim, Excluir'}</button>
             </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl w-full max-w-lg">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="text-xl font-bold flex items-center text-white gap-2"><HelpCircle className="text-primary"/> Controle de Estoque</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
             </div>
             <div className="space-y-4 text-sm text-gray-400">
                <p>Gerencie seus insumos e materiais de forma simples.</p>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Alerta Automático:</strong> Defina uma quantidade mínima para cada item. Se o estoque cair abaixo desse valor, você receberá um e-mail de alerta.</li>
                   <li><strong>Proprietário:</strong> Você pode definir se um item é compartilhado por toda a clínica ou se pertence a um dentista específico.</li>
                   <li><strong>Configuração:</strong> Ative os alertas de estoque na página de <strong>Configurações</strong> {'>'} Aba <strong>Perfis de Acesso</strong> {'>'} Seção <strong>Notificações</strong>.</li>
                   <li><strong>Edição Rápida:</strong> Use os botões + e - para ajustar quantidades no dia a dia.</li>
                   <li><strong>Personalização:</strong> Selecione "Outro..." em Categoria ou Unidade para digitar valores personalizados.</li>
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
