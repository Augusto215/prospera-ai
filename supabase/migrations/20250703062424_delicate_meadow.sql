/*
  # Add tax rate columns to income sources and investments

  1. New Columns
    - `tax_rate` - Tax rate percentage for income sources
    - `tax_rate` - Tax rate percentage for investments
    - `tax_rate` - Tax rate percentage for real estate
    - `tax_rate` - Tax rate percentage for transactions

  2. Changes
    - Add tax_rate column to income_sources table
    - Add tax_rate column to investments table
    - Add tax_rate column to real_estate table
    - Add tax_rate column to transactions table
*/

-- Add tax_rate column to income_sources if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_sources' AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE income_sources ADD COLUMN tax_rate decimal(5,2);
  END IF;
END $$;

-- Add tax_rate column to investments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investments' AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE investments ADD COLUMN tax_rate decimal(5,2);
  END IF;
END $$;

-- Add tax_rate column to real_estate if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'real_estate' AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE real_estate ADD COLUMN tax_rate decimal(5,2);
  END IF;
END $$;

-- Add tax_rate column to transactions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE transactions ADD COLUMN tax_rate decimal(5,2);
  END IF;
END $$;