import React, { useState, useEffect } from 'react';
import { Plus, Car, Calendar, DollarSign, TrendingDown, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Vehicle {
  id: string;
  type: 'carro' | 'moto' | 'caminhao' | 'van' | 'outros';
  brand: string;
  model: string;
  year: number;
  purchase_price: number;
  current_value: number | null;
  mileage: number;
  purchase_date: string;
  depreciation_rate: number;
  monthly_expenses: number;
  is_financed: boolean;
  created_at: string;
  updated_at: string;
}

const vehicleTypes = [
  { value: 'carro', label: 'Carro', color: 'bg-blue-500' },
  { value: 'moto', label: 'Moto', color: 'bg-green-500' },
  { value: 'caminhao', label: 'Caminhão', color: 'bg-yellow-500' },
  { value: 'van', label: 'Van', color: 'bg-purple-500' },
  { value: 'outros', label: 'Outros', color: 'bg-gray-500' }
];

const carBrands = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi',
  'Hyundai', 'Kia', 'Nissan', 'Fiat', 'Renault', 'Peugeot', 'Citroën', 'Jeep', 'Mitsubishi'
];

export default function Vehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Vehicle>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .insert([{
          ...vehicleData,
          user_id: user?.id,
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      fetchVehicles();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError('Erro ao adicionar veículo');
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setEditForm({
      type: vehicle.type,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      purchase_price: vehicle.purchase_price,
      current_value: vehicle.current_value,
      mileage: vehicle.mileage,
      purchase_date: vehicle.purchase_date,
      depreciation_rate: vehicle.depreciation_rate,
      monthly_expenses: vehicle.monthly_expenses,
      is_financed: vehicle.is_financed
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setEditingId(null);
      setEditForm({});
      fetchVehicles();
    } catch (err) {
      console.error('Error updating vehicle:', err);
      setError('Erro ao atualizar veículo');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchVehicles();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setError('Erro ao excluir veículo');
    }
  };

  const calculateCurrentValue = (vehicle: Vehicle) => {
    const purchaseDate = new Date(vehicle.purchase_date);
    const currentDate = new Date();
    const yearsOwned = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    // If current_value is set manually, use that
    if (vehicle.current_value !== null) {
      return vehicle.current_value;
    }
    
    // Otherwise calculate based on depreciation rate
    // Apply compound depreciation: value = initial_value * (1 - rate)^years
    const currentValue = vehicle.purchase_price * Math.pow(1 - (vehicle.depreciation_rate / 100), yearsOwned);
    
    // Ensure value doesn't go below 10% of purchase price
    return Math.max(currentValue, vehicle.purchase_price * 0.1);
  };

  const totalInvested = vehicles.reduce((sum, vehicle) => sum + vehicle.purchase_price, 0);
  const totalCurrentValue = vehicles.reduce((sum, vehicle) => sum + calculateCurrentValue(vehicle), 0);
  const totalDepreciation = totalInvested - totalCurrentValue;
  const totalMonthlyExpenses = vehicles.reduce((sum, vehicle) => sum + vehicle.monthly_expenses, 0);

  const getTypeLabel = (type: string) => {
    return vehicleTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    return vehicleTypes.find(t => t.value === type)?.color || 'bg-gray-500';
  };

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
          <h1 className="text-3xl font-bold text-gray-800">Veículos</h1>
          <p className="text-gray-500 mt-1">Gerencie seus veículos e acompanhe a depreciação</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Veículo</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-600 p-6 rounded-xl text-white shadow-md">
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

        <div className="bg-green-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Valor Atual</p>
              <p className="text-3xl font-bold mt-1">R$ {totalCurrentValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Car className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-red-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Depreciação</p>
              <p className="text-3xl font-bold mt-1">R$ {totalDepreciation.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              <p className="text-white/80 text-sm">{((totalDepreciation / totalInvested) * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingDown className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-orange-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Gastos Mensais</p>
              <p className="text-3xl font-bold mt-1">R$ {totalMonthlyExpenses.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de veículos */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Seus Veículos</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {vehicles.length === 0 ? (
            <div className="p-12 text-center">
              <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum veículo cadastrado</h3>
              <p className="text-gray-500">Adicione seus veículos para acompanhar a depreciação.</p>
            </div>
          ) : (
            vehicles.map((vehicle) => {
              const currentValue = calculateCurrentValue(vehicle);
              const depreciation = vehicle.purchase_price - currentValue;
              const depreciationPercentage = (depreciation / vehicle.purchase_price) * 100;
              
              return (
                <div key={vehicle.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  {editingId === vehicle.id ? (
                    // Modo de edição
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                          value={editForm.type || ''}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {vehicleTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={editForm.brand || ''}
                          onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {carBrands.map(brand => (
                            <option key={brand} value={brand}>
                              {brand}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={editForm.model || ''}
                          onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Modelo"
                        />
                        <input
                          type="number"
                          value={editForm.year || ''}
                          onChange={(e) => setEditForm({ ...editForm, year: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Ano"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="number"
                          value={editForm.purchase_price || ''}
                          onChange={(e) => setEditForm({ ...editForm, purchase_price: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Preço de compra"
                          step="0.01"
                        />
                        <input
                          type="number"
                          value={editForm.current_value || ''}
                          onChange={(e) => setEditForm({ ...editForm, current_value: Number(e.target.value) || null })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Valor atual (opcional)"
                          step="0.01"
                        />
                        <input
                          type="number"
                          value={editForm.mileage || ''}
                          onChange={(e) => setEditForm({ ...editForm, mileage: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Quilometragem"
                        />
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
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(vehicle.type)}`}>
                          <Car className="h-6 w-6 text-white" />
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-gray-800">{vehicle.brand} {vehicle.model}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${getTypeColor(vehicle.type)}`}>
                              {getTypeLabel(vehicle.type)}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                              {vehicle.year}
                            </span>
                            {vehicle.is_financed && (
                              <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                                Financiado
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500">
                              Compra: {new Date(vehicle.purchase_date).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              {vehicle.mileage.toLocaleString('pt-BR')} km
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              Depreciação: {vehicle.depreciation_rate}% a.a.
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-semibold text-lg text-gray-800">
                              R$ {Math.round(currentValue).toLocaleString('pt-BR')}
                            </p>
                            <p className="text-sm text-red-600">
                              -R$ {Math.round(depreciation).toLocaleString('pt-BR')} ({depreciationPercentage.toFixed(1)}%)
                            </p>
                            {vehicle.monthly_expenses > 0 && (
                              <p className="text-sm text-orange-600">
                                R$ {vehicle.monthly_expenses.toLocaleString('pt-BR')}/mês
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleEditVehicle(vehicle)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteVehicle(vehicle.id)}
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

      {/* Modal de adicionar veículo */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Novo Veículo</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddVehicle({
                type: formData.get('type') as any,
                brand: formData.get('brand') as string,
                model: formData.get('model') as string,
                year: Number(formData.get('year')),
                purchase_price: Number(formData.get('purchase_price')),
                current_value: Number(formData.get('current_value')) || null,
                mileage: Number(formData.get('mileage')),
                purchase_date: formData.get('purchase_date') as string,
                depreciation_rate: Number(formData.get('depreciation_rate')),
                monthly_expenses: Number(formData.get('monthly_expenses')),
                is_financed: formData.has('is_financed'),
              });
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select
                  name="type"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Tipo de Veículo</option>
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                
                <select
                  name="brand"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Marca</option>
                  {carBrands.map(brand => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="model"
                  placeholder="Modelo (ex: Civic, Gol)"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                
                <input
                  type="number"
                  name="year"
                  placeholder="Ano"
                  required
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  name="purchase_price"
                  placeholder="Preço de compra (R$)"
                  step="0.01"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                
                <input
                  type="number"
                  name="current_value"
                  placeholder="Valor atual (R$) - opcional"
                  step="0.01"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  name="mileage"
                  placeholder="Quilometragem"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                
                <input
                  type="number"
                  name="depreciation_rate"
                  placeholder="Taxa de depreciação (% a.a.)"
                  step="0.1"
                  defaultValue="10.0"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  name="monthly_expenses"
                  placeholder="Gastos mensais (R$)"
                  step="0.01"
                  defaultValue="0"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de compra</label>
                  <input
                    type="date"
                    name="purchase_date"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="is_financed" className="rounded text-blue-600" />
                <span className="text-gray-700">Veículo financiado</span>
              </label>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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