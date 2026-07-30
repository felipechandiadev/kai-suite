-- Migration: Add groupName column to expense_categories
-- Date: 2026-02-22
-- Description: Adds field to group expenses by category type

ALTER TABLE `expense_categories` 
ADD COLUMN `groupName` VARCHAR(100) NULL AFTER `name`;

-- Create indexes for better query performance
CREATE INDEX idx_expense_categories_groupName ON `expense_categories`(`groupName`);

-- Verification
SELECT 'expense_categories' as table_name, 
       COUNT(*) as total_rows,
       COUNT(DISTINCT groupName) as unique_groups
FROM expense_categories;
