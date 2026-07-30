-- Medios de pago: CUSTOMER_CREDIT_NOTE, ORDER_ADVANCE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'transactions_paymentmethod_enum'
      AND e.enumlabel = 'CUSTOMER_CREDIT_NOTE'
  ) THEN
    ALTER TYPE transactions_paymentmethod_enum ADD VALUE 'CUSTOMER_CREDIT_NOTE';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'transactions_paymentmethod_enum'
      AND e.enumlabel = 'ORDER_ADVANCE'
  ) THEN
    ALTER TYPE transactions_paymentmethod_enum ADD VALUE 'ORDER_ADVANCE';
  END IF;
END $$;
