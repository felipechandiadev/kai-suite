-- Align Postgres enums with TransactionType (capital / giro a caja).
-- accounting_rules and transactions use separate enum types in TypeORM.

ALTER TYPE accounting_rules_transactiontype_enum ADD VALUE IF NOT EXISTS 'CAPITAL_CONTRIBUTION';
ALTER TYPE accounting_rules_transactiontype_enum ADD VALUE IF NOT EXISTS 'CASH_WITHDRAWAL_TO_PETTY_CASH';

ALTER TYPE transactions_transactiontype_enum ADD VALUE IF NOT EXISTS 'CAPITAL_CONTRIBUTION';
ALTER TYPE transactions_transactiontype_enum ADD VALUE IF NOT EXISTS 'CASH_WITHDRAWAL_TO_PETTY_CASH';
