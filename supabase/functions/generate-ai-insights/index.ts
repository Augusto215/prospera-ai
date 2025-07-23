import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { userId } = await req.json();

    if (!userId) {
      return corsResponse({ error: 'Missing required parameter: userId' }, 400);
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (user?.id !== userId) {
      return corsResponse({ error: 'Unauthorized access' }, 403);
    }

    // Generate insights and ensure recommendations exist
    const insights = await generateSimpleInsights(userId);
    const recommendations = await ensureRecommendationsExist(userId);

    return corsResponse({
      insights,
      recommendations,
      score: calculateSimpleScore(insights, recommendations)
    });
  } catch (error: any) {
    console.error(`Error generating AI insights: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});

async function generateSimpleInsights(userId: string) {
  const now = new Date().toISOString();
  
  // Fetch real user data for insights
  const [
    { data: transactions },
    { data: bills },
    { data: investments },
    { data: goals }
  ] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(50),
    supabase.from('bills').select('*').eq('user_id', userId),
    supabase.from('investments').select('*').eq('user_id', userId),
    supabase.from('financial_goals').select('*').eq('user_id', userId)
  ]);

  const insights: any[] = [];

  // Always show feature insights
  insights.push({
    id: `feature-ai-recommendations-${Date.now()}`,
    type: 'feature',
    title: 'IA Aprimorada: Recomendações Automáticas',
    description: 'Nossa IA agora gera recomendações personalizadas baseadas no seu comportamento financeiro para ajudar você a economizar mais.',
    impact: 'high',
    date: now,
    action_path: 'insights',
    action_label: 'Ver Recomendações'
  });

  // insights.push({
  //   id: `feature-family-sharing-${Date.now()}`,
  //   type: 'feature',
  //   title: 'Novo: Compartilhamento Familiar',
  //   description: 'Agora você pode compartilhar o acesso à sua conta com até 5 membros da família. Gerencie as finanças em conjunto!',
  //   impact: 'high',
  //   date: now,
  //   action_path: 'access',
  //   action_label: 'Configurar Família'
  // });

  // Generate data-driven insights only if user has sufficient data
  if (transactions && transactions.length >= 5) {
    // Analyze recent transactions for achievements
    const recentTransactions = transactions.slice(0, 10);
    const incomeTransactions = recentTransactions.filter(t => t.type === 'income');
    const expenseTransactions = recentTransactions.filter(t => t.type === 'expense');

    if (incomeTransactions.length > 0) {
      insights.push({
        id: `achievement-income-${Date.now()}`,
        type: 'achievement',
        title: 'Receitas registradas com sucesso!',
        description: `Você registrou ${incomeTransactions.length} receita(s) recentemente. Manter o controle das entradas é fundamental para uma boa gestão financeira.`,
        impact: 'medium',
        date: now,
        action_path: 'transactions',
        action_label: 'Ver Transações'
      });
    }

    // Analyze spending patterns
    if (expenseTransactions.length >= 5) {
      const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
      const avgExpense = totalExpenses / expenseTransactions.length;

      if (avgExpense > 200) {
        insights.push({
          id: `warning-high-expenses-${Date.now()}`,
          type: 'warning',
          title: 'Gastos elevados detectados',
          description: `Suas últimas ${expenseTransactions.length} despesas somam R$ ${totalExpenses.toFixed(2)}, com média de R$ ${avgExpense.toFixed(2)} por transação. Revise se necessário.`,
          impact: 'medium',
          date: now,
          action_path: 'transactions',
          action_label: 'Revisar Gastos'
        });
      }

      // Category analysis
      const expensesByCategory: Record<string, number> = {};
      expenseTransactions.forEach(exp => {
        expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
      });

      const topCategory = Object.entries(expensesByCategory)
        .sort(([,a], [,b]) => b - a)[0];

      if (topCategory && topCategory[1] > totalExpenses * 0.4) {
        insights.push({
          id: `suggestion-category-${Date.now()}`,
          type: 'suggestion',
          title: `${topCategory[0]} domina seus gastos`,
          description: `A categoria ${topCategory[0]} representa R$ ${topCategory[1].toFixed(2)} dos seus gastos recentes. Considere formas de otimizar esses gastos.`,
          impact: 'high',
          date: now,
          potentialSavings: Math.round(topCategory[1] * 0.15),
          action_path: 'budget',
          action_label: 'Criar Orçamento'
        });
      }
    }
  }

  // Bills analysis
  if (bills && bills.length > 0) {
    const activeBills = bills.filter(b => b.is_active);
    const overdueBills = activeBills.filter(bill => 
      bill.payment_status !== 'paid' && new Date(bill.next_due) < new Date()
    );

    if (overdueBills.length > 0) {
      insights.push({
        id: `warning-overdue-bills-${Date.now()}`,
        type: 'warning',
        title: `${overdueBills.length} conta(s) em atraso`,
        description: `Você tem contas vencidas que podem gerar juros e multas. Quite-as o quanto antes para evitar custos adicionais.`,
        impact: 'high',
        date: now,
        action_path: 'bills',
        action_label: 'Pagar Contas'
      });
    } else if (activeBills.length > 0) {
      const totalBills = activeBills.reduce((sum, bill) => sum + bill.amount, 0);
      insights.push({
        id: `achievement-bills-organized-${Date.now()}`,
        type: 'achievement',
        title: 'Contas organizadas!',
        description: `Você tem ${activeBills.length} conta(s) cadastrada(s) e em dia, totalizando R$ ${totalBills.toFixed(2)}. Ótimo controle financeiro!`,
        impact: 'medium',
        date: now,
        action_path: 'bills',
        action_label: 'Ver Contas'
      });
    }
  }

  // Investments analysis
  if (investments && investments.length > 0) {
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.current_value || inv.amount), 0);
    
    insights.push({
      id: `achievement-investor-${Date.now()}`,
      type: 'achievement',
      title: 'Parabéns! Você é um investidor',
      description: `Você tem R$ ${totalInvested.toFixed(2)} investidos em ${investments.length} aplicação(ões). Continue construindo seu patrimônio!`,
      impact: 'high',
      date: now,
      action_path: 'investments',
      action_label: 'Ver Investimentos'
    });

    const investmentTypes = [...new Set(investments.map(i => i.type))];
    if (investmentTypes.length === 1 && totalInvested > 5000) {
      insights.push({
        id: `suggestion-diversify-${Date.now()}`,
        type: 'suggestion',
        title: 'Considere diversificar seus investimentos',
        description: `Seus investimentos estão concentrados em ${investmentTypes[0]}. Diversificar pode reduzir riscos e potencializar ganhos.`,
        impact: 'medium',
        date: now,
        action_path: 'investments',
        action_label: 'Diversificar'
      });
    }
  }

  // Goals analysis
  if (goals && goals.length > 0) {
    const activeGoals = goals.filter(g => g.status === 'active');
    
    activeGoals.forEach(goal => {
      const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
      
      if (progressPercentage >= 100) {
        insights.push({
          id: `achievement-goal-${goal.id}`,
          type: 'achievement',
          title: `Meta concluída: ${goal.name}`,
          description: `Parabéns! Você atingiu 100% da sua meta "${goal.name}". Que tal definir uma nova meta ainda mais ambiciosa?`,
          impact: 'high',
          date: now,
          action_path: 'financial-goals',
          action_label: 'Ver Metas'
        });
      } else if (progressPercentage >= 75) {
        insights.push({
          id: `achievement-goal-progress-${goal.id}`,
          type: 'achievement',
          title: `Quase lá! Meta "${goal.name}" - ${Math.round(progressPercentage)}%`,
          description: `Você está muito próximo de atingir sua meta. Faltam apenas R$ ${(goal.target_amount - goal.current_amount).toFixed(2)}!`,
          impact: 'medium',
          date: now,
          action_path: 'financial-goals',
          action_label: 'Ver Progresso'
        });
      }
    });
  } else if (transactions && transactions.length >= 10) {
    // Suggest creating goals if user has activity but no goals
    insights.push({
      id: `suggestion-create-goal-${Date.now()}`,
      type: 'suggestion',
      title: 'Que tal definir uma meta financeira?',
      description: 'Você tem atividade financeira regular. Definir metas claras pode aumentar sua disciplina e resultados em até 42%.',
      impact: 'high',
      date: now,
      action_path: 'financial-goals',
      action_label: 'Criar Meta'
    });
  }

  // If user has minimal data, show encouragement
  if ((!transactions || transactions.length < 5) && (!bills || bills.length === 0) && (!investments || investments.length === 0)) {
    insights.push({
      id: `feature-getting-started-${Date.now()}`,
      type: 'feature',
      title: 'Comece sua jornada financeira!',
      description: 'Adicione suas primeiras transações, contas e investimentos para que nossa IA possa gerar insights personalizados para você.',
      impact: 'high',
      date: now,
      action_path: 'transactions',
      action_label: 'Adicionar Transação'
    });
  }

  return insights;
}

async function ensureRecommendationsExist(userId: string) {
  try {
    // First, get existing recommendations
    const { data: existingRecs } = await supabase
      .from('goal_recommendations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // If we have recommendations, return them
    if (existingRecs && existingRecs.length > 0) {
      return existingRecs;
    }

    // Fetch real user data to generate personalized recommendations
    const [
      { data: transactions },
      { data: bills },
      { data: investments },
      { data: goals },
      { data: bankAccounts }
    ] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(100),
      supabase.from('bills').select('*').eq('user_id', userId),
      supabase.from('investments').select('*').eq('user_id', userId),
      supabase.from('financial_goals').select('*').eq('user_id', userId),
      supabase.from('bank_accounts').select('*').eq('user_id', userId)
    ]);

    // Generate recommendations based on real data
    const recommendations = await generatePersonalizedRecommendations(userId, {
      transactions: transactions || [],
      bills: bills || [],
      investments: investments || [],
      goals: goals || [],
      bankAccounts: bankAccounts || []
    });

    // Only insert if we have recommendations to create
    if (recommendations.length === 0) {
      return [];
    }

    // Insert personalized recommendations
    const { data: newRecs, error } = await supabase
      .from('goal_recommendations')
      .insert(recommendations)
      .select();

    if (error) {
      console.error('Error creating personalized recommendations:', error);
      return [];
    }

    return newRecs || [];

  } catch (error) {
    console.error('Error ensuring recommendations exist:', error);
    return [];
  }
}

async function generatePersonalizedRecommendations(userId: string, userData: any) {
  const recommendations: any[] = [];
  const { transactions, bills, investments, goals, bankAccounts } = userData;

  // Check if user has enough data to generate meaningful recommendations
  const hasMinimumData = transactions.length >= 5 || bills.length >= 2 || investments.length >= 1;
  
  if (!hasMinimumData) {
    console.log('Insufficient user data for personalized recommendations');
    return recommendations;
  }

  // 1. Analyze spending patterns from real transactions
  if (transactions.length >= 10) {
    const expenses = transactions.filter(t => t.type === 'expense');
    const expensesByCategory: Record<string, number> = {};
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Group expenses by category
    expenses.forEach(expense => {
      expensesByCategory[expense.category] = (expensesByCategory[expense.category] || 0) + expense.amount;
    });

    // Find top spending categories (only if significant spending)
    const sortedCategories = Object.entries(expensesByCategory)
      .filter(([category, amount]) => amount > 500) // Only categories with R$ 500+ spending
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2); // Top 2 categories

    sortedCategories.forEach(([category, amount]) => {
      const percentage = (amount / totalExpenses) * 100;
      
      // Only recommend if category represents >25% of spending
      if (percentage > 25) {
        const potentialSavings = Math.round(amount * 0.15); // 15% reduction potential
        
        recommendations.push({
          user_id: userId,
          type: `reduce_${category.toLowerCase().replace(/\s+/g, '_')}`,
          title: `Reduza gastos com ${category}`,
          description: `Você gastou R$ ${amount.toFixed(2)} em ${category.toLowerCase()} (${Math.round(percentage)}% do total). Reduzir em 15% pode economizar R$ ${potentialSavings.toFixed(2)} por mês.`,
          potential_savings: potentialSavings,
          priority: percentage > 40 ? 'high' : 'medium',
          is_applied: false,
          difficulty: 'medium',
          category: 'expense_optimization',
          action_data: {
            category,
            current_amount: amount,
            suggested_limit: amount * 0.85,
            percentage_of_total: percentage
          }
        });
      }
    });

    // Detect subscription patterns from real transactions
    const subscriptionKeywords = ['netflix', 'spotify', 'amazon', 'prime', 'assinatura', 'streaming', 'youtube', 'google', 'microsoft'];
    const subscriptionExpenses = expenses.filter(exp => 
      subscriptionKeywords.some(keyword => 
        exp.description?.toLowerCase().includes(keyword) ||
        exp.category?.toLowerCase().includes('assinatura') ||
        exp.category?.toLowerCase().includes('streaming')
      )
    );

    if (subscriptionExpenses.length >= 3) {
      const totalSubscriptions = subscriptionExpenses.reduce((sum, sub) => sum + sub.amount, 0);
      const potentialSavings = Math.round(totalSubscriptions * 0.3);

      recommendations.push({
        user_id: userId,
        type: 'optimize_subscriptions',
        title: 'Otimize suas assinaturas',
        description: `Identificamos ${subscriptionExpenses.length} assinaturas em suas transações, totalizando R$ ${totalSubscriptions.toFixed(2)} por mês. Cancelar as menos usadas pode economizar até R$ ${potentialSavings.toFixed(2)}.`,
        potential_savings: potentialSavings,
        priority: 'high',
        is_applied: false,
        difficulty: 'easy',
        category: 'subscription_management',
        action_data: {
          subscription_count: subscriptionExpenses.length,
          total_amount: totalSubscriptions,
          detected_services: subscriptionExpenses.map(s => s.description).slice(0, 5)
        }
      });
    }
  }

  // 2. Analyze bills for negotiation opportunities
  if (bills.length >= 2) {
    const activeBills = bills.filter(b => b.is_active);
    const highValueBills = activeBills.filter(b => b.amount > 200);

    if (highValueBills.length >= 2) {
      const totalHighBills = highValueBills.reduce((sum, bill) => sum + bill.amount, 0);
      const potentialSavings = Math.round(totalHighBills * 0.1); // 10% negotiation discount

      recommendations.push({
        user_id: userId,
        type: 'negotiate_bills',
        title: 'Negocie suas contas fixas',
        description: `Você tem ${highValueBills.length} contas fixas de alto valor (${highValueBills.map(b => b.name).join(', ')}), totalizando R$ ${totalHighBills.toFixed(2)}. Negociar pode economizar R$ ${potentialSavings.toFixed(2)}/mês.`,
        potential_savings: potentialSavings,
        priority: 'medium',
        is_applied: false,
        difficulty: 'medium',
        category: 'bill_optimization',
        action_data: {
          high_value_bills: highValueBills.length,
          total_amount: totalHighBills,
          bill_names: highValueBills.map(b => b.name)
        }
      });
    }
  }

  // 3. Investment analysis (only if user has investments)
  if (investments.length >= 1) {
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.current_value || inv.amount), 0);
    const investmentTypes = [...new Set(investments.map(i => i.type))];

    // Emergency fund recommendation (only if significant investments but no emergency fund)
    const hasEmergencyFund = goals.some(g => 
      g.name?.toLowerCase().includes('emergência') || 
      g.description?.toLowerCase().includes('emergência')
    );

    if (totalInvested > 5000 && !hasEmergencyFund) {
      const recommendedEmergencyFund = Math.min(totalInvested * 0.2, 15000);
      
      recommendations.push({
        user_id: userId,
        type: 'emergency_fund',
        title: 'Crie uma reserva de emergência',
        description: `Com R$ ${totalInvested.toFixed(2)} investidos, é importante ter uma reserva de emergência de R$ ${recommendedEmergencyFund.toFixed(2)} em conta corrente para imprevistos.`,
        potential_savings: Math.round(recommendedEmergencyFund * 0.05), // Peace of mind value
        priority: 'high',
        is_applied: false,
        difficulty: 'medium',
        category: 'investment_optimization',
        action_data: {
          recommended_amount: recommendedEmergencyFund,
          current_invested: totalInvested,
          current_types: investmentTypes
        }
      });
    }

    // Diversification recommendation (only if concentrated in few types)
    if (investmentTypes.length < 3 && totalInvested > 10000) {
      recommendations.push({
        user_id: userId,
        type: 'diversify_portfolio',
        title: 'Diversifique sua carteira',
        description: `Seus R$ ${totalInvested.toFixed(2)} estão concentrados em ${investmentTypes.length} tipo(s): ${investmentTypes.join(', ')}. Diversificar pode reduzir riscos.`,
        potential_savings: Math.round(totalInvested * 0.02), // 2% potential improvement
        priority: 'medium',
        is_applied: false,
        difficulty: 'hard',
        category: 'investment_optimization',
        action_data: {
          current_types: investmentTypes.length,
          total_invested: totalInvested,
          current_type_names: investmentTypes
        }
      });
    }
  }

  // 4. Goal-based recommendations (only if no active goals but has financial activity)
  if (goals.length === 0 && (transactions.length > 10 || investments.length > 0)) {
    recommendations.push({
      user_id: userId,
      type: 'create_financial_goal',
      title: 'Defina uma meta financeira',
      description: 'Você tem atividade financeira ativa mas nenhuma meta definida. Ter objetivos claros aumenta a disciplina financeira em 42%.',
      potential_savings: 300, // Average motivation boost value
      priority: 'high',
      is_applied: false,
      difficulty: 'easy',
      category: 'goal_setting',
      action_data: {
        has_investments: investments.length > 0,
        has_transactions: transactions.length > 10,
        suggested_goal_amount: Math.round((transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 5000) * 0.1)
      }
    });
  }

  // 5. Cash flow optimization (only if user has multiple accounts or frequent transactions)
  if (bankAccounts.length > 1 || transactions.length > 20) {
    recommendations.push({
      user_id: userId,
      type: 'optimize_cash_flow',
      title: 'Otimize seu fluxo de caixa',
      description: `Com ${bankAccounts.length} conta(s) e ${transactions.length} transações, automatizar transferências e alertas pode simplificar sua gestão financeira.`,
      potential_savings: 150,
      priority: 'low',
      is_applied: false,
      difficulty: 'easy',
      category: 'automation',
      action_data: {
        account_count: bankAccounts.length,
        transaction_count: transactions.length
      }
    });
  }

  console.log(`Generated ${recommendations.length} personalized recommendations based on real user data`);
  return recommendations;
}

function calculateSimpleScore(insights: any[], recommendations: any[]): number {
  let score = 75; // Base score
  
  // Achievements add points
  const achievements = insights.filter(i => i.type === 'achievement');
  score += achievements.length * 5;
  
  // Having recommendations shows engagement
  score += Math.min(recommendations.length, 10);
  
  // Applied recommendations add significant value
  const appliedRecs = recommendations.filter(r => r.is_applied);
  score += appliedRecs.length * 8;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}