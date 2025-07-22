import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRangeSelectorProps {
  startDate?: string;
  endDate?: string;
  onRangeChange: (startDate: string, endDate: string) => void;
}

export default function DateRangeSelector({ 
  startDate: initialStartDate, 
  endDate: initialEndDate, 
  onRangeChange 
}: DateRangeSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRange, setSelectedRange] = useState('30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Sync com props externas
  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      setCustomStart(initialStartDate);
      setCustomEnd(initialEndDate);
      
      // Determinar qual range está selecionado comparando com os ranges padrão
      const detectedRange = detectRangeFromDates(initialStartDate, initialEndDate);
      setSelectedRange(detectedRange);
    }
  }, [initialStartDate, initialEndDate]);

  const detectRangeFromDates = (startDate: string, endDate: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Se a data final não for hoje, é personalizado
    if (endDate !== todayStr) {
      // Verificar se é mês passado
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      const lastMonthStart = lastMonth.toISOString().split('T')[0];
      const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];
      
      if (startDate === lastMonthStart && endDate === lastMonthEndStr) {
        return 'lastMonth';
      }
      
      return 'custom';
    }
    
    // Calcular diferença em dias
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Verificar ranges específicos
    const ranges = [
      { key: '7days', days: 7 },
      { key: '30days', days: 30 },
      { key: '90days', days: 90 },
      { key: '6months', days: 180 },
      { key: '1year', days: 365 }
    ];
    
    // Encontrar o range que mais se aproxima
    for (const range of ranges) {
      if (Math.abs(diffDays - range.days) <= 1) { // Tolerância de 1 dia
        return range.key;
      }
    }
    
    // Verificar se é este mês
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthStart = thisMonth.toISOString().split('T')[0];
    if (startDate === thisMonthStart) {
      return 'thisMonth';
    }
    
    // Verificar se é este ano
    const thisYear = new Date(today.getFullYear(), 0, 1);
    const thisYearStart = thisYear.toISOString().split('T')[0];
    if (startDate === thisYearStart) {
      return 'thisYear';
    }
    
    return 'custom';
  };

  const getDateRange = (range: string) => {
    const today = new Date();
    const start = new Date();
    
    switch (range) {
      case '7days':
        start.setDate(today.getDate() - 7);
        break;
      case '30days':
        start.setDate(today.getDate() - 30);
        break;
      case '90days':
        start.setDate(today.getDate() - 90);
        break;
      case '6months':
        start.setMonth(today.getMonth() - 6);
        break;
      case '1year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: lastMonth.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0]
        };
      case 'thisYear':
        start.setMonth(0, 1);
        break;
      default:
        return null;
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };

  const handleRangeSelect = (range: string) => {
    setSelectedRange(range);
    
    if (range === 'custom') {
      setShowDropdown(false);
      return;
    }
    
    const dateRange = getDateRange(range);
    if (dateRange) {
      setCustomStart(dateRange.start);
      setCustomEnd(dateRange.end);
      onRangeChange(dateRange.start, dateRange.end);
    }
    
    setShowDropdown(false);
  };

  const handleCustomDateChange = () => {
    if (customStart && customEnd) {
      onRangeChange(customStart, customEnd);
      setSelectedRange('custom');
      setShowDropdown(false);
    }
  };

  const getRangeLabel = (range: string) => {
    const labels = {
      '7days': 'Últimos 7 dias',
      '30days': 'Últimos 30 dias',
      '90days': 'Últimos 90 dias',
      '6months': 'Últimos 6 meses',
      '1year': 'Último ano',
      'thisMonth': 'Este mês',
      'lastMonth': 'Mês passado',
      'thisYear': 'Este ano',
      'custom': 'Personalizado'
    };
    return labels[range as keyof typeof labels] || 'Personalizado';
  };

  // Função para mostrar as datas quando for personalizado
  const getDisplayLabel = () => {
    if (selectedRange === 'custom' && customStart && customEnd) {
      const startFormatted = new Date(customStart).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
      const endFormatted = new Date(customEnd).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
      return `${startFormatted} - ${endFormatted}`;
    }
    return getRangeLabel(selectedRange);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-700">
          {getDisplayLabel()}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="p-3">
            <div className="space-y-1">
              {[
                { value: '7days', label: 'Últimos 7 dias' },
                { value: '30days', label: 'Últimos 30 dias' },
                { value: '90days', label: 'Últimos 90 dias' },
                { value: '6months', label: 'Últimos 6 meses' },
                { value: '1year', label: 'Último ano' },
                { value: 'thisMonth', label: 'Este mês' },
                { value: 'lastMonth', label: 'Mês passado' },
                { value: 'thisYear', label: 'Este ano' },
                { value: 'custom', label: 'Personalizado' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleRangeSelect(option.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                    selectedRange === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {selectedRange === 'custom' && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Data Final
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white text-black"
                    />
                  </div>
                  <button
                    onClick={handleCustomDateChange}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}