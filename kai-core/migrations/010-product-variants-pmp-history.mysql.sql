-- Same as 010-product-variants-pmp-history.sql for MySQL / MariaDB.

ALTER TABLE `product_variants` ADD COLUMN `pmpHistory` JSON NULL;
