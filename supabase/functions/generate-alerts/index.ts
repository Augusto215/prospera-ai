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

type AlertType = 'bill' | 'employee' | 'expense' | 'achievement' | 'tax' | 'asset' | 'investment';
type AlertPriority = 'high' | 'medium' | 'low';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  date: string;
  priority: AlertPriority;
  isRead: boolean;
  relatedId?: string;
  relatedEntity?: string;
  actionPath?: string;
  actionLabel?: string;
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

    // Generate alerts based on user data
    const alerts = await generateAlertsForUser(userId);

    return corsResponse(alerts);
  } catch (error: any) {
    console.error(`Error generating alerts: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});

async function generateAlertsForUser(userId: string): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const today = new Date();

  try {
    // Fetch bills due soon
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('next_due', new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('next_due', { ascending: true });

    if (billsError) throw billsError;

    // Add bill alerts
    bills?.forEach(bill => {
      const dueDate = new Date(bill.next_due);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: AlertPriority = 'medium';
      if (daysUntilDue <= 2) priority = 'high';
      else if (daysUntilDue <= 5) priority = 'medium';
      else priority = 'low';
      
      alerts.push({
        id: `bill-${bill.id}`,
        type: 'bill',
        title: `Conta a vencer: ${bill.name}`,
        description: `${bill.company} - R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'}`,
        date: bill.next_due,
        priority,
        isRead: false,
        relatedId: bill.id,
        relatedEntity: 'bills',
        actionPath: '/bills',
        actionLabel: 'Ver Contas'
      });
    });

    // Fetch employee data for vacation and FGTS alerts
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (employeesError) throw employeesError;

    // Add employee vacation alerts
    employees?.forEach(employee => {
      if (employee.next_vacation) {
        const nextVacation = new Date(employee.next_vacation);
        const daysUntilVacation = Math.ceil((nextVacation.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilVacation <= 30 && daysUntilVacation > 0) {
          alerts.push({
            id: `vacation-${employee.id}`,
            type: 'employee',
            title: `Férias do funcionário ${employee.name}`,
            description: `Férias programadas para ${new Date(employee.next_vacation).toLocaleDateString('pt-BR')} (em ${daysUntilVacation} dias)`,
            date: employee.next_vacation,
            priority: daysUntilVacation <= 7 ? 'high' : 'medium',
            isRead: false,
            relatedId: employee.id,
            relatedEntity: 'employees',
            actionPath: '/employees',
            actionLabel: 'Ver Funcionários'
          });
        } 
        // Vacation is overdue
        else if (daysUntilVacation <= 0) {
          alerts.push({
            id: `vacation-overdue-${employee.id}`,
            type: 'employee',
            title: `Férias vencidas: ${employee.name}`,
            description: `As férias deste funcionário venceram em ${new Date(employee.next_vacation).toLocaleDateString('pt-BR')}`,
            date: employee.next_vacation,
            priority: 'high',
            isRead: false,
            relatedId: employee.id,
            relatedEntity: 'employees',
            actionPath: '/employees',
            actionLabel: 'Ver Funcionários'
          });
        }
      }

      // FGTS payment alerts - due on the 7th of each month
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 1);
      const fgtsDate = new Date(today.getFullYear(), today.getMonth(), 7);
      
      if (today.getDate() <= 7) {
        // FGTS is due this month
        const daysUntilFgts = 7 - today.getDate();
        
        alerts.push({
          id: `fgts-${employee.id}`,
          type: 'tax',
          title: `Pagamento FGTS ${employee.name}`,
          description: `O FGTS vence em ${daysUntilFgts} ${daysUntilFgts === 1 ? 'dia' : 'dias'} (dia 7). Valor: R$ ${(employee.salary * (employee.fgts_percentage / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          date: fgtsDate.toISOString(),
          priority: daysUntilFgts <= 2 ? 'high' : 'medium',
          isRead: false,
          relatedId: employee.id,
          relatedEntity: 'employees',
          actionPath: '/employees',
          actionLabel: 'Ver Funcionários'
        });
      }
    });

    // Add tax filing deadlines
    const currentYear = today.getFullYear();
    const taxFilingDate = new Date(currentYear, 3, 30); // April 30th
    if (today <= taxFilingDate && today.getMonth() >= 2) { // March, April
      const daysUntilTaxFiling = Math.ceil((taxFilingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilTaxFiling <= 30) {
        alerts.push({
          id: `tax-filing-${currentYear}`,
          type: 'tax',
          title: 'Prazo para declaração de IR',
          description: `Faltam ${daysUntilTaxFiling} dias para o prazo final de entrega da declaração de Imposto de Renda.`,
          date: taxFilingDate.toISOString(),
          priority: daysUntilTaxFiling <= 7 ? 'high' : 'medium',
          isRead: false,
          actionPath: '/documents',
          actionLabel: 'Ver Documentos'
        });
      }
    }

    // Sort alerts by priority and date
    alerts.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return alerts;
  } catch (error) {
    console.error('Error generating alerts:', error);
    throw error;
  }
}