export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  phone?: string | null;
  address?: string | null;
  birth_date?: string | null;
  created_at: string;
  updated_at: string;
  plan?: 'starter' | 'family';
  is_in_trial?: boolean;
  trial_expires_at?: string | null;
  trial_days_left?: number;
}