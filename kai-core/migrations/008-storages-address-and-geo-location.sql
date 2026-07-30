-- Migration: Storages address + geo location (lat/lng)
-- - Renames legacy `storages.location` (text) -> `storages.address`
-- - Adds new `storages.location` JSON column (lat/lng), like branches.location

ALTER TABLE storages RENAME COLUMN location TO address;
ALTER TABLE storages ADD COLUMN location json;

