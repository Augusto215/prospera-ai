import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  userPlan: 'starter' | 'family';
  isInTrial: boolean;
  trialExpiresAt: Date | null;
  trialDaysLeft: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlan, setUserPlan] = useState<'starter' | 'family'>('starter');
  const [isInTrial, setIsInTrial] = useState(false);
  const [trialExpiresAt, setTrialExpiresAt] = useState<Date | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(7);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsAdmin(false);
        setUserPlan('starter');
        setIsInTrial(false);
        setTrialExpiresAt(null);
        setTrialDaysLeft(0);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile to determine admin status and plan
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, plan, is_in_trial, trial_expires_at, trial_days_left')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        setIsAdmin(data.is_admin || false);
        setUserPlan(data.plan as 'starter' | 'family' || 'starter');
        setIsInTrial(data.is_in_trial || false);
        setTrialExpiresAt(data.trial_expires_at ? new Date(data.trial_expires_at) : null);
        setTrialDaysLeft(data.trial_days_left || 0);
      }
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return { error };
      }

      setUser(data.user);
      setSession(data.session);
      if (data.user) {
        fetchUserProfile(data.user.id);
      }
      return { error: null };
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setError(error.message);
        return { error };
      }

      // In production with email confirmation enabled, user won't be set here
      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        fetchUserProfile(data.user.id);
      }

      return { error: null };
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setUserPlan('starter');
      setIsInTrial(false);
      setTrialExpiresAt(null);
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  // Listen for plan changes from other components
  useEffect(() => {
    const handlePlanChange = (event: CustomEvent) => {
      const { userId, newPlan } = event.detail;
      if (user && user.id === userId) {
        setUserPlan(newPlan as 'starter' | 'family'); 
        
        // If user is upgraded to family plan, reset trial status
        if (newPlan === 'family') {
          setIsInTrial(false);
          setTrialDaysLeft(0);
        }
      }
    };

    window.addEventListener('userPlanChanged', handlePlanChange as EventListener);

    return () => {
      window.removeEventListener('userPlanChanged', handlePlanChange as EventListener);
    };
  }, [user]);

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAdmin,
    userPlan,
    isInTrial, 
    trialExpiresAt,
    trialDaysLeft
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}