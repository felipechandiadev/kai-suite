-- Habilitado automáticamente en bases Docker nuevas (volumen limpio).
-- Requiere imagen postgis/postgis. En volúmenes existentes el init no se re-ejecuta:
-- ver docs/project/POSTGIS-DELIVERY.md
CREATE EXTENSION IF NOT EXISTS postgis;
