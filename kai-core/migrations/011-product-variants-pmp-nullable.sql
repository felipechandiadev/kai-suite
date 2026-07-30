-- PMP nullable hasta primera compra valorada (sin default 0).
ALTER TABLE product_variants ALTER COLUMN pmp DROP DEFAULT;
ALTER TABLE product_variants ALTER COLUMN pmp DROP NOT NULL;
