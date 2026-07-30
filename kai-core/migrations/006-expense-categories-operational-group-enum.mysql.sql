-- Same migration as 006-expense-categories-operational-group-enum.sql for MySQL / MariaDB.
-- Fecha: 2026-04-24

ALTER TABLE `expense_categories`
  ADD COLUMN `operational_expense_group` ENUM(
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
  ) NOT NULL DEFAULT 'PERDIDAS_AJUSTES_OPERATIVOS' AFTER `name`;

UPDATE expense_categories ec
SET operational_expense_group = CASE
  WHEN LOWER(IFNULL(ec.groupName, '')) LIKE '%personal%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%nómina%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%nomina%' THEN 'PERSONAL_NOMINA'
  WHEN LOWER(IFNULL(ec.groupName, '')) LIKE '%local%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%instal%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%arriendo%' THEN 'LOCALES_INSTALACIONES'
  WHEN LOWER(IFNULL(ec.groupName, '')) LIKE '%suminist%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%consum%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%epp%' THEN 'SUMINISTROS_CONSUMIBLES'
  WHEN LOWER(IFNULL(ec.groupName, '')) LIKE '%logíst%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%logist%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%flete%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%courier%' THEN 'LOGISTICA_DISTRIBUCION'
  WHEN LOWER(IFNULL(ec.groupName, '')) LIKE '%tech%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%sistema%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%software%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%pos%' THEN 'TECNOLOGIA_SISTEMAS'
  WHEN LOWER(IFNULL(ec.groupName, '')) LIKE '%market%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%comunic%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%promo%' THEN 'COMUNICACION_MARKETING_OPERATIVO'
  WHEN LOWER(IFNULL(ec.groupName, '')) LIKE '%extern%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%contab%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%legal%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%auditor%' THEN 'SERVICIOS_EXTERNOS'
  WHEN LOWER(IFNULL(ec.groupName, '')) LIKE '%financ%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%tesorer%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%banco%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%comisión%' THEN 'FINANCIEROS_TESORERIA'
  WHEN LOWER(IFNULL(ec.groupName, '')) LIKE '%merma%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%pérdida%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%perdida%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%ajuste%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%caja%' THEN 'PERDIDAS_AJUSTES_OPERATIVOS'
  WHEN LOWER(IFNULL(ec.groupName, '')) LIKE '%regul%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%cumpl%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%permiso%' OR LOWER(IFNULL(ec.groupName, '')) LIKE '%certif%' THEN 'REGULATORIO_CUMPLIMIENTO'
  ELSE 'PERDIDAS_AJUSTES_OPERATIVOS'
END;

-- Si el índice no existe (p. ej. BD nueva), ignorar el error de esta sentencia.
DROP INDEX `idx_expense_categories_groupName` ON `expense_categories`;

ALTER TABLE `expense_categories` DROP COLUMN `groupName`;
