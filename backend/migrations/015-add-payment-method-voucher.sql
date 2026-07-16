-- Medio de pago: VOUCHER (documento / vale de tercero)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'transactions_paymentmethod_enum'
      AND e.enumlabel = 'VOUCHER'
  ) THEN
    ALTER TYPE transactions_paymentmethod_enum ADD VALUE 'VOUCHER';
  END IF;
END $$;
