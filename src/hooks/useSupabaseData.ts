import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface DataFetchOptions {
  table: string;
  columns?: string;
  filter?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

export interface UseSupabaseDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (data: Partial<T>) => Promise<T | null>;
  update: (id: string, data: Partial<T>) => Promise<T | null>;
  delete: (id: string) => Promise<boolean>;
}

export function useSupabaseData<T = any>(options: DataFetchOptions): UseSupabaseDataResult<T> {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from(options.table)
        .select(options.columns || '*')
        .eq('user_id', user.id);

      // Apply additional filters
      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        });
      }

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: result, error } = await query;

      if (error) throw error;
      setData(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const create = async (newData: Partial<T>): Promise<T | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      const { data: result, error } = await supabase
        .from(options.table)
        .insert([{ ...newData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setData(prev => [result, ...prev]);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
      console.error('Error creating data:', err);
      return null;
    }
  };

  const update = async (id: string, updateData: Partial<T>): Promise<T | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      const { data: result, error } = await supabase
        .from(options.table)
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setData(prev => prev.map(item => 
        (item as any).id === id ? result : item
      ));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      console.error('Error updating data:', err);
      return null;
    }
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      const { error } = await supabase
        .from(options.table)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Update local state
      setData(prev => prev.filter(item => (item as any).id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      console.error('Error deleting data:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, options.table, JSON.stringify(options.filter)]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    create,
    update,
    delete: deleteItem
  };
}

// Aggregated hook for dashboard data
export function useDashboardData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add date range state
  const [dateRange, setDateRange] = useState<{start: string, end: string}>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Default to last 30 days
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });
  
  // Individual data hooks
  const incomeSources = useIncomeSources();
  const transactions = useTransactions();
  const investments = useInvestments();
  const realEstate = useRealEstate();
  const vehicles = useVehicles();
  const exoticAssets = useExoticAssets();
  const bills = useBills();
  const employees = useEmployees();
  const financialGoals = useFinancialGoals();
  
  // Retirement plans hook
  const retirementPlans = useSupabaseData<{
    id: string;
    type: string;
    name: string;
    company: string;
    monthly_contribution: number;
    total_contributed: number;
    expected_return: number;
    start_date: string;
    retirement_age: number;
  }>({
    table: 'retirement_plans',
    orderBy: { column: 'start_date', ascending: false }
  });
  
  // Loans hook
  const loans = useSupabaseData<{
    id: string;
    type: string;
    bank: string;
    amount: number;
    remaining_amount: number;
    interest_rate: number;
    monthly_payment: number;
    due_date: string;
    start_date: string;
    end_date: string;
  }>({
    table: 'loans',
    orderBy: { column: 'due_date', ascending: true }
  });
  
  // Bank accounts hook
  const bankAccounts = useSupabaseData<{
    id: string;
    bank_name: string;
    account_type: string;
    balance: number;
    last_updated: string;
  }>({
    table: 'bank_accounts',
    orderBy: { column: 'last_updated', ascending: false }
  });

  useEffect(() => {
    const allLoading = [
      incomeSources.loading,
      transactions.loading,
      investments.loading,
      realEstate.loading,
      vehicles.loading,
      exoticAssets.loading,
      bills.loading,
      employees.loading,
      financialGoals.loading,
      retirementPlans.loading,
      loans.loading,
      bankAccounts.loading
    ];
    
    const allErrors = [
      incomeSources.error,
      transactions.error,
      investments.error,
      realEstate.error,
      vehicles.error,
      exoticAssets.error,
      bills.error,
      employees.error,
      financialGoals.error,
      retirementPlans.error,
      loans.error,
      bankAccounts.error
    ].filter(Boolean);
    
    setLoading(allLoading.some(loading => loading));
    setError(allErrors.length > 0 ? allErrors[0] : null);
  }, [
    incomeSources.loading, incomeSources.error,
    transactions.loading, transactions.error,
    investments.loading, investments.error,
    realEstate.loading, realEstate.error,
    vehicles.loading, vehicles.error,
    exoticAssets.loading, exoticAssets.error,
    bills.loading, bills.error,
    employees.loading, employees.error,
    financialGoals.loading, financialGoals.error,
    retirementPlans.loading, retirementPlans.error,
    loans.loading, loans.error,
    bankAccounts.loading, bankAccounts.error
  ]);

  // Calculate aggregated values
  const totalMonthlyIncome = incomeSources.data
    .filter(source => source.is_active)
    .reduce((sum, source) => {
      try {
        const multiplier = source.frequency === 'monthly' ? 1 : 
                          source.frequency === 'weekly' ? 4.33 :
                          source.frequency === 'yearly' ? 1/12 : 1;
        return sum + (source.amount * multiplier);
      } catch (e) {
        console.error('Error calculating income:', e);
        return sum;
      }
    }, 0) + 
    // Add real estate rental income
    realEstate.data.reduce((sum, property) => {
      try {
        return sum + (property.is_rented ? (property.monthly_rent || 0) : 0);
      } catch (e) {
        console.error('Error calculating real estate income:', e);
        return sum;
      }
    }, 0) +
    // Add investment dividend income
    investments.data.reduce((sum, investment) => { 
      try {
        // Calculate monthly dividend income
        if (investment.dividend_yield && investment.quantity && investment.current_price) {
          const currentValue = investment.quantity * investment.current_price;
          return sum + ((currentValue * investment.dividend_yield) / 100 / 12);
        } else if (investment.monthly_income) {
          return sum + investment.monthly_income;
        }
        return sum;
      } catch (e) {
        console.error('Error calculating investment income:', e);
        return sum;
      }
    }, 0);

  // Calculate total monthly expenses by summing up all expense categories
  const expenseCategories = [
    { category: 'Utilidades', amount: 350 },
    { category: 'Empréstimos', amount: 300 },
    { category: 'Encargos Sociais', amount: 1482 },
    { category: 'Assinatura', amount: 300 },
    { category: 'Investimentos', amount: 3150 },
    { category: 'Previdência', amount: 5000 },
    { category: 'Veículos', amount: 1000 },
    { category: 'Impostos', amount: 285.625 },
    { category: 'Funcionários', amount: 3000 },
    { category: 'Metas Financeiras', amount: 300 }
  ];
  
  // For display in the dashboard, we'll use a fixed value to match the UI
  const totalMonthlyExpenses = bills.data
    .filter(bill => bill.is_active && bill.payment_status !== 'paid')
    .reduce((sum, bill) => {
      try {
        return sum + (bill.amount || 0);
      } catch (e) {
        console.error('Error calculating bill expenses:', e);
        return sum;
      }
    }, 0) +
    loans.data.reduce((sum, loan) => {
      try {
        return sum + (loan.monthly_payment || 0);
      } catch (e) {
        console.error('Error calculating loan expenses:', e);
        return sum;
      }
    }, 0) +
    employees.data.filter(emp => emp.status !== 'terminated')
      .reduce((sum, emp) => {
        try {
          return sum + emp.salary + 
            (emp.salary * (emp.fgts_percentage || 0) / 100) + 
            (emp.salary * (emp.inss_percentage || 0) / 100) + 
            (emp.salary * (emp.irrf_percentage || 0) / 100) + 
            (emp.other_benefits || 0);
        } catch (e) {
          console.error('Error calculating employee expenses:', e);
          return sum;
        }
      }, 0) +
    vehicles.data.reduce((sum, vehicle) => {
      try {
        return sum + (vehicle.monthly_expenses || 0);
      } catch (e) {
        console.error('Error calculating vehicle expenses:', e);
        return sum;
      }
    }, 0) +
    realEstate.data.reduce((sum, property) => {
      try {
        return sum + (property.expenses || 0);
      } catch (e) {
        console.error('Error calculating real estate expenses:', e);
        return sum;
      }
    }, 0);
  
  // Calculate the total of all expense categories for internal calculations
  const totalAllExpenses = totalMonthlyExpenses;

  const netMonthlyIncome = totalMonthlyIncome - totalMonthlyExpenses;

  const totalInvestmentValue = investments.data.reduce((sum, inv) => {
    try {
      if (inv.quantity && inv.current_price) {
        return sum + (inv.quantity * inv.current_price);
      }
      return sum + (inv.amount || 0);
    } catch (e) {
      console.error('Error calculating investment value:', e);
      return sum;
    }
  }, 0);
  
  const totalInvestmentIncome = investments.data.reduce((sum, inv) => {
    try {
      if (inv.dividend_yield && inv.quantity && inv.current_price) {
        const currentValue = inv.quantity * inv.current_price;
        return sum + ((currentValue * inv.dividend_yield) / 100 / 12);
      } else if (inv.monthly_income) {
        return sum + inv.monthly_income;
      }
      return sum;
    } catch (e) {
      console.error('Error calculating investment income:', e);
      return sum;
    }
  }, 0);

  const totalRealEstateValue = realEstate.data.reduce((sum, prop) => {
    try {
      return sum + (prop.current_value || prop.purchase_price || 0);
    } catch (e) {
      console.error('Error calculating real estate value:', e);
      return sum;
    }
  }, 0);
  
  const totalRealEstateIncome = realEstate.data.reduce((sum, prop) => {
    try {
      return sum + (prop.is_rented ? (prop.monthly_rent || 0) : 0);
    } catch (e) {
      console.error('Error calculating real estate income:', e);
      return sum;
    }
  }, 0);
  
  const totalRealEstateExpenses = realEstate.data.reduce((sum, prop) => {
    try {
      return sum + (prop.expenses || 0);
    } catch (e) {
      console.error('Error calculating real estate expenses:', e);
      return sum;
    }
  }, 0);

  const totalRetirementSaved = retirementPlans.data.reduce((sum, plan) => {
    try {
      return sum + (plan.total_contributed || 0);
    } catch (e) {
      console.error('Error calculating retirement savings:', e);
      return sum;
    }
  }, 0);
  
  const totalRetirementContribution = retirementPlans.data.reduce((sum, plan) => {
    try {
      return sum + (plan.monthly_contribution || 0);
    } catch (e) {
      console.error('Error calculating retirement contributions:', e);
      return sum;
    }
  }, 0);

  const totalDebt = loans.data.reduce((sum, loan) => {
    try {
      return sum + (loan.remaining_amount || 0);
    } catch (e) {
      console.error('Error calculating debt:', e);
      return sum;
    }
  }, 0);
  
  const totalLoanPayments = loans.data.reduce((sum, loan) => {
    try {
      return sum + (loan.monthly_payment || 0);
    } catch (e) {
      console.error('Error calculating loan payments:', e);
      return sum;
    }
  }, 0);

  const totalBills = bills.data
    .filter(bill => bill.is_active && bill.payment_status !== 'paid')
    .reduce((sum, bill) => {
      try {
        return sum + (bill.amount || 0);
      } catch (e) {
        console.error('Error calculating bills total:', e);
        return sum;
      }
    }, 0);

  const totalBankBalance = bankAccounts.data.reduce((sum, account) => {
    try {
      return sum + (account.balance || 0);
    } catch (e) {
      console.error('Error calculating bank balance:', e);
      return sum;
    }
  }, 0);

  const totalVehicleValue = vehicles.data.reduce((sum, vehicle) => {
    try {
      return sum + (vehicle.current_value || vehicle.purchase_price || 0);
    } catch (e) {
      console.error('Error calculating vehicle value:', e);
      return sum;
    }
  }, 0);
  
  const totalVehicleDepreciation = vehicles.data.reduce((sum, vehicle) => {
    try {
      const monthsSincePurchase = Math.max(1, Math.floor((Date.now() - new Date(vehicle.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 30)));
      return sum + (vehicle.purchase_price * (vehicle.depreciation_rate / 100) * monthsSincePurchase / 12);
    } catch (e) {
      console.error('Error calculating vehicle depreciation:', e);
      return sum;
    }
  }, 0);
  
  const totalVehicleExpenses = vehicles.data.reduce((sum, vehicle) => {
    try {
      return sum + (vehicle.monthly_expenses || 0);
    } catch (e) {
      console.error('Error calculating vehicle expenses:', e);
      return sum;
    }
  }, 0);

  const totalExoticAssetsValue = exoticAssets.data.reduce((sum, asset) => {
    try {
      return sum + (asset.current_value || asset.purchase_price || 0);
    } catch (e) {
      console.error('Error calculating exotic assets value:', e);
      return sum;
    }
  }, 0);
  
  const totalExoticAssetsAppreciation = exoticAssets.data.reduce((sum, asset) => {
    try {
      return sum + ((asset.current_value || asset.purchase_price || 0) - (asset.purchase_price || 0));
    } catch (e) {
      console.error('Error calculating exotic assets appreciation:', e);
      return sum;
    }
  }, 0);

  // Calculate returns and depreciation percentages
  const investmentReturn = totalInvestmentValue > 0 ? 12.5 : 0; // Placeholder value
  const realEstateReturn = totalRealEstateValue > 0 ? 8.2 : 0; // Placeholder value
  const vehicleDepreciation = totalVehicleValue > 0 ? -10.3 : 0; // Placeholder value
  const exoticAssetsReturn = totalExoticAssetsValue > 0 ? 15.7 : 0; // Placeholder value
  
  // Calculate fixed income and other income
  const fixedIncomeReturn = investments.data.filter(inv => inv.type === 'renda-fixa')
    .reduce((sum, inv) => { 
      try {
        if (inv.interest_rate && inv.amount) {
          return sum + ((inv.amount * (inv.interest_rate || 0)) / 100 / 12);
        }
        return sum + (inv.monthly_income || 0);
      } catch (e) {
        console.error('Error calculating fixed income return:', e);
        return sum;
      }
    }, 0); 
    
  const otherIncome = totalMonthlyIncome - totalInvestmentIncome - totalRealEstateIncome - fixedIncomeReturn;

  const totalFinancialGoals = financialGoals.data.filter(goal => goal.status === 'active')
    .reduce((sum, goal) => {
      try {
        return sum + (goal.current_amount || 0);
      } catch (e) {
        console.error('Error calculating financial goals total:', e);
        return sum;
      }
    }, 0); // Only count current amount, not target amount

  const totalAssets = totalInvestmentValue + totalRealEstateValue + totalRetirementSaved + 
                     totalBankBalance + totalVehicleValue + totalExoticAssetsValue + 
                     totalFinancialGoals; // Include financial goals in assets
  
  const netWorth = totalAssets - totalDebt;

  // Calculate taxes based on registered tax rates
  const totalTaxes = 
    // Income source taxes
    incomeSources.data.filter(source => source.is_active && source.tax_rate)
      .reduce((sum, source) => { 
        try {
          const monthlyAmount = source.frequency === 'monthly' ? source.amount : 
                               source.frequency === 'weekly' ? source.amount * 4.33 :
                               source.frequency === 'yearly' ? source.amount / 12 : 0;
          return sum + (monthlyAmount * ((source.tax_rate || 0) / 100));
        } catch (e) {
          console.error('Error calculating income source taxes:', e);
          return sum;
        }
      }, 0) +
    // Investment taxes
    investments.data.filter(inv => inv.tax_rate)
      .reduce((sum, inv) => { 
        try {
          let monthlyIncome = 0;
          if (inv.dividend_yield && inv.quantity && inv.current_price) {
            const currentValue = inv.quantity * inv.current_price;
            monthlyIncome = (currentValue * (inv.dividend_yield || 0)) / 100 / 12;
          } else if (inv.monthly_income) {
            monthlyIncome = inv.monthly_income;
          }
          return sum + (monthlyIncome * ((inv.tax_rate || 0) / 100));
        } catch (e) {
          console.error('Error calculating investment taxes:', e);
          return sum;
        }
      }, 0) +
    // Real estate rental taxes
    realEstate.data.filter(prop => prop.is_rented && prop.monthly_rent && prop.tax_rate)
      .reduce((sum, prop) => {
        try {
          return sum + ((prop.monthly_rent || 0) * ((prop.tax_rate || 0) / 100));
        } catch (e) {
          console.error('Error calculating real estate taxes:', e);
          return sum;
        }
      }, 0);

  return {
    totalMonthlyIncome,
    totalMonthlyExpenses,
    netMonthlyIncome,
    totalInvestmentValue,
    totalInvestmentIncome,
    totalRealEstateValue,
    totalRealEstateIncome,
    totalRealEstateExpenses,
    totalRetirementSaved,
    totalRetirementContribution,
    totalDebt,
    totalLoanPayments,
    totalBills,
    totalBankBalance,
    totalVehicleValue,
    totalVehicleDepreciation,
    totalVehicleExpenses,
    totalExoticAssetsValue,
    totalExoticAssetsAppreciation,
    totalFinancialGoals,
    investmentReturn,
    realEstateReturn,
    vehicleDepreciation,
    exoticAssetsReturn,
    fixedIncomeReturn,
    otherIncome,
    totalAssets,
    netWorth,
    totalTaxes,
    loading,
    error,
    setDateRange
  };
}

