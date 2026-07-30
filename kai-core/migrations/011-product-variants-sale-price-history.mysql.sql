-- Historial de precios de venta (JSON append-only en aplicación).
ALTER TABLE `product_variants` ADD COLUMN `salePriceHistory` JSON NULL;
