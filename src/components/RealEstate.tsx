import React, { useState, useEffect } from 'react';
import { Home, Plus, Edit, Trash2, TrendingUp, DollarSign, Calendar, Building } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RealEstateProperty {
  id: string;
  user_id: string;
  type: string;
  address: string;
  purchase_price: number;
  current_value: number | null;
  monthly_rent: number | null;
  expenses: number;
  purchase_date: string;
  is_rented: boolean;
  dividend_yield: number | null;
  tax_rate: number | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  type: string;
  address: string;
  purchase_price: string;
  current_value: string;
  monthly_rent: string;
  expenses: string;
  purchase_date: string;
  is_rented: boolean;
  dividend_yield: string;
  tax_rate: string;
}

const initialFormData: FormData = {
  type: 'residencial',
  address: '',
  purchase_price: '',
  current_value: '',
  monthly_rent: '',
  expenses: '0',
  purchase_date: '',
  is_rented: false,
  dividend_yield: '',
  tax_rate: ''
};

const RealEstate: React.FC = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<RealEstateProperty[]>([]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RealEstateProperty | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  const fetchProperties = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('real_estate')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const propertyData = {
        user_id: user.id,
        type: formData.type,
        address: formData.address,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
        expenses: parseFloat(formData.expenses) || 0,
        purchase_date: formData.purchase_date,
        is_rented: formData.is_rented,
        dividend_yield: formData.dividend_yield ? parseFloat(formData.dividend_yield) : null,
        tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) : null
      };

      if (editingProperty) {
        const { error } = await supabase
          .from('real_estate')
          .update(propertyData)
          .eq('id', editingProperty.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('real_estate')
          .insert([propertyData]);

        if (error) throw error;
      }

      setFormData(initialFormData);
      setIsModalOpen(false);
      setEditingProperty(null);
      fetchProperties();
    } catch (error) {
      console.error('Error saving property:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (property: RealEstateProperty) => {
    setFormData({
      type: property.type,
      address: property.address,
      purchase_price: property.purchase_price.toString(),
      current_value: property.current_value?.toString() || '',
      monthly_rent: property.monthly_rent?.toString() || '',
      expenses: property.expenses.toString(),
      purchase_date: property.purchase_date,
      is_rented: property.is_rented,
      dividend_yield: property.dividend_yield?.toString() || '',
      tax_rate: property.tax_rate?.toString() || ''
    });
    setEditingProperty(property);
    setIsModalOpen(true);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este imóvel?')) return;

    try {
      const { error } = await supabase
        .from('real_estate')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;
      fetchProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  };

  const calculateDividendYield = (monthlyRent: number | null, currentValue: number | null, purchasePrice: number) => {
    if (!monthlyRent || (!currentValue && !purchasePrice)) return null;
    const value = currentValue || purchasePrice;
    return ((monthlyRent * 12) / value) * 100;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const propertyTypes = [
    { value: 'residencial', label: 'Residencial' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'terreno', label: 'Terreno' },
    { value: 'fundo-imobiliario', label: 'Fundo Imobiliário' }
  ];

  const totalValue = properties.reduce((sum, property) => 
    sum + (property.current_value || property.purchase_price), 0
  );

  const totalMonthlyRent = properties.reduce((sum, property) => 
    sum + (property.monthly_rent || 0), 0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Imóveis</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie seus imóveis e acompanhe a valorização</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingProperty(null);
            setFormData(initialFormData);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm text-sm sm:text-base"
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar Imóvel</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-orange-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Total de Imóveis</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">{properties.length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Home className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
          </div>
        </div>

        <div className="bg-green-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Valor Total</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">{formatCurrency(totalValue)}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
          </div>
        </div>

        <div className="bg-blue-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Renda Mensal</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">{formatCurrency(totalMonthlyRent)}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Properties List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {properties.map((property) => {
          const displayYield = calculateDividendYield(
            property.monthly_rent,
            property.current_value,
            property.purchase_price
          );

          return (
            <div key={property.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium text-gray-600 capitalize">
                      {property.type.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(property)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(property.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  {property.address}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Preço de Compra:</span>
                    <span className="text-xs sm:text-sm font-medium">{formatCurrency(property.purchase_price)}</span>
                  </div>
                  
                  {property.current_value && (
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-gray-600">Valor Atual:</span>
                      <span className="text-xs sm:text-sm font-medium">{formatCurrency(property.current_value)}</span>
                    </div>
                  )}

                  {property.monthly_rent && (
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-gray-600">Aluguel Mensal:</span>
                      <span className="text-xs sm:text-sm font-medium">{formatCurrency(property.monthly_rent)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Despesas:</span>
                    <span className="text-xs sm:text-sm font-medium">{formatCurrency(property.expenses)}</span>
                  </div>
                </div>

                {displayYield && (
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <p className="text-xs sm:text-sm font-medium text-green-700">
                      Dividend Yield: {displayYield.toFixed(2)}% a.a.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-xs sm:text-sm text-gray-600">
                      {new Date(property.purchase_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  {property.is_rented && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Alugado
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {properties.length === 0 && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum imóvel cadastrado</h3>
          <p className="text-gray-600 mb-4">Comece adicionando seu primeiro imóvel</p>
          <button
            onClick={() => {
              setEditingProperty(null);
              setFormData(initialFormData);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Adicionar Imóvel
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {editingProperty ? 'Editar Imóvel' : 'Adicionar Imóvel'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProperty(null);
                    setFormData(initialFormData);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    required
                  >
                    {propertyTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço de Compra
                  </label>
                  <input
                    type="number"
                    name="purchase_price"
                    value={formData.purchase_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Atual
                  </label>
                  <input
                    type="number"
                    name="current_value"
                    value={formData.current_value}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aluguel Mensal
                  </label>
                  <input
                    type="number"
                    name="monthly_rent"
                    value={formData.monthly_rent}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Despesas Mensais
                  </label>
                  <input
                    type="number"
                    name="expenses"
                    value={formData.expenses}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Compra
                  </label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={formData.purchase_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taxa de Imposto (%)
                  </label>
                  <input
                    type="number"
                    name="tax_rate"
                    value={formData.tax_rate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_rented"
                    checked={formData.is_rented}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Imóvel alugado
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProperty(null);
                      setFormData(initialFormData);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors text-sm sm:text-base"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm text-sm sm:text-base"
                  >
                    {isLoading ? 'Salvando...' : (editingProperty ? 'Atualizar' : 'Adicionar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealEstate;