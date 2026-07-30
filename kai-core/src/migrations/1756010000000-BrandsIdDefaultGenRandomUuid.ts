import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas `brands` creadas sin DEFAULT en `id` hacen que TypeORM inserte `DEFAULT`
 * y Postgres deje `id` en NULL. Alinea con `gen_random_uuid()` (PG ≥13).
 */
export class BrandsIdDefaultGenRandomUuid1756010000000 implements MigrationInterface {
  name = 'BrandsIdDefaultGenRandomUuid1756010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'brands'
        ) THEN
          ALTER TABLE brands
          ALTER COLUMN id SET DEFAULT gen_random_uuid();
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'brands'
        ) THEN
          ALTER TABLE brands
          ALTER COLUMN id DROP DEFAULT;
        END IF;
      END $$;
    `);
  }
}
