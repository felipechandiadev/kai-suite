-- Teléfono de contacto en empresa (columna dedicada).
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone character varying(32);
