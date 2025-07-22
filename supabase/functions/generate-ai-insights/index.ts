import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
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

interface Insight {
  id: string;
  type: 'warning' | 'achievement' | 'suggestion' | 'feature';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  date: string;
  potentialSavings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
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

    // Validate required parameters
    if (!userId) {
      return corsResponse({ error: 'Missing required parameter: userId' }, 400);
    }

    // Get auth token from header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    // Ensure the requesting user is the same as the target user
    if (user?.id !== userId) {
      return corsResponse({ error: 'Unauthorized access' }, 403);
    }

    // Generate insights based on user data
    const insights = await generateInsights(userId);
    
    // Get recommendations from the database
    const recommendations = await getRecommendations(userId);

    return corsResponse({
      insights,
      recommendations,
      score: calculateFinancialScore(insights, recommendations)
    });
  } catch (error: any) {
    console.error(`Error generating AI insights: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});

async function generateInsights(userId: string): Promise<Insight[]> {
  try {
    // First, check if we already have insights in the alerts table
    const { data: alertsData, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(10);

    if (alertsError) throw alertsError;

    // If we have alerts, convert them to insights
    if (alertsData && alertsData.length > 0) {
      return alertsData.map(alert => ({
        id: alert.id,
        type: mapAlertTypeToInsightType(alert.type),
        title: alert.title,
        description: alert.description,
        impact: alert.priority,
        date: alert.date,
      }));
    }

    // If no alerts found, generate new insights based on user data
    return await analyzeUserData(userId);
  } catch (error) {
    console.error('Error generating insights:', error);
    throw error;
  }
}

function mapAlertTypeToInsightType(alertType: string): 'warning' | 'achievement' | 'suggestion' | 'feature' {
  switch (alertType) {
    case 'bill':
    case 'expense':
    case 'tax':
      return 'warning';
    case 'achievement':
      return 'achievement';
    case 'investment':
    case 'asset':
      return 'suggestion';
    default:
      return 'feature';
  }
}

async function analyzeUserData(userId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date().toISOString();

  try {
    // Fetch user's financial data
    const [
      { data: transactions },
      { data: investments },
      { data: bills },
      { data: incomeSources },
      { data: goals },
      { data: realEstate },
      { data: vehicles }
    ] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', userId),
      supabase.from('investments').select('*').eq('user_id', userId),
      supabase.from('bills').select('*').eq('user_id', userId),
      supabase.from('income_sources').select('*').eq('user_id', userId),
      supabase.from('financial_goals').select('*').eq('user_id', userId),
      supabase.from('real_estate').select('*').eq('user_id', userId),
      supabase.from('vehicles').select('*').eq('user_id', userId)
    ]);

    // Analyze expenses
    if (transactions && transactions.length > 0) {
      const expenses = transactions.filter(t => t.type === 'expense');
      
      // Group expenses by category
      const expensesByCategory: Record<string, number> = {};
      expenses.forEach(expense => {
        if (!expensesByCategory[expense.category]) {
          expensesByCategory[expense.category] = 0;
        }
        expensesByCategory[expense.category] += expense.amount;
      });

      // Find the highest expense category
      let highestCategory = '';
      let highestAmount = 0;
      Object.entries(expensesByCategory).forEach(([category, amount]) => {
        if (amount > highestAmount) {
          highestCategory = category;
          highestAmount = amount;
        }
      });

      if (highestCategory) {
        insights.push({
          id: `expense-${Date.now()}`,
          type: 'warning',
          title: `Gastos elevados em ${highestCategory}`,
          description: `Seus gastos com ${highestCategory.toLowerCase()} representam uma parte significativa do seu orçamento.`,
          impact: 'high',
          date: now,
          potentialSavings: Math.round(highestAmount * 0.2)
        });
      }
    }

    // Analyze investments
    if (investments && investments.length > 0) {
      // Check for diversification
      const investmentTypes = new Set(investments.map(i => i.type));
      if (investmentTypes.size < 3) {
        insights.push({
          id: `investment-${Date.now()}`,
          type: 'suggestion',
          title: 'Diversifique seus investimentos',
          description: 'Sua carteira está concentrada em poucos tipos de investimentos. Considere diversificar para reduzir riscos.',
          impact: 'medium',
          date: now,
          difficulty: 'medium'
        });
      }

      // Check for low-yield investments
      const lowYieldInvestments = investments.filter(i => 
        (i.interest_rate && i.interest_rate < 5) || 
        (i.dividend_yield && i.dividend_yield < 3)
      );
      
      if (lowYieldInvestments.length > 0) {
        insights.push({
          id: `low-yield-${Date.now()}`,
          type: 'suggestion',
          title: 'Otimize investimentos de baixo rendimento',
          description: 'Você tem investimentos com rendimento abaixo da média do mercado. Considere realocá-los para opções mais rentáveis.',
          impact: 'high',
          date: now,
          difficulty: 'medium'
        });
      }
    }

    // Analyze bills
    if (bills && bills.length > 0) {
      const overdueBills = bills.filter(b => 
        b.is_active && 
        b.payment_status !== 'paid' && 
        new Date(b.next_due) < new Date()
      );
      
      if (overdueBills.length > 0) {
        insights.push({
          id: `overdue-bills-${Date.now()}`,
          type: 'warning',
          title: `${overdueBills.length} contas em atraso`,
          description: `Você tem ${overdueBills.length} contas vencidas que precisam de atenção imediata.`,
          impact: 'high',
          date: now
        });
      }
    }

    // Analyze financial goals
    if (goals && goals.length > 0) {
      const activeGoals = goals.filter(g => g.status === 'active');
      
      activeGoals.forEach(goal => {
        const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
        
        if (progressPercentage >= 100) {
          insights.push({
            id: `goal-complete-${goal.id}`,
            type: 'achievement',
            title: `Meta atingida: ${goal.name}`,
            description: `Parabéns! Você atingiu sua meta financeira de ${goal.name}.`,
            impact: 'high',
            date: now
          });
        } else if (progressPercentage >= 75) {
          insights.push({
            id: `goal-progress-${goal.id}`,
            type: 'achievement',
            title: `Progresso significativo: ${goal.name}`,
            description: `Você já atingiu ${Math.round(progressPercentage)}% da sua meta de ${goal.name}.`,
            impact: 'medium',
            date: now
          });
        } else if (new Date(goal.target_date) < new Date()) {
          insights.push({
            id: `goal-overdue-${goal.id}`,
            type: 'warning',
            title: `Meta atrasada: ${goal.name}`,
            description: `Sua meta de ${goal.name} está atrasada. Considere revisar o prazo ou aumentar as contribuições.`,
            impact: 'high',
            date: now
          });
        }
      });
    }

    // Analyze real estate
    if (realEstate && realEstate.length > 0) {
      const rentedProperties = realEstate.filter(p => p.is_rented);
      const nonRentedProperties = realEstate.filter(p => !p.is_rented);
      
      if (nonRentedProperties.length > 0) {
        insights.push({
          id: `property-rent-${Date.now()}`,
          type: 'suggestion',
          title: 'Potencial de renda com imóveis',
          description: `Você tem ${nonRentedProperties.length} imóvel(is) não alugado(s). Considere alugar para gerar renda passiva.`,
          impact: 'medium',
          date: now,
          difficulty: 'medium'
        });
      }
      
      if (rentedProperties.length > 0) {
        const lowYieldProperties = rentedProperties.filter(p => {
          if (!p.monthly_rent || !p.current_value) return false;
          const annualYield = (p.monthly_rent * 12) / p.current_value * 100;
          return annualYield < 4; // Below average rental yield
        });
        
        if (lowYieldProperties.length > 0) {
          insights.push({
            id: `property-yield-${Date.now()}`,
            type: 'suggestion',
            title: 'Imóveis com baixo rendimento',
            description: `Você tem ${lowYieldProperties.length} imóvel(is) com rendimento abaixo da média do mercado. Considere revisar o valor do aluguel.`,
            impact: 'medium',
            date: now,
            difficulty: 'hard'
          });
        }
      }
    }

    // Analyze vehicles
    if (vehicles && vehicles.length > 0) {
      const highDepreciationVehicles = vehicles.filter(v => v.depreciation_rate > 15);
      
      if (highDepreciationVehicles.length > 0) {
        insights.push({
          id: `vehicle-depreciation-${Date.now()}`,
          type: 'warning',
          title: 'Veículos com alta depreciação',
          description: `Você tem ${highDepreciationVehicles.length} veículo(s) com taxa de depreciação acima da média. Considere vender antes de maior desvalorização.`,
          impact: 'medium',
          date: now
        });
      }
    }

    // Add feature insights
    insights.push({
      id: `feature-access-${Date.now()}`,
      type: 'feature',
      title: 'Novo recurso: Gerenciamento de Acessos',
      description: 'O plano Family agora permite compartilhar acesso à sua conta com familiares e colaboradores.',
      impact: 'high',
      date: now
    });

    insights.push({
      id: `feature-sharing-${Date.now()}`,
      type: 'feature',
      title: 'Novo recurso: Compartilhamento Familiar',
      description: 'Agora você pode compartilhar o acesso à sua conta com até 5 membros da família no plano Family.',
      impact: 'high',
      date: now
    });

    return insights;
  } catch (error) {
    console.error('Error analyzing user data:', error);
    return [];
  }
}

async function getRecommendations(userId: string) {
  try {
    // Get recommendations from the database
    const { data, error } = await supabase
      .from('goal_recommendations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}

function calculateFinancialScore(insights: Insight[], recommendations: any[]): number {
  // Base score
  let score = 70;
  
  // Add points for achievements
  const achievements = insights.filter(i => i.type === 'achievement');
  score += achievements.length * 3;
  
  // Subtract points for warnings
  const warnings = insights.filter(i => i.type === 'warning');
  score -= warnings.length * 2;
  
  // Add points for having recommendations
  score += Math.min(recommendations.length, 5);
  
  // Cap score between 0 and 100
  return Math.max(0, Math.min(100, score));
}