// Specific hooks for common tables
export function useIncomeSources() {
  return useSupabaseData<{
    id: string;
    name: string;
    amount: number;
    frequency: string;
    category: string;
    next_payment: string;
    is_active: boolean;
    tax_rate: number;
  }>({
    table: 'income_sources',
    orderBy: { column: 'created_at', ascending: false }
  });
}

export function useTransactions() {
  return useSupabaseData<{
    id: string;
    type: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    is_recurring: boolean;
    tax_rate: number;
  }>({
    table: 'transactions',
    orderBy: { column: 'date', ascending: false }
  });
}

export function useInvestments() {
  return useSupabaseData<{
    id: string;
    type: string;
    name: string;
    broker: string;
    amount: number;
    purchase_price: number;
    current_price: number;
    interest_rate: number;
    monthly_income: number;
    purchase_date: string;
    maturity_date: string;
    dividend_yield: number;
    quantity: number;
    tax_rate: number;
  }>({
    table: 'investments',
    orderBy: { column: 'purchase_date', ascending: false }
  });
}

export function useRealEstate() {
  return useSupabaseData<{
    id: string;
    type: string;
    address: string;
    purchase_price: number;
    current_value: number;
    monthly_rent: number;
    expenses: number;
    purchase_date: string;
    is_rented: boolean;
    dividend_yield: number;
    tax_rate: number;
  }>({
    table: 'real_estate',
    orderBy: { column: 'purchase_date', ascending: false }
  });
}

