import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanySiiEmisorFields1756580000000 implements MigrationInterface {
  name = 'CompanySiiEmisorFields1756580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS commune character varying(120);
    `);
    await queryRunner.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS city character varying(120);
    `);
    await queryRunner.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS sii_resolution_number character varying(64);
    `);
    await queryRunner.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS sii_resolution_date date;
    `);

    await queryRunner.query(`
      UPDATE companies c SET
        commune = COALESCE(NULLIF(TRIM(c.commune), ''), fp.commune),
        city = COALESCE(NULLIF(TRIM(c.city), ''), fp.city),
        sii_resolution_number = COALESCE(NULLIF(TRIM(c.sii_resolution_number), ''), fp.resolution_number),
        sii_resolution_date = COALESCE(c.sii_resolution_date, fp.resolution_date),
        razon_social = COALESCE(NULLIF(TRIM(c.razon_social), ''), fp.legal_name),
        business_activity = COALESCE(c.business_activity, fp.business_activity),
        address = COALESCE(c.address, fp.address),
        rut = COALESCE(NULLIF(TRIM(c.rut), ''), fp.rut)
      FROM fiscal_profiles fp
      WHERE fp.company_id = c.id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN IF EXISTS sii_resolution_date;`);
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN IF EXISTS sii_resolution_number;`);
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN IF EXISTS city;`);
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN IF EXISTS commune;`);
  }
}
