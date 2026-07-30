-- Same as 007-expense-categories-code-nullable.sql for MySQL / MariaDB.
-- Fecha: 2026-04-24

ALTER TABLE `expense_categories` MODIFY `code` VARCHAR(50) NULL;
