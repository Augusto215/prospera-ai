import React, { useState, useEffect } from 'react';
import { Plus, Gem, Tag, DollarSign, TrendingUp, Edit, Trash2, Save, X, Star, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ExoticAsset {
  id: string;
  name: string;
  category: string;
  custom_tags: string[];
  purchase_price: number;
  current_value: number | null;
  purchase_date: string;
  condition: 'novo' | 'excelente' | 'bom' | 'regular' | 'ruim';
  description: string | null;
  location: string | null;
  insurance_value: number | null;
  created_at: string;
  updated_at: string;
}

const assetCategories = [
  { value: 'relogios', label: 'Relógios', color: 'bg-yellow-500', icon: '⌚' },
  { value: 'arte', label: 'Arte', color: 'bg-purple-500', icon: '🎨' },
  { value: 'roupas', label: 'Roupas de Grife', color: 'bg-pink-500', icon: '👔' },
  { value: 'tenis', label: 'Tênis Colecionáveis', color: 'bg-blue-500', icon: '👟' },
  { value: 'joias', label: 'Joias', color: 'bg-emerald-500', icon: '💎' },
  { value: 'vinhos', label: 'Vinhos', color: 'bg-red-500', icon: '🍷' },
  { value: 'cartas', label: 'Cartas Colecionáveis', color: 'bg-indigo-500', icon: '🃏' },
  { value: 'instrumentos', label: 'Instrumentos Musicais', color: 'bg-orange-500', icon: '🎸' },
  { value: 'antiguidades', label: 'Antiguidades', color: 'bg-amber-500', icon: '🏺' },
  { value: 'outros', label: 'Outros', color: 'bg-gray-500', icon: '📦' }
];

const conditionOptions = [
  { value: 'novo', label: 'Novo', color: 'bg-green-100 text-green-700' },
  { value: 'excelente', label: 'Excelente', color: 'bg-blue-100 text-blue-700' },
  { value: 'bom', label: 'Bom', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'regular', label: 'Regular', color: 'bg-orange-100 text-orange-700' },
  { value: 'ruim', label: 'Ruim', color: 'bg-red-100 text-red-700' }
];

export default function ExoticAssets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<ExoticAsset[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExoticAsset>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchAssets();
    }
  }, [user]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exotic_assets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (err) {
      console.error('Error fetching exotic assets:', err);
      setError('Erro ao carregar ativos exóticos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (assetData: Omit<ExoticAsset, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('exotic_assets')
        .insert([{
          ...assetData,
          user_id: user?.id,
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      setSelectedTags([]);
      setNewTag('');
      fetchAssets();
    } catch (err) {
      console.error('Error adding exotic asset:', err);
      setError('Erro ao adicionar ativo exótico');
    }
  };

  const handleEditAsset = (asset: ExoticAsset) => {
    setEditingId(asset.id);
    setEditForm({
      name: asset.name,
      category: asset.category,
      custom_tags: asset.custom_tags,
      purchase_price: asset.purchase_price,
      current_value: asset.current_value,
      purchase_date: asset.purchase_date,
      condition: asset.condition,
      description: asset.description,
      location: asset.location,
      insurance_value: asset.insurance_value
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('exotic_assets')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setEditingId(null);
      setEditForm({});
      fetchAssets();
    } catch (err) {
      console.error('Error updating exotic asset:', err);
      setError('Erro ao atualizar ativo exótico');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ativo exótico?')) return;

    try {
      const { error } = await supabase
        .from('exotic_assets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAssets();
    } catch (err) {
      console.error('Error deleting exotic asset:', err);
      setError('Erro ao excluir ativo exótico');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags([...selectedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const totalInvested = assets.reduce((sum, asset) => sum + asset.purchase_price, 0);
  const totalCurrentValue = assets.reduce((sum, asset) => sum + (asset.current_value || asset.purchase_price), 0);
  const totalAppreciation = totalCurrentValue - totalInvested;
  const appreciationPercentage = totalInvested > 0 ? (totalAppreciation / totalInvested) * 100 : 0;

  const getCategoryInfo = (category: string) => {
    return assetCategories.find(c => c.value === category) || assetCategories[assetCategories.length - 1];
  };

  const getConditionInfo = (condition: string) => {
    return conditionOptions.find(c => c.value === condition) || conditionOptions[1];
  };

  // Obter todas as tags únicas dos ativos existentes
  const allTags = [...new Set(assets.flatMap(asset => asset.custom_tags))];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Ativos Exóticos</h1>
          <p className="text-gray-500 mt-1">Gerencie seus itens de valor e coleções</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Ativo</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-purple-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Valor Investido</p>
              <p className="text-3xl font-bold mt-1">R$ {totalInvested.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-emerald-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Valor Atual</p>
              <p className="text-3xl font-bold mt-1">R$ {totalCurrentValue.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Gem className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className={`${totalAppreciation >= 0 ? 'bg-green-600' : 'bg-red-600'} p-6 rounded-xl text-white shadow-md`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Valorização</p>
              <p className="text-3xl font-bold mt-1">
                {totalAppreciation >= 0 ? '+' : ''}R$ {Math.abs(totalAppreciation).toLocaleString('pt-BR')}
              </p>
              <p className="text-white/80 text-sm">{appreciationPercentage.toFixed(1)}%</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-blue-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Total de Itens</p>
              <p className="text-3xl font-bold mt-1">{assets.length}</p>
              <p className="text-white/80 text-sm">{assetCategories.length} categorias</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Star className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtro por categoria */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Categorias</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {assetCategories.map(category => {
            const categoryAssets = assets.filter(asset => asset.category === category.value);
            const categoryValue = categoryAssets.reduce((sum, asset) => sum + (asset.current_value || asset.purchase_price), 0);
            
            return (
              <div key={category.value} className="bg-gray-50 p-4 rounded-xl text-center">
                <div className={`w-10 h-10 ${category.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                  <span className="text-white text-lg">{category.icon}</span>
                </div>
                <h3 className="font-medium text-gray-800 text-sm">{category.label}</h3>
                <p className="text-xs text-gray-500">{categoryAssets.length} itens</p>
                <p className="text-sm font-semibold text-gray-700">R$ {categoryValue.toLocaleString('pt-BR')}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tags populares */}
      {allTags.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tags Populares</h2>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 20).map(tag => (
              <span key={tag} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista de ativos */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Sua Coleção</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {assets.length === 0 ? (
            <div className="p-12 text-center">
              <Gem className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum ativo exótico cadastrado</h3>
              <p className="text-gray-500">Adicione seus itens de valor e coleções para acompanhar a valorização.</p>
            </div>
          ) : (
            assets.map((asset) => {
              const currentValue = asset.current_value || asset.purchase_price;
              const appreciation = currentValue - asset.purchase_price;
              const appreciationPercentage = ((appreciation / asset.purchase_price) * 100);
              const categoryInfo = getCategoryInfo(asset.category);
              const conditionInfo = getConditionInfo(asset.condition);
              
              return (
                <div key={asset.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  {editingId === asset.id ? (
                    // Modo de edição
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                          placeholder="Nome do item"
                        />
                        <select
                          value={editForm.category || ''}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        >
                          {assetCategories.map(category => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="number"
                          value={editForm.purchase_price || ''}
                          onChange={(e) => setEditForm({ ...editForm, purchase_price: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                          placeholder="Preço de compra"
                          step="0.01"
                        />
                        <input
                          type="number"
                          value={editForm.current_value || ''}
                          onChange={(e) => setEditForm({ ...editForm, current_value: Number(e.target.value) || null })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                          placeholder="Valor atual"
                          step="0.01"
                        />
                        <select
                          value={editForm.condition || ''}
                          onChange={(e) => setEditForm({ ...editForm, condition: e.target.value as any })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        >
                          {conditionOptions.map(condition => (
                            <option key={condition.value} value={condition.value}>
                              {condition.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo de visualização
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${categoryInfo.color}`}>
                          <span className="text-white text-lg">{categoryInfo.icon}</span>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-gray-800">{asset.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${categoryInfo.color}`}>
                              {categoryInfo.label}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${conditionInfo.color}`}>
                              {conditionInfo.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500">
                              Compra: {new Date(asset.purchase_date).toLocaleDateString('pt-BR')}
                            </span>
                            {asset.location && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-sm text-gray-500 flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {asset.location}
                                </span>
                              </>
                            )}
                          </div>
                          
                          {asset.custom_tags && asset.custom_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {asset.custom_tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                  #{tag}
                                </span>
                              ))}
                              {asset.custom_tags.length > 3 && (
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                  +{asset.custom_tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-semibold text-lg text-gray-800">
                              R$ {currentValue.toLocaleString('pt-BR')}
                            </p>
                            <p className={`text-sm ${appreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {appreciation >= 0 ? '+' : ''}R$ {appreciation.toLocaleString('pt-BR')} ({appreciationPercentage.toFixed(1)}%)
                            </p>
                            {asset.insurance_value && (
                              <p className="text-sm text-blue-600">
                                Seguro: R$ {asset.insurance_value.toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleEditAsset(asset)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteAsset(asset.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de adicionar ativo */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Novo Ativo Exótico</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddAsset({
                name: formData.get('name') as string,
                category: formData.get('category') as string,
                custom_tags: selectedTags,
                purchase_price: Number(formData.get('purchase_price')),
                current_value: Number(formData.get('current_value')) || null,
                purchase_date: formData.get('purchase_date') as string,
                condition: formData.get('condition') as any,
                description: formData.get('description') as string || null,
                location: formData.get('location') as string || null,
                insurance_value: Number(formData.get('insurance_value')) || null,
              });
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Nome do item"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                
                <select
                  name="category"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="">Categoria</option>
                  {assetCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  name="purchase_price"
                  placeholder="Preço de compra (R$)"
                  step="0.01"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                
                <input
                  type="number"
                  name="current_value"
                  placeholder="Valor atual (R$) - opcional"
                  step="0.01"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                
                <select
                  name="condition"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="">Condição</option>
                  {conditionOptions.map(condition => (
                    <option key={condition.value} value={condition.value}>
                      {condition.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="location"
                  placeholder="Localização (onde está guardado)"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                
                <input
                  type="number"
                  name="insurance_value"
                  placeholder="Valor do seguro (R$) - opcional"
                  step="0.01"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de compra</label>
                <input
                  type="date"
                  name="purchase_date"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
              
              <textarea
                name="description"
                placeholder="Descrição detalhada (opcional)"
                rows={3}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              
              {/* Sistema de tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags Personalizadas</label>
                <div className="flex space-x-2 mb-3">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Adicionar tag..."
                    className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200"
                  >
                    <Tag className="h-4 w-4" />
                  </button>
                </div>
                
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTags.map(tag => (
                      <span key={tag} className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-purple-500 hover:text-purple-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {allTags.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Tags populares:</p>
                    <div className="flex flex-wrap gap-1">
                      {allTags.slice(0, 10).map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => !selectedTags.includes(tag) && setSelectedTags([...selectedTags, tag])}
                          disabled={selectedTags.includes(tag)}
                          className={`text-xs px-2 py-1 rounded-full transition-colors duration-200 ${
                            selectedTags.includes(tag)
                              ? 'bg-purple-200 text-purple-800 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedTags([]);
                    setNewTag('');
                  }}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}