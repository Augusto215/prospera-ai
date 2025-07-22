import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useMonthlyRenewal() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Check if we need to run monthly renewal
    const checkMonthlyRenewal = async () => {
      try {
        // Get the last renewal date from localStorage
        const lastRenewalStr = localStorage.getItem(`lastRenewal_${user.id}`);
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let shouldRenew = false;
        
        if (!lastRenewalStr) {
          // First time, set renewal date and don't renew yet
          shouldRenew = true;
        } else {
          const lastRenewal = new Date(lastRenewalStr);
          const lastMonth = lastRenewal.getMonth();
          const lastYear = lastRenewal.getFullYear();
          
          // Renew if month changed
          if (currentMonth !== lastMonth || currentYear !== lastYear) {
            shouldRenew = true;
          }
        }
        
        if (shouldRenew) {
          // Perform renewal operations
          await renewRecurringItems();
          
          // Update last renewal date
          localStorage.setItem(`lastRenewal_${user.id}`, now.toISOString());
        }
      } catch (err) {
        console.error('Error checking monthly renewal:', err);
      }
    };
    
    const renewRecurringItems = async () => {
      try {
        // Renew recurring income sources
        await renewRecurringIncome();
        
        // Renew recurring expenses
        await renewRecurringExpenses();
        
        // Renew bills
        await renewBills();
        
        console.log('Monthly renewal completed successfully');
      } catch (err) {
        console.error('Error during monthly renewal:', err);
      }
    };
    
    const renewRecurringIncome = async () => {
      try {
        // Get recurring income sources
        const { data: incomeSources, error } = await supabase
          .from('income_sources')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .in('frequency', ['monthly', 'yearly']);
        
        if (error) throw error;
        
        // Create transactions for each income source
        const now = new Date();
        const transactions = incomeSources?.map(source => {
          // For yearly sources, only create transaction in the renewal month
          if (source.frequency === 'yearly') {
            const nextPaymentDate = source.next_payment ? new Date(source.next_payment) : null;
            if (!nextPaymentDate || nextPaymentDate.getMonth() !== now.getMonth()) {
              return null;
            }
          }
          
          return {
            user_id: user.id,
            type: 'income',
            amount: source.amount,
            category: source.category,
            description: `${source.name} (Automático)`,
            date: now.toISOString().split('T')[0],
            is_recurring: true
          };
        }).filter(Boolean);
        
        if (transactions && transactions.length > 0) {
          const { error: insertError } = await supabase
            .from('transactions')
            .insert(transactions);
          
          if (insertError) throw insertError;
        }
      } catch (err) {
        console.error('Error renewing income sources:', err);
      }
    };
    
    const renewRecurringExpenses = async () => {
      try {
        // Similar to income but for recurring expenses
        // This is a simplified version
        const { data: recurringExpenses, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .eq('is_recurring', true);
        
        if (error) throw error;
        
        const now = new Date();
        const transactions = recurringExpenses?.map(expense => {
          return {
            user_id: user.id,
            type: 'expense',
            amount: expense.amount,
            category: expense.category,
            description: `${expense.description} (Automático)`,
            date: now.toISOString().split('T')[0],
            is_recurring: true
          };
        });
        
        if (transactions && transactions.length > 0) {
          const { error: insertError } = await supabase
            .from('transactions')
            .insert(transactions);
          
          if (insertError) throw insertError;
        }
      } catch (err) {
        console.error('Error renewing recurring expenses:', err);
      }
    };
    
    const renewBills = async () => {
      try {
        // Get active recurring bills
        const { data: bills, error } = await supabase
          .from('bills')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('is_recurring', true);
        
        if (error) throw error;
        
        // Update next_due date for each bill
        const now = new Date();
        const updates = bills?.map(bill => {
          const nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, bill.due_day);
          
          return {
            id: bill.id,
            next_due: nextDueDate.toISOString().split('T')[0]
          };
        });
        
        if (updates && updates.length > 0) {
          for (const update of updates) {
            const { error: updateError } = await supabase
              .from('bills')
              .update({ next_due: update.next_due })
              .eq('id', update.id);
            
            if (updateError) throw updateError;
          }
        }
      } catch (err) {
        console.error('Error renewing bills:', err);
      }
    };
    
    // Run the check when component mounts
    checkMonthlyRenewal();
    
  }, [user]);
}