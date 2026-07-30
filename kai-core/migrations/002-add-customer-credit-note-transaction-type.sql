-- Nota de crédito a cliente (CUSTOMER_CREDIT_NOTE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'transactions_transactiontype_enum'
      AND e.enumlabel = 'CUSTOMER_CREDIT_NOTE'
  ) THEN
    ALTER TYPE transactions_transactiontype_enum ADD VALUE 'CUSTOMER_CREDIT_NOTE';
  END IF;
END $$;
