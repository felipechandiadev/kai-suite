import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultimediaVariantsAndOptimization1757440000000
  implements MigrationInterface
{
  name = 'MultimediaVariantsAndOptimization1757440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "multimedia_assets"
      ADD COLUMN IF NOT EXISTS "optimization_status" varchar(20) NOT NULL DEFAULT 'skipped';
    `);
    await queryRunner.query(`
      ALTER TABLE "multimedia_assets"
      ADD COLUMN IF NOT EXISTS "width" integer NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "multimedia_assets"
      ADD COLUMN IF NOT EXISTS "height" integer NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "multimedia_variants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "asset_id" uuid NOT NULL,
        "variant_type" varchar(40) NOT NULL,
        "format" varchar(10) NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "size" bigint NOT NULL,
        "storage_key" varchar(500) NOT NULL,
        "public_url" varchar(500) NOT NULL,
        "quality" integer NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_multimedia_variants" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_multimedia_variants_asset_type_format"
          UNIQUE ("asset_id", "variant_type", "format"),
        CONSTRAINT "FK_multimedia_variants_asset_id"
          FOREIGN KEY ("asset_id") REFERENCES "multimedia_assets"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_multimedia_variants_asset_id"
      ON "multimedia_variants" ("asset_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "multimedia_variants"`);
    await queryRunner.query(`
      ALTER TABLE "multimedia_assets" DROP COLUMN IF EXISTS "height";
    `);
    await queryRunner.query(`
      ALTER TABLE "multimedia_assets" DROP COLUMN IF EXISTS "width";
    `);
    await queryRunner.query(`
      ALTER TABLE "multimedia_assets" DROP COLUMN IF EXISTS "optimization_status";
    `);
  }
}
