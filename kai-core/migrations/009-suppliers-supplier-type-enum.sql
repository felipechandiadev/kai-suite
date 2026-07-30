-- Migration: refresh suppliers supplierType enum (PostgreSQL)
-- - Removes legacy LOCAL
-- - Adds SERVICE_PROVIDER, CONTRACTOR, LOGISTICS, IMPORTER
-- - Re-maps existing LOCAL rows to DISTRIBUTOR

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'suppliers_suppliertype_enum'
  ) THEN
    UPDATE suppliers
    SET "supplierType" = 'DISTRIBUTOR'
    WHERE "supplierType"::text = 'LOCAL';

    ALTER TYPE suppliers_suppliertype_enum RENAME TO suppliers_suppliertype_enum_old;

    CREATE TYPE suppliers_suppliertype_enum AS ENUM (
      'MANUFACTURER',
      'DISTRIBUTOR',
      'WHOLESALER',
      'SERVICE_PROVIDER',
      'CONTRACTOR',
      'LOGISTICS',
      'IMPORTER'
    );

    ALTER TABLE suppliers
      ALTER COLUMN "supplierType" DROP DEFAULT;

    ALTER TABLE suppliers
      ALTER COLUMN "supplierType" TYPE suppliers_suppliertype_enum
      USING "supplierType"::text::suppliers_suppliertype_enum;

    DROP TYPE suppliers_suppliertype_enum_old;

    ALTER TABLE suppliers
      ALTER COLUMN "supplierType" SET DEFAULT 'DISTRIBUTOR';
  END IF;
END $$;

