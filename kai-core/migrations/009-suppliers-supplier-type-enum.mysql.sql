-- Same migration as 009-suppliers-supplier-type-enum.sql, for MySQL / MariaDB only.
-- - Removes legacy LOCAL
-- - Adds SERVICE_PROVIDER, CONTRACTOR, LOGISTICS, IMPORTER
-- - Re-maps existing LOCAL rows to DISTRIBUTOR

UPDATE `suppliers`
SET `supplierType` = 'DISTRIBUTOR'
WHERE `supplierType` = 'LOCAL';

ALTER TABLE `suppliers`
  MODIFY COLUMN `supplierType` ENUM(
    'MANUFACTURER',
    'DISTRIBUTOR',
    'WHOLESALER',
    'SERVICE_PROVIDER',
    'CONTRACTOR',
    'LOGISTICS',
    'IMPORTER'
  ) NOT NULL DEFAULT 'DISTRIBUTOR';

