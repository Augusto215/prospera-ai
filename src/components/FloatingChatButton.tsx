import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, AlertTriangle } from 'lucide-react';
import { ChatMessage } from '../types';
import OpenAIService from '../lib/openai';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useSupabaseData';
import { supabase } from '../lib/supabase';

const quickSuggestions = [
  "Analisar minhas metas financeiras",
  "Analisar meus gastos",
  "Traçar planos com a IA",
  "Como posso economizar mais dinheiro?",
  "Qual o melhor investimento para mim?",
  "Como organizar minha previdência?",
  "Devo quitar minhas dívidas primeiro?",
  "Como diversificar meus investimentos?"
];

// Função para processar markdown simples
const parseMarkdown = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **texto** -> <strong>texto</strong>
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // *texto* -> <em>texto</em>
    .replace(/•/g, '•') // Manter bullets
    .replace(/\n/g, '<br/>'); // Quebras de linha
};

// Componente para renderizar texto com markdown
const MarkdownText = ({ children }: { children: string }) => {
  return (
    <div 
      className="text-xs leading-relaxed"
      dangerouslySetInnerHTML={{ 
        __html: parseMarkdown(children) 
      }}
    />
  );
};

export default function FloatingChatButton() {
  const { user } = useAuth();
  const dashboardData = useDashboardData();
  const [isOpen, setIsOpen] = useState(false);
  const [userFinancialData, setUserFinancialData] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: '👋 Olá! Sou sua assistente financeira IA. Como posso ajudá-lo a melhorar suas finanças hoje?',
      timestamp: new Date().toISOString(),
      suggestions: quickSuggestions.slice(0, 3)
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const openaiService = useRef<OpenAIService | null>(null);

  // Buscar dados financeiros detalhados do usuário
  // Buscar dados financeiros detalhados do usuário
  useEffect(() => {
    if (user && isOpen) {
      fetchComprehensiveUserData();
    }
  }, [user, isOpen]);

  const fetchComprehensiveUserData = async () => {
    if (!user?.id) return;

    try {
      // Buscar TODOS os dados financeiros disponíveis do usuário
      const [
        incomeResult,
        expensesResult,
        investmentsResult,
        realEstateResult,
        vehiclesResult,
        exoticAssetsResult,
        debtsResult,
        goalsResult,
        billsResult,
        retirementResult,
        bankAccountsResult,
        transactionsResult
      ] = await Promise.all([
        supabase.from('income_sources').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('expenses').select('*').eq('user_id', user.id),
        supabase.from('investments').select('*').eq('user_id', user.id),
        supabase.from('real_estate').select('*').eq('user_id', user.id),
        supabase.from('vehicles').select('*').eq('user_id', user.id),
        supabase.from('exotic_assets').select('*').eq('user_id', user.id),
        supabase.from('loans').select('*').eq('user_id', user.id),
        supabase.from('financial_goals').select('*').eq('user_id', user.id),
        supabase.from('bills').select('*').eq('user_id', user.id),
        supabase.from('retirement_plans').select('*').eq('user_id', user.id),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(20)
      ]);

      // Calcular receitas mensais detalhadas
      const incomeData = (incomeResult.data || []).map(item => {
        let monthlyAmount = item.amount;
        switch (item.frequency) {
          case 'weekly': monthlyAmount = item.amount * 4.33; break;
          case 'yearly': monthlyAmount = item.amount / 12; break;
          case 'one-time': monthlyAmount = item.amount; break;
        }
        return { ...item, monthlyAmount };
      });
      const totalIncome = incomeData.reduce((sum, item) => sum + item.monthlyAmount, 0);

      // Calcular despesas mensais detalhadas
      const expenseData = (expensesResult.data || []).map(item => {
        let monthlyAmount = item.amount;
        switch (item.frequency) {
          case 'weekly': monthlyAmount = item.amount * 4.33; break;
          case 'yearly': monthlyAmount = item.amount / 12; break;
          case 'one-time': monthlyAmount = item.amount; break;
        }
        return { ...item, monthlyAmount };
      });
      const totalExpenses = expenseData.reduce((sum, item) => sum + item.monthlyAmount, 0);

      // Calcular investimentos detalhadamente
      const investmentData = (investmentsResult.data || []).map(inv => {
        let currentValue;
        if (inv.quantity && inv.current_price) {
          currentValue = inv.quantity * inv.current_price;
        } else {
          currentValue = inv.current_value || inv.amount || 0;
        }
        
        let monthlyIncome = 0;
        if (inv.dividend_yield && currentValue) {
          monthlyIncome = (currentValue * inv.dividend_yield / 100) / 12;
        } else if (inv.monthly_income) {
          monthlyIncome = inv.monthly_income;
        }

        return {
          ...inv,
          currentValue,
          monthlyIncome,
          profit: currentValue - (inv.amount || 0)
        };
      });
      const totalInvestmentValue = investmentData.reduce((sum, inv) => sum + inv.currentValue, 0);
      const totalInvestmentIncome = investmentData.reduce((sum, inv) => sum + inv.monthlyIncome, 0);
      const totalInvestmentProfit = investmentData.reduce((sum, inv) => sum + inv.profit, 0);

      // Calcular imóveis detalhadamente
      const realEstateData = (realEstateResult.data || []).map(property => {
        const currentValue = property.current_value || property.purchase_price || 0;
        const monthlyIncome = property.rental_income || 0;
        const monthlyExpenses = property.monthly_expenses || 0;
        const netIncome = monthlyIncome - monthlyExpenses;
        const appreciation = currentValue - (property.purchase_price || 0);
        
        return {
          ...property,
          currentValue,
          monthlyIncome,
          monthlyExpenses,
          netIncome,
          appreciation
        };
      });
      const totalRealEstateValue = realEstateData.reduce((sum, prop) => sum + prop.currentValue, 0);
      const totalRealEstateIncome = realEstateData.reduce((sum, prop) => sum + prop.netIncome, 0);

      // Calcular veículos
      const vehicleData = (vehiclesResult.data || []).map(vehicle => ({
        ...vehicle,
        currentValue: vehicle.current_value || vehicle.purchase_price || 0,
        monthlyExpenses: vehicle.monthly_expenses || 0,
        depreciation: (vehicle.purchase_price || 0) - (vehicle.current_value || 0)
      }));
      const totalVehicleValue = vehicleData.reduce((sum, v) => sum + v.currentValue, 0);
      const totalVehicleExpenses = vehicleData.reduce((sum, v) => sum + v.monthlyExpenses, 0);

      // Calcular ativos exóticos
      const exoticData = (exoticAssetsResult.data || []).map(asset => ({
        ...asset,
        currentValue: asset.current_value || asset.purchase_price || 0,
        appreciation: (asset.current_value || 0) - (asset.purchase_price || 0)
      }));
      const totalExoticValue = exoticData.reduce((sum, asset) => sum + asset.currentValue, 0);

      // Calcular dívidas
      const debtData = (debtsResult.data || []).map(debt => ({
        ...debt,
        remainingAmount: debt.remaining_amount || debt.amount || 0,
        monthlyPayment: debt.monthly_payment || 0
      }));
      const totalDebt = debtData.reduce((sum, debt) => sum + debt.remainingAmount, 0);
      const totalDebtPayments = debtData.reduce((sum, debt) => sum + debt.monthlyPayment, 0);

      // Calcular previdência
      const retirementData = (retirementResult.data || []).map(plan => ({
        ...plan,
        currentBalance: plan.current_balance || 0,
        monthlyContribution: plan.monthly_contribution || 0
      }));
      const totalRetirementSaved = retirementData.reduce((sum, plan) => sum + plan.currentBalance, 0);
      const totalRetirementContribution = retirementData.reduce((sum, plan) => sum + plan.monthlyContribution, 0);

      // Calcular contas
      const billData = (billsResult.data || []).filter(bill => bill.is_active).map(bill => ({
        ...bill,
        monthlyAmount: bill.amount || 0
      }));
      const totalBills = billData.reduce((sum, bill) => sum + bill.monthlyAmount, 0);

      // Calcular metas financeiras
      const goalData = (goalsResult.data || []).map(goal => ({
        ...goal,
        progress: goal.current_amount / goal.target_amount * 100,
        remaining: goal.target_amount - goal.current_amount
      }));
      const totalGoalsSaved = goalData.reduce((sum, goal) => sum + goal.current_amount, 0);

      // Categorias e tipos detalhados
      const incomeCategories = [...new Set(incomeData.map(item => item.category))];
      const expenseCategories = [...new Set(expenseData.map(item => item.category))];
      const investmentTypes = [...new Set(investmentData.map(item => item.type))];
      const propertyTypes = [...new Set(realEstateData.map(item => item.property_type))];
      const vehicleTypes = [...new Set(vehicleData.map(item => item.type))];
      const exoticTypes = [...new Set(exoticData.map(item => item.type))];

      // Cálculos financeiros avançados
      const totalAssets = totalInvestmentValue + totalRealEstateValue + totalVehicleValue + totalExoticValue + totalRetirementSaved;
      const netWorth = totalAssets - totalDebt;
      const totalMonthlyIncome = totalIncome + totalInvestmentIncome + totalRealEstateIncome;
      const totalMonthlyExpenses = totalExpenses + totalVehicleExpenses + totalDebtPayments + totalBills + totalRetirementContribution;
      const netMonthlyIncome = totalMonthlyIncome - totalMonthlyExpenses;

      // Ratios e métricas importantes
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;
      const debtToIncomeRatio = totalIncome > 0 ? (totalDebt / (totalIncome * 12) * 100) : 0;
      const investmentToIncomeRatio = totalIncome > 0 ? (totalInvestmentValue / (totalIncome * 12) * 100) : 0;
      const emergencyFundMonths = totalIncome > 0 ? (totalInvestmentValue / totalMonthlyExpenses) : 0;

      // Montar objeto completo com TODOS os dados
      const comprehensiveFinancialData = {
        // Dados básicos
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        netIncome: Math.round(totalIncome - totalExpenses),
        totalMonthlyIncome: Math.round(totalMonthlyIncome),
        totalMonthlyExpenses: Math.round(totalMonthlyExpenses),
        netMonthlyIncome: Math.round(netMonthlyIncome),

        // Investimentos detalhados
        totalInvestmentValue: Math.round(totalInvestmentValue),
        totalInvestmentIncome: Math.round(totalInvestmentIncome),
        totalInvestmentProfit: Math.round(totalInvestmentProfit),
        investmentCount: investmentData.length,
        investmentTypes,
        investments: investmentData,

        // Imóveis detalhados
        totalRealEstateValue: Math.round(totalRealEstateValue),
        totalRealEstateIncome: Math.round(totalRealEstateIncome),
        propertyCount: realEstateData.length,
        propertyTypes,
        properties: realEstateData,

        // Veículos
        totalVehicleValue: Math.round(totalVehicleValue),
        totalVehicleExpenses: Math.round(totalVehicleExpenses),
        vehicleCount: vehicleData.length,
        vehicleTypes,
        vehicles: vehicleData,

        // Ativos exóticos
        totalExoticValue: Math.round(totalExoticValue),
        exoticCount: exoticData.length,
        exoticTypes,
        exoticAssets: exoticData,

        // Dívidas e obrigações
        totalDebt: Math.round(totalDebt),
        totalDebtPayments: Math.round(totalDebtPayments),
        totalBills: Math.round(totalBills),
        debtCount: debtData.length,
        billCount: billData.length,
        debts: debtData,
        bills: billData,

        // Previdência
        totalRetirementSaved: Math.round(totalRetirementSaved),
        totalRetirementContribution: Math.round(totalRetirementContribution),
        retirementPlans: retirementData,

        // Metas financeiras
        totalGoalsSaved: Math.round(totalGoalsSaved),
        goalCount: goalData.length,
        goals: goalData,

        // Patrimônio e métricas
        totalAssets: Math.round(totalAssets),
        netWorth: Math.round(netWorth),
        
        // Categorias
        incomeCategories,
        expenseCategories,
        
        // Ratios e análises
        savingsRate: Math.round(savingsRate * 100) / 100,
        debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
        investmentToIncomeRatio: Math.round(investmentToIncomeRatio * 100) / 100,
        emergencyFundMonths: Math.round(emergencyFundMonths * 100) / 100,

        // Dados contextuais
        bankAccountCount: (bankAccountsResult.data || []).length,
        recentTransactions: (transactionsResult.data || []).slice(0, 10),
        
        // Status e perfil do usuário
        hasInvestments: investmentData.length > 0,
        hasRealEstate: realEstateData.length > 0,
        hasVehicles: vehicleData.length > 0,
        hasDebts: debtData.length > 0,
        hasGoals: goalData.length > 0,
        hasRetirementPlans: retirementData.length > 0,
        
        // Análise de perfil financeiro
        isInvestor: totalInvestmentValue > 10000,
        isPropertyOwner: realEstateData.length > 0,
        isDebtFree: totalDebt === 0,
        hasPositiveCashFlow: netMonthlyIncome > 0,
        hasEmergencyFund: emergencyFundMonths >= 3,
        isDiversified: investmentTypes.length >= 3
      };

      setUserFinancialData(comprehensiveFinancialData);

    } catch (error) {
      console.error('Erro ao buscar dados financeiros completos:', error);
    }
  };

  const generateContextualGreeting = (data: any) => {
    let greeting = '👋 **Olá! Analisei seu perfil financeiro.**\n\n';
    
    // Resumo rápido
    greeting += `📊 **Seu panorama:**\n`;
    greeting += `• Renda mensal: R$ ${data.income.toLocaleString('pt-BR')}\n`;
    greeting += `• Gastos mensais: R$ ${data.expenses.toLocaleString('pt-BR')}\n`;
    greeting += `• Saldo mensal: R$ ${data.netIncome.toLocaleString('pt-BR')}\n`;
    if (data.investmentValue > 0) {
      greeting += `• Investimentos: R$ ${data.investmentValue.toLocaleString('pt-BR')}\n`;
    }
    if (data.totalDebt > 0) {
      greeting += `• Dívidas: R$ ${data.totalDebt.toLocaleString('pt-BR')}\n`;
    }
    greeting += '\n';

    // Análise personalizada
    if (data.savingsRate < 10) {
      greeting += '⚠️ **Atenção**: Taxa de poupança baixa. Vamos melhorar isso!\n\n';
    } else if (data.savingsRate > 20) {
      greeting += '🎉 **Parabéns**: Excelente taxa de poupança!\n\n';
    }

    if (data.debtToIncomeRatio > 30) {
      greeting += '🔴 **Prioridade**: Reduzir dívidas (alto endividamento).\n\n';
    }

    greeting += '💡 **Como posso ajudar você hoje?**';

    return greeting;
  };

  const generatePersonalizedSuggestions = (data: any) => {
    const suggestions = [];

    if (data.savingsRate < 10) {
      suggestions.push("Como aumentar minha taxa de poupança?");
    }
    
    if (data.totalDebt > 0) {
      suggestions.push("Estratégia para quitar minhas dívidas");
    }
    
    if (data.investmentValue === 0) {
      suggestions.push("Como começar a investir com minha renda?");
    } else {
      suggestions.push("Como diversificar meus investimentos?");
    }

    if (data.goals.length === 0) {
      suggestions.push("Ajude-me a definir metas financeiras");
    }

    if (data.netIncome > 0) {
      suggestions.push("Como otimizar meu orçamento?");
    }

    return suggestions.slice(0, 3);
  };

  // Inicializar OpenAI Service
  const initOpenAI = () => {
    if (!openaiService.current) {
      try {
        openaiService.current = new OpenAIService();
        console.log('✅ OpenAI Service inicializado no FloatingChat');
      } catch (err) {
        console.error('❌ Erro ao inicializar OpenAI no FloatingChat:', err);
        setError('Erro ao conectar com IA');
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Inicializar OpenAI se necessário
    if (!openaiService.current) {
      initOpenAI();
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setError('');

    try {
      let response;
      
      if (openaiService.current) {
        // Passar dados financeiros para a IA
        response = await openaiService.current.generateFinancialAdvice(content, userFinancialData);
      } else {
        throw new Error('OpenAI service não disponível');
      }

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.content,
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions || quickSuggestions.slice(0, 3)
      };

      setMessages(prev => [...prev, aiResponse]);
      
      // Mostrar feedback visual se foi fallback
      if (!response.success) {
        setError('⚠️ Usando respostas locais (OpenAI indisponível)');
      }

    } catch (error) {
      console.error('Erro no chat:', error);
      setError('Erro na IA - usando modo local');
      
      // Fallback com respostas personalizadas
      const fallbackResponse = generatePersonalizedFallback(content, userFinancialData);

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: fallbackResponse,
        timestamp: new Date().toISOString(),
        suggestions: userFinancialData ? generatePersonalizedSuggestions(userFinancialData) : quickSuggestions.slice(0, 3)
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const generatePersonalizedFallback = (message: string, userData: any) => {
    if (!userData) {
      return `💰 **Resposta padrão sobre finanças:**

Para te ajudar melhor, preciso conhecer seu perfil financeiro. 
Que tal compartilhar sua situação atual?

🎯 **Posso ajudar com:**
• Planejamento orçamentário
• Estratégias de investimento
• Quitação de dívidas
• Metas financeiras`;
    }

    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('economizar') || lowerMessage.includes('poupan')) {
      return `💰 **Estratégias personalizadas para você:**

Com sua renda de R$ ${userData.income.toLocaleString('pt-BR')} e gastos de R$ ${userData.expenses.toLocaleString('pt-BR')}:

• **Meta**: Aumentar sua taxa de poupança atual de ${userData.savingsRate.toFixed(1)}%
• **Corte gastos**: Revise categorias de maior impacto
• **Aumente renda**: ${userData.incomeCategories.length} fontes ativas, considere diversificar
• **Automatize**: Configure transferência automática para poupança

🎯 **Sugestão**: Tente poupar pelo menos 20% da renda mensal.`;
    }
    
    if (lowerMessage.includes('investir') || lowerMessage.includes('investimento')) {
      const hasInvestments = userData.investmentValue > 0;
      
      if (hasInvestments) {
        return `📈 **Análise dos seus investimentos:**

Você já tem R$ ${userData.investmentValue.toLocaleString('pt-BR')} investidos.
Tipos atuais: ${userData.investmentTypes.join(', ')}

• **Diversificação**: Considere balancear renda fixa/variável
• **Aportes**: Com sobra de R$ ${userData.netIncome.toLocaleString('pt-BR')}/mês, pode aumentar
• **Revisão**: Analise performance dos investimentos atuais
• **Objetivos**: Alinhe investimentos com suas metas

🚀 **Dica**: Mantenha disciplina nos aportes mensais.`;
      } else {
        return `📈 **Primeiro passo nos investimentos:**

Com renda de R$ ${userData.income.toLocaleString('pt-BR')} e sobra de R$ ${userData.netIncome.toLocaleString('pt-BR')}:

• **Reserva primeiro**: 6 meses de gastos (R$ ${(userData.expenses * 6).toLocaleString('pt-BR')})
• **Comece pequeno**: R$ 100-500/mês já faz diferença
• **Renda fixa**: CDB, Tesouro Direto para começar
• **Educação**: Estude antes de partir para ações

💡 **Sugestão**: Comece com 10% da sobra mensal.`;
      }
    }
    
    if (lowerMessage.includes('dívida') || lowerMessage.includes('débito')) {
      if (userData.totalDebt > 0) {
        return `🏦 **Estratégia para suas dívidas:**

Dívida total: R$ ${userData.totalDebt.toLocaleString('pt-BR')}
Relação dívida/renda: ${userData.debtToIncomeRatio.toFixed(1)}%

${userData.debtToIncomeRatio > 30 ? '🔴 **Situação crítica** - priorize quitação!' : '🟡 **Controlável** - planeje quitação.'}

• **Sobra mensal**: R$ ${userData.netIncome.toLocaleString('pt-BR')} disponível
• **Priorize**: Dívidas com maiores juros primeiro
• **Negocie**: Sempre há desconto na renegociação
• **Orçamento**: Corte gastos temporariamente

⚡ **Meta**: Quitar em ${Math.ceil(userData.totalDebt / Math.max(userData.netIncome, 1))} meses.`;
      } else {
        return `🎉 **Parabéns! Você está livre de dívidas.**

Isso é excelente para sua saúde financeira!

• **Mantenha**: Evite endividamento desnecessário
• **Foque**: Agora priorize investimentos e reserva
• **Prevenção**: Use cartão com responsabilidade
• **Oportunidade**: Aproveite para acelerar metas

💡 **Dica**: Use essa vantagem para investir mais agressivamente.`;
      }
    }

    // Resposta padrão personalizada
    return `🎯 **Análise personalizada:**

Baseado no seu perfil:
• Renda: R$ ${userData.income.toLocaleString('pt-BR')}/mês
• Sobra: R$ ${userData.netIncome.toLocaleString('pt-BR')}/mês  
• Taxa poupança: ${userData.savingsRate.toFixed(1)}%

**Próximos passos recomendados:**
${userData.totalDebt > 0 ? '1. Reduzir dívidas\n' : ''}${userData.investmentValue === 0 ? '2. Começar a investir\n' : '2. Diversificar investimentos\n'}3. Otimizar orçamento

💡 Posso detalhar qualquer uma dessas áreas!`;
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110"
        >
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[28rem] md:w-[36rem] h-[90vh] sm:h-[650px] bg-white rounded-t-xl sm:rounded-xl shadow-xl border border-gray-200 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistente IA</h3>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-2 mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <p className="text-xs text-orange-700">{error}</p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-1 sm:space-x-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse sm:space-x-reverse' : ''}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-blue-600' 
                      : 'bg-blue-600'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                    ) : (
                      <Bot className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                    )}
                  </div>
                  
                  <div className={`rounded-2xl p-2 sm:p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-800 border border-gray-200'
                  }`}>
                    {message.type === 'ai' ? (
                      <MarkdownText>{message.content}</MarkdownText>
                    ) : (
                      <div className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</div>
                    )}
                    <p className={`text-[10px] sm:text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Suggestions */}
            {messages.length > 0 && messages[messages.length - 1].type === 'ai' && messages[messages.length - 1].suggestions && (
              <div className="flex flex-wrap gap-1 mt-1 sm:mt-2">
                {messages[messages.length - 1].suggestions!.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-all duration-200 border border-blue-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start mt-1">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-2 sm:p-3 border border-gray-200">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-0.5 sm:space-x-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-[10px] text-gray-500 ml-1">IA analisando...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-2 sm:p-4 border-t border-gray-100">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSendMessage(inputValue)}
                placeholder="Digite sua pergunta sobre finanças..."
                className="flex-1 p-1.5 sm:p-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors duration-200 bg-white"
                disabled={isTyping}
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                className="p-1.5 sm:p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
            
            {/* Quick suggestions */}
            {messages.length === 1 && !inputValue && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[10px] text-gray-500 w-full mb-1">Sugestões rápidas:</span>
                {quickSuggestions.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-[10px] px-2 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}