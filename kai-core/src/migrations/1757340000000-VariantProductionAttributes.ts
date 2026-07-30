import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Atributos de producción por variante MANUFACTURADO (definición + opciones).
 * Soft-delete para preservar FKs en Fase 2 (lotes).
 */
export class VariantProductionAttributes1757340000000
  implements MigrationInterface
{
  name = 'VariantProductionAttributes1757340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_variant_production_attributes (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        product_variant_id uuid NOT NULL,
        name varchar(120) NOT NULL,
        description text NULL,
        tag_key varchar(64) NULL,
        tag_label varchar(80) NULL,
        display_order int NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        CONSTRAINT "PK_pv_production_attributes" PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pv_prod_attrs_company_variant"
      ON product_variant_production_attributes (company_id, product_variant_id)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pv_prod_attrs_tag_key"
      ON product_variant_production_attributes (company_id, tag_key)
      WHERE deleted_at IS NULL AND tag_key IS NOT NULL;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_pv_prod_attrs_variant'
        ) THEN
          ALTER TABLE product_variant_production_attributes
            ADD CONSTRAINT "FK_pv_prod_attrs_variant"
            FOREIGN KEY (product_variant_id)
            REFERENCES product_variants(id)
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_variant_production_attribute_options (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL,
        attribute_id uuid NOT NULL,
        label varchar(120) NOT NULL,
        display_order int NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        CONSTRAINT "PK_pv_production_attr_options" PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pv_prod_attr_opts_attribute"
      ON product_variant_production_attribute_options (attribute_id)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_pv_prod_attr_opts_attribute'
        ) THEN
          ALTER TABLE product_variant_production_attribute_options
            ADD CONSTRAINT "FK_pv_prod_attr_opts_attribute"
            FOREIGN KEY (attribute_id)
            REFERENCES product_variant_production_attributes(id)
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_variant_production_attribute_options
      DROP CONSTRAINT IF EXISTS "FK_pv_prod_attr_opts_attribute";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS product_variant_production_attribute_options;
    `);
    await queryRunner.query(`
      ALTER TABLE product_variant_production_attributes
      DROP CONSTRAINT IF EXISTS "FK_pv_prod_attrs_variant";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS product_variant_production_attributes;
    `);
  }
}
