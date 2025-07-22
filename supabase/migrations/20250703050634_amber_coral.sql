-- Adicionar coluna dividend_yield à tabela real_estate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'real_estate' AND column_name = 'dividend_yield'
  ) THEN
    ALTER TABLE real_estate ADD COLUMN dividend_yield decimal(5,2);
  END IF;
END $$;