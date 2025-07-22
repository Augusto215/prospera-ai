/*
  # Add Employees Management Tables

  1. New Tables
    - `employees` - Employee information and status
    - `employee_documents` - Documents related to employees

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access only their own data
*/

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  salary decimal(12,2) NOT NULL,
  hiring_date date NOT NULL,
  document_number text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('cpf', 'rg', 'cnh', 'ctps')),
  address text NOT NULL,
  phone text NOT NULL,
  email text,
  status text NOT NULL CHECK (status IN ('active', 'vacation', 'leave', 'terminated')),
  vacation_start date,
  vacation_end date,
  last_vacation date,
  next_vacation date,
  fgts_percentage decimal(5,2) NOT NULL DEFAULT 8.0,
  inss_percentage decimal(5,2) NOT NULL DEFAULT 11.0,
  irrf_percentage decimal(5,2) NOT NULL DEFAULT 0.0,
  other_benefits decimal(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_documents table
CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_type text NOT NULL,
  file_url text,
  upload_date timestamptz NOT NULL,
  expiration_date date,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for employees
CREATE POLICY "Users can manage own employees"
  ON employees
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for employee_documents
CREATE POLICY "Users can manage own employee documents"
  ON employee_documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);