/*
  # Adicionar coluna dividend_yield para investimentos

  1. Alterações na tabela
    - Adicionar coluna dividend_yield para ações e FIIs
    - Manter compatibilidade com dados existentes

  2. Segurança
    - Manter RLS existente
*/

-- Adicionar coluna dividend_yield à tabela investments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investments' AND column_name = 'dividend_yield'
  ) THEN
    ALTER TABLE investments ADD COLUMN dividend_yield decimal(5,2);
  END IF;
END $$;

-- Adicionar coluna quantity se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investments' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE investments ADD COLUMN quantity integer;
  END IF;
END $$;