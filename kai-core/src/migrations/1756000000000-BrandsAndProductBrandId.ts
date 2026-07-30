import { MigrationInterface, QueryRunner } from 'typeorm';

export class BrandsAndProductBrandId1756000000000 implements MigrationInterface {
  name = 'BrandsAndProductBrandId1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        name character varying(255) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP,
        CONSTRAINT "PK_brands" PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_brands_company_name"
      ON brands (company_id, name)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_brands_company_id" ON brands (company_id);
    `);
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS brand_id uuid;
    `);
    const fkProductsBrand: Array<{ exists: boolean }> = await queryRunner.query(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname = current_schema()
           AND t.relname = 'products'
           AND c.conname = 'FK_products_brand'
           AND c.contype = 'f'
       ) AS exists`,
    );
    if (!fkProductsBrand[0]?.exists) {
      await queryRunner.query(`
      ALTER TABLE products
      ADD CONSTRAINT "FK_products_brand"
      FOREIGN KEY (brand_id) REFERENCES brands(id)
      ON DELETE SET NULL ON UPDATE NO ACTION;
    `);
    }
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_brand_id" ON products (brand_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_brand_id";`);
    await queryRunner.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS "FK_products_brand";`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS brand_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_brands_company_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_brands_company_name";`);
    await queryRunner.query(`DROP TABLE IF EXISTS brands;`);
  }
}
