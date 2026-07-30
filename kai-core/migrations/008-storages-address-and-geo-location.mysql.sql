-- Same migration as 008-storages-address-and-geo-location.sql, for MySQL / MariaDB only.
-- - Renames legacy `storages.location` (text) -> `storages.address`
-- - Adds new `storages.location` JSON column (lat/lng)

ALTER TABLE `storages` CHANGE COLUMN `location` `address` VARCHAR(500) NULL;
ALTER TABLE `storages` ADD COLUMN `location` JSON NULL;

