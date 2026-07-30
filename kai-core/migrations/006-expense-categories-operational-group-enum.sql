-- Migration: Reemplazar groupName (texto libre) por operational_expense_group (enum de negocio).
-- Dialect: PostgreSQL (DB_TYPE=postgres en kai-core/.env.example)
-- Fecha: 2026-04-24

CREATE TYPE expense_category_operational_group AS ENUM (
  'PERSONAL_NOMINA',
  'LOCALES_INSTALACIONES',
  'SUMINISTROS_CONSUMIBLES',
  'LOGISTICA_DISTRIBUCION',
  'TECNOLOGIA_SISTEMAS',
  'COMUNICACION_MARKETING_OPERATIVO',
  'SERVICIOS_EXTERNOS',
  'FINANCIEROS_TESORERIA',
  'PERDIDAS_AJUSTES_OPERATIVOS',
  'REGULATORIO_CUMPLIMIENTO'
);

ALTER TABLE expense_categories
  ADD COLUMN operational_expense_group expense_category_operational_group NOT NULL
  DEFAULT 'PERDIDAS_AJUSTES_OPERATIVOS';

UPDATE expense_categories ec
SET operational_expense_group = sub.g::expense_category_operational_group
FROM (
  SELECT
    id,
    CASE
      WHEN LOWER(COALESCE("groupName", '')) LIKE '%personal%' OR LOWER(COALESCE("groupName", '')) LIKE '%nómina%' OR LOWER(COALESCE("groupName", '')) LIKE '%nomina%' THEN 'PERSONAL_NOMINA'
      WHEN LOWER(COALESCE("groupName", '')) LIKE '%local%' OR LOWER(COALESCE("groupName", '')) LIKE '%instal%' OR LOWER(COALESCE("groupName", '')) LIKE '%arriendo%' THEN 'LOCALES_INSTALACIONES'
      WHEN LOWER(COALESCE("groupName", '')) LIKE '%suminist%' OR LOWER(COALESCE("groupName", '')) LIKE '%consum%' OR LOWER(COALESCE("groupName", '')) LIKE '%epp%' THEN 'SUMINISTROS_CONSUMIBLES'
      WHEN LOWER(COALESCE("groupName", '')) LIKE '%logíst%' OR LOWER(COALESCE("groupName", '')) LIKE '%logist%' OR LOWER(COALESCE("groupName", '')) LIKE '%flete%' OR LOWER(COALESCE("groupName", '')) LIKE '%courier%' THEN 'LOGISTICA_DISTRIBUCION'
      WHEN LOWER(COALESCE("groupName", '')) LIKE '%tech%' OR LOWER(COALESCE("groupName", '')) LIKE '%sistema%' OR LOWER(COALESCE("groupName", '')) LIKE '%software%' OR LOWER(COALESCE("groupName", '')) LIKE '%pos%' THEN 'TECNOLOGIA_SISTEMAS'
      WHEN LOWER(COALESCE("groupName", '')) LIKE '%market%' OR LOWER(COALESCE("groupName", '')) LIKE '%comunic%' OR LOWER(COALESCE("groupName", '')) LIKE '%promo%' THEN 'COMUNICACION_MARKETING_OPERATIVO'
      WHEN LOWER(COALESCE("groupName", '')) LIKE '%extern%' OR LOWER(COALESCE("groupName", '')) LIKE '%contab%' OR LOWER(COALESCE("groupName", '')) LIKE '%legal%' OR LOWER(COALESCE("groupName", '')) LIKE '%auditor%' THEN 'SERVICIOS_EXTERNOS'
      WHEN LOWER(COALESCE("groupName", '')) LIKE '%financ%' OR LOWER(COALESCE("groupName", '')) LIKE '%tesorer%' OR LOWER(COALESCE("groupName", '')) LIKE '%banco%' OR LOWER(COALESCE("groupName", '')) LIKE '%comisión%' THEN 'FINANCIEROS_TESORERIA'
      WHEN LOWER(COALESCE("groupName", '')) LIKE '%merma%' OR LOWER(COALESCE("groupName", '')) LIKE '%pérdida%' OR LOWER(COALESCE("groupName", '')) LIKE '%perdida%' OR LOWER(COALESCE("groupName", '')) LIKE '%ajuste%' OR LOWER(COALESCE("groupName", '')) LIKE '%caja%' THEN 'PERDIDAS_AJUSTES_OPERATIVOS'
      WHEN LOWER(COALESCE("groupName", '')) LIKE '%regul%' OR LOWER(COALESCE("groupName", '')) LIKE '%cumpl%' OR LOWER(COALESCE("groupName", '')) LIKE '%permiso%' OR LOWER(COALESCE("groupName", '')) LIKE '%certif%' THEN 'REGULATORIO_CUMPLIMIENTO'
      ELSE 'PERDIDAS_AJUSTES_OPERATIVOS'
    END AS g
  FROM expense_categories
) AS sub
WHERE ec.id = sub.id;

DROP INDEX IF EXISTS idx_expense_categories_groupname;
DROP INDEX IF EXISTS "idx_expense_categories_groupName";

ALTER TABLE expense_categories DROP COLUMN IF EXISTS "groupName";
