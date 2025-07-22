/*
  # Tax Rates Optimization

  1. Indexes
    - Add indexes on tax_rate columns for better query performance
    
  2. Constraints
    - Add check constraints to ensure tax rates are within reasonable bounds (0-100%)
    
  3. Comments
    - Add column comments for better documentation
*/

-- Add indexes for better performance on tax rate queries
CREATE INDEX IF NOT EXISTS idx_income_sources_tax_rate ON income_sources(tax_rate) WHERE tax_rate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_real_estate_tax_rate ON real_estate(tax_rate) WHERE tax_rate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investments_tax_rate ON investments(tax_rate) WHERE tax_rate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_tax_rate ON transactions(tax_rate) WHERE tax_rate IS NOT NULL;

-- Add check constraints to ensure tax rates are within reasonable bounds (0-100%)
DO $$
BEGIN
  -- Income sources tax rate constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'income_sources_tax_rate_check'
  ) THEN
    ALTER TABLE income_sources ADD CONSTRAINT income_sources_tax_rate_check 
    CHECK (tax_rate >= 0 AND tax_rate <= 100);
  END IF;

  -- Real estate tax rate constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'real_estate_tax_rate_check'
  ) THEN
    ALTER TABLE real_estate ADD CONSTRAINT real_estate_tax_rate_check 
    CHECK (tax_rate >= 0 AND tax_rate <= 100);
  END IF;

  -- Investments tax rate constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'investments_tax_rate_check'
  ) THEN
    ALTER TABLE investments ADD CONSTRAINT investments_tax_rate_check 
    CHECK (tax_rate >= 0 AND tax_rate <= 100);
  END IF;

  -- Transactions tax rate constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'transactions_tax_rate_check'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_tax_rate_check 
    CHECK (tax_rate >= 0 AND tax_rate <= 100);
  END IF;
END $$;

-- Add comments to tax rate columns for better documentation
COMMENT ON COLUMN income_sources.tax_rate IS 'Tax rate percentage (0-100) applied to this income source';
COMMENT ON COLUMN real_estate.tax_rate IS 'Tax rate percentage (0-100) applied to real estate income/gains';
COMMENT ON COLUMN investments.tax_rate IS 'Tax rate percentage (0-100) applied to investment returns';
COMMENT ON COLUMN transactions.tax_rate IS 'Tax rate percentage (0-100) applied to this transaction';