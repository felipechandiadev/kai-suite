import { MigrationInterface, QueryRunner } from 'typeorm';

export class HcmJornadaPeriods1757600000000 implements MigrationInterface {
  name = 'HcmJornadaPeriods1757600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr_jornada_periods (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'DRAFT',
        "closedAt" timestamptz NULL,
        "closedByUserId" uuid NULL,
        "snapshotJson" jsonb NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hr_jornada_periods_company_start"
      ON hr_jornada_periods ("companyId", "periodStart")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hr_jornada_periods`);
  }
}
