-- Same migration as 005-taxes-code-nullable.sql, for MySQL / MariaDB only.
-- Date: 2026-04-24

ALTER TABLE `taxes` MODIFY `code` VARCHAR(20) NULL;
