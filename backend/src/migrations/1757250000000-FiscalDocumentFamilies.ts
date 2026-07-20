import { MigrationInterface, QueryRunner } from 'typeorm';

export class FiscalDocumentFamilies1757250000000 implements MigrationInterface {
  name = 'FiscalDocumentFamilies1757250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fiscal_profiles"
      ADD COLUMN IF NOT EXISTS "enabled_document_families" jsonb NOT NULL DEFAULT '{"boleta":true,"factura":false,"notaCredito":false,"guiaDespacho":false}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fiscal_profiles"
      DROP COLUMN IF EXISTS "enabled_document_families"
    `);
  }
}
