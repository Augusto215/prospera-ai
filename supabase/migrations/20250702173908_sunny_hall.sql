/*
  # Initial Schema for FinanceAI SaaS

  1. New Tables
    - `profiles` - User profiles with admin permissions
    - `income_sources` - User income sources
    - `transactions` - User transactions
    - `investments` - User investments
    - `real_estate` - User real estate properties
    - `retirement_plans` - User retirement plans
    - `loans` - User loans and debts
    - `bills` - User bills and recurring payments
    - `documents` - User uploaded documents
    - `bank_accounts` - User bank accounts

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access only their own data
    - Add admin policy for pedropardal04@gmail.com
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create income_sources table
CREATE TABLE IF NOT EXISTS income_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount decimal(12,2) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'weekly', 'yearly', 'one-time')),
  category text NOT NULL,
  next_payment date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount decimal(12,2) NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create investments table
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('renda-fixa', 'acoes', 'fundos-imobiliarios', 'private-equity', 'titulos-credito')),
  name text NOT NULL,
  broker text NOT NULL,
  amount decimal(12,2) NOT NULL,
  purchase_price decimal(12,2),
  current_price decimal(12,2),
  interest_rate decimal(5,2),
  monthly_income decimal(12,2),
  purchase_date date NOT NULL,
  maturity_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create real_estate table
CREATE TABLE IF NOT EXISTS real_estate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('residencial', 'comercial', 'terreno', 'fundo-imobiliario')),
  address text NOT NULL,
  purchase_price decimal(12,2) NOT NULL,
  current_value decimal(12,2),
  monthly_rent decimal(12,2),
  expenses decimal(12,2) NOT NULL DEFAULT 0,
  purchase_date date NOT NULL,
  is_rented boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create retirement_plans table
CREATE TABLE IF NOT EXISTS retirement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('inss', 'privada', 'pgbl', 'vgbl')),
  name text NOT NULL,
  company text NOT NULL,
  monthly_contribution decimal(12,2) NOT NULL,
  total_contributed decimal(12,2) NOT NULL,
  expected_return decimal(12,2),
  start_date date NOT NULL,
  retirement_age integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pessoal', 'consignado', 'cartao', 'financiamento', 'cheque-especial')),
  bank text NOT NULL,
  amount decimal(12,2) NOT NULL,
  remaining_amount decimal(12,2) NOT NULL,
  interest_rate decimal(5,2) NOT NULL,
  monthly_payment decimal(12,2) NOT NULL,
  due_date date NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text NOT NULL,
  amount decimal(12,2) NOT NULL,
  due_day integer NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  category text NOT NULL,
  is_recurring boolean DEFAULT true,
  is_active boolean DEFAULT true,
  last_paid date,
  next_due date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('corrente', 'poupanca', 'investimento')),
  balance decimal(12,2) NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  folder text NOT NULL,
  file_url text,
  upload_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create property_attachments table for real estate documents
CREATE TABLE IF NOT EXISTS property_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES real_estate(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_estate ENABLE ROW LEVEL SECURITY;
ALTER TABLE retirement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin policy for profiles
CREATE POLICY "Admin can read all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND email = 'pedropardal04@gmail.com' 
      AND is_admin = true
    )
  );

-- Create policies for income_sources
CREATE POLICY "Users can manage own income sources"
  ON income_sources
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for transactions
CREATE POLICY "Users can manage own transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for investments
CREATE POLICY "Users can manage own investments"
  ON investments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for real_estate
CREATE POLICY "Users can manage own real estate"
  ON real_estate
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for retirement_plans
CREATE POLICY "Users can manage own retirement plans"
  ON retirement_plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for loans
CREATE POLICY "Users can manage own loans"
  ON loans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for bills
CREATE POLICY "Users can manage own bills"
  ON bills
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for bank_accounts
CREATE POLICY "Users can manage own bank accounts"
  ON bank_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for documents
CREATE POLICY "Users can manage own documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for property_attachments
CREATE POLICY "Users can manage own property attachments"
  ON property_attachments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (user_id, email, full_name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN NEW.email = 'pedropardal04@gmail.com' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();