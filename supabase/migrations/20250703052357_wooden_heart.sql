/*
  # Adicionar tabelas para Veículos e Ativos Exóticos

  1. New Tables
    - `vehicles` - Veículos com depreciação
    - `exotic_assets` - Ativos exóticos com tags personalizáveis

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to access only their own data
*/

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('carro', 'moto', 'caminhao', 'van', 'outros')),
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  purchase_price decimal(12,2) NOT NULL,
  current_value decimal(12,2),
  mileage integer DEFAULT 0,
  purchase_date date NOT NULL,
  depreciation_rate decimal(5,2) DEFAULT 10.0, -- Taxa de depreciação anual em %
  monthly_expenses decimal(12,2) DEFAULT 0, -- Gastos mensais (combustível, seguro, etc.)
  is_financed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create exotic_assets table
CREATE TABLE IF NOT EXISTS exotic_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL, -- Categoria principal (relógios, arte, roupas, tênis, etc.)
  custom_tags text[], -- Array de tags personalizáveis
  purchase_price decimal(12,2) NOT NULL,
  current_value decimal(12,2),
  purchase_date date NOT NULL,
  condition text DEFAULT 'excelente' CHECK (condition IN ('novo', 'excelente', 'bom', 'regular', 'ruim')),
  description text,
  location text, -- Onde está guardado/localizado
  insurance_value decimal(12,2), -- Valor do seguro se houver
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exotic_assets ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicles
CREATE POLICY "Users can manage own vehicles"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for exotic_assets
CREATE POLICY "Users can manage own exotic assets"
  ON exotic_assets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);