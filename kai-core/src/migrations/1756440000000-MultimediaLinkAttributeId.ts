import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Vincula multimedia de variante a un atributo de catálogo (p. ej. Color, Talla).
 * NULL = galería general de la variante.
 */
export class MultimediaLinkAttributeId1756440000000 implements MigrationInterface {
  name = 'MultimediaLinkAttributeId1756440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "multimedia_links"
      ADD COLUMN IF NOT EXISTS "attribute_id" uuid NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_multimedia_links_entity_attribute"
      ON "multimedia_links" ("entityType", "entityId", "attribute_id");
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_multimedia_links_attribute_id'
        ) THEN
          ALTER TABLE "multimedia_links"
          ADD CONSTRAINT "FK_multimedia_links_attribute_id"
          FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "multimedia_links"
      DROP CONSTRAINT IF EXISTS "FK_multimedia_links_attribute_id";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_multimedia_links_entity_attribute";
    `);
    await queryRunner.query(`
      ALTER TABLE "multimedia_links"
      DROP COLUMN IF EXISTS "attribute_id";
    `);
  }
}
