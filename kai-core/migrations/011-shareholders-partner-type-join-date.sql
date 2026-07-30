-- Migration: Shareholders partner fields (socios)
-- TypeORM default column names for this entity are camelCase (quoted in PostgreSQL).

ALTER TABLE shareholders
  ADD COLUMN IF NOT EXISTS "partnerType" character varying(60);

ALTER TABLE shareholders
  ADD COLUMN IF NOT EXISTS "joinDate" date;
