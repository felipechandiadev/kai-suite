-- Migration: Add source and payee fields to installments table
-- Purpose: Generalize installments to support all payment obligations (PURCHASE, PAYROLL, OPERATING_EXPENSE, SALE)
-- Date: 2026-02-26

-- Step 1: Add sourceType column (defaults to SALE for backward compatibility)
ALTER TABLE installments
ADD COLUMN "sourceType" VARCHAR(50) NOT NULL DEFAULT 'SALE';

-- Step 2: Add sourceTransactionId (generic replacement for saleTransactionId)
ALTER TABLE installments
ADD COLUMN "sourceTransactionId" UUID;

-- Step 3: Add payee identification fields
ALTER TABLE installments
ADD COLUMN "payeeType" VARCHAR(50);

ALTER TABLE installments
ADD COLUMN "payeeId" VARCHAR(255);

-- Step 4: Migrate existing data - copy saleTransactionId to sourceTransactionId for all SALE installments
UPDATE installments
SET "sourceTransactionId" = "saleTransactionId"
WHERE "saleTransactionId" IS NOT NULL;

-- Step 5: Make saleTransactionId nullable (deprecating it, kept for backward compatibility)
ALTER TABLE installments
ALTER COLUMN "saleTransactionId" DROP NOT NULL;

-- Step 6: Add indexes for new query patterns
CREATE INDEX "idx_installments_source" ON installments("sourceType", "sourceTransactionId");
CREATE INDEX "idx_installments_payee" ON installments("payeeType", "payeeId");

-- Step 7: Add comments for documentation
COMMENT ON COLUMN installments."sourceType" IS 'Type of source transaction: SALE, PURCHASE, PAYROLL, OPERATING_EXPENSE';
COMMENT ON COLUMN installments."sourceTransactionId" IS 'Generic reference to source transaction (replaces saleTransactionId)';
COMMENT ON COLUMN installments."payeeType" IS 'Type of payee: CUSTOMER, SUPPLIER, EMPLOYEE, OTHER';
COMMENT ON COLUMN installments."payeeId" IS 'ID of the payee according to payeeType';
COMMENT ON COLUMN installments."saleTransactionId" IS 'DEPRECATED: Use sourceTransactionId. Kept for backward compatibility.';

-- Rollback instructions (if needed):
-- ALTER TABLE installments DROP COLUMN "sourceType";
-- ALTER TABLE installments DROP COLUMN "sourceTransactionId";
-- ALTER TABLE installments DROP COLUMN "payeeType";
-- ALTER TABLE installments DROP COLUMN "payeeId";
-- ALTER TABLE installments ALTER COLUMN "saleTransactionId" SET NOT NULL;
-- DROP INDEX "idx_installments_source";
-- DROP INDEX "idx_installments_payee";
