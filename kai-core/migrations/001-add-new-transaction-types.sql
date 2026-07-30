-- Migration: Add new TransactionType enum values
-- Date: 2026-02-22
-- Description: Adds SUPPLIER_PAYMENT, EXPENSE_PAYMENT, and CASH_SESSION_CLOSING to transactionType columns

-- Step 1: Modify the transactions table
ALTER TABLE `transactions` 
MODIFY COLUMN `transactionType` ENUM(
  'SALE',
  'PURCHASE',
  'PURCHASE_ORDER',
  'SALE_RETURN',
  'PURCHASE_RETURN',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'PAYMENT_IN',
  'PAYMENT_OUT',
  'SUPPLIER_PAYMENT',
  'EXPENSE_PAYMENT',
  'PAYMENT_EXECUTION',
  'CASH_DEPOSIT',
  'OPERATING_EXPENSE',
  'CASH_SESSION_OPENING',
  'CASH_SESSION_CLOSING',
  'CASH_SESSION_WITHDRAWAL',
  'CASH_SESSION_DEPOSIT',
  'PAYROLL',
  'BANK_WITHDRAWAL_TO_SHAREHOLDER'
) NOT NULL;

-- Step 2: Modify the accounting_rules table
ALTER TABLE `accounting_rules` 
MODIFY COLUMN `transactionType` ENUM(
  'SALE',
  'PURCHASE',
  'PURCHASE_ORDER',
  'SALE_RETURN',
  'PURCHASE_RETURN',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'PAYMENT_IN',
  'PAYMENT_OUT',
  'SUPPLIER_PAYMENT',
  'EXPENSE_PAYMENT',
  'PAYMENT_EXECUTION',
  'CASH_DEPOSIT',
  'OPERATING_EXPENSE',
  'CASH_SESSION_OPENING',
  'CASH_SESSION_CLOSING',
  'CASH_SESSION_WITHDRAWAL',
  'CASH_SESSION_DEPOSIT',
  'PAYROLL',
  'BANK_WITHDRAWAL_TO_SHAREHOLDER'
) NOT NULL;

-- Verification queries
SELECT 'transactions' as table_name, COUNT(*) as count, transactionType 
FROM transactions 
GROUP BY transactionType;

SELECT 'accounting_rules' as table_name, COUNT(*) as count, transactionType 
FROM accounting_rules 
GROUP BY transactionType;
