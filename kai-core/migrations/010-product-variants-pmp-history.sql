-- Historial de PMP en JSON (valor vigente sigue en columna `pmp`).
-- Nombre de columna en camelCase alineado con entidades TypeORM por defecto.

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "pmpHistory" json;
