-- Migration: Add examples column to expense_categories
-- Date: 2026-02-22
-- Description: Adds JSON array field for expense category examples

ALTER TABLE `expense_categories` 
ADD COLUMN `examples` JSON NULL AFTER `isActive`;

-- Set default empty array for existing records
UPDATE `expense_categories` SET `examples` = JSON_ARRAY() WHERE `examples` IS NULL;

-- Verification
SELECT 'expense_categories' as table_name, 
       COUNT(*) as total_rows,
       COUNT(CASE WHEN examples IS NOT NULL THEN 1 END) as with_examples
FROM expense_categories;