export function useVehicles() {
  return useSupabaseData<{
    id: string;
    type: string;
    brand: string;
    model: string;
    year: number;
    purchase_price: number;
    current_value: number;
    mileage: number;
    purchase_date: string;
    depreciation_rate: number;
    monthly_expenses: number;
    is_financed: boolean;
  }>({
    table: 'vehicles',
    orderBy: { column: 'purchase_date', ascending: false }
  });
}

export function useExoticAssets() {
  return useSupabaseData<{
    id: string;
    name: string;
    category: string;
    custom_tags: string[];
    purchase_price: number;
    current_value: number;
    purchase_date: string;
    condition: string;
    description: string;
    location: string;
    insurance_value: number;
  }>({
    table: 'exotic_assets',
    orderBy: { column: 'purchase_date', ascending: false }
  });
}

export function useBills() {
  return useSupabaseData<{
    id: string;
    name: string;
    company: string;
    amount: number;
    due_day: number;
    category: string;
    is_recurring: boolean;
    is_active: boolean;
    last_paid: string;
    next_due: string;
    payment_status: string;
    payment_date: string;
    payment_amount: number;
    payment_method: string;
    send_email_reminder: boolean;
    reminder_days_before: number;
  }>({
    table: 'bills',
    orderBy: { column: 'next_due', ascending: true }
  });
}

export function useEmployees() {
  return useSupabaseData<{
    id: string;
    name: string;
    role: string;
    salary: number;
    hiring_date: string;
    document_number: string;
    document_type: string;
    address: string;
    phone: string;
    email: string;
    status: string;
    vacation_start: string;
    vacation_end: string;
    last_vacation: string;
    next_vacation: string;
    fgts_percentage: number;
    inss_percentage: number;
    irrf_percentage: number;
    other_benefits: number;
  }>({
    table: 'employees',
    orderBy: { column: 'hiring_date', ascending: false }
  });
}

export function useFinancialGoals() {
  const result = useSupabaseData<{
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string;
    category: string;
    description: string;
    status: string;
    priority: string;
  }>({
    table: 'financial_goals',
    orderBy: { column: 'target_date', ascending: true }
  });
  
  return {
    ...result,
    goals: result.data
  };
}

export function useAlerts() {
  return useSupabaseData<{
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
    priority: string;
    is_read: boolean;
    related_id: string;
    related_entity: string;
    action_path: string;
    action_label: string;
    expires_at: string;
  }>({
    table: 'alerts',
    orderBy: { column: 'date', ascending: false }
  });
}