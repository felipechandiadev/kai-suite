-- PMP nullable hasta primera compra valorada (sin default 0).
ALTER TABLE `product_variants` MODIFY COLUMN `pmp` DECIMAL(15,2) NULL DEFAULT NULL;
