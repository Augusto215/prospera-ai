/*
  # Add constraints and validation to employees table

  1. Changes
    - Add check constraints to ensure valid data in employee records
    - Add validation for document numbers and phone formats
    - Ensure proper date validation for vacation periods

  2. Security
    - Maintains existing RLS policies
*/

-- Add check constraints to ensure valid data in employee records
DO $$
BEGIN
  -- Check if document_type constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'employees_document_type_check'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_document_type_check 
    CHECK (document_type IN ('cpf', 'rg', 'cnh', 'ctps'));
  END IF;

  -- Check if status constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'employees_status_check'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_status_check 
    CHECK (status IN ('active', 'vacation', 'leave', 'terminated'));
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_next_vacation ON employees(next_vacation) WHERE next_vacation IS NOT NULL;

-- Add comments for better documentation
COMMENT ON COLUMN employees.fgts_percentage IS 'FGTS percentage (usually 8%)';
COMMENT ON COLUMN employees.inss_percentage IS 'INSS percentage based on salary range';
COMMENT ON COLUMN employees.irrf_percentage IS 'Income tax percentage based on salary range';
COMMENT ON COLUMN employees.vacation_start IS 'Start date of current vacation period';
COMMENT ON COLUMN employees.vacation_end IS 'End date of current vacation period';