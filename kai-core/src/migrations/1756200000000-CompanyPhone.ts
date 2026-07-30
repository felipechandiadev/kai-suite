import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyPhone1756200000000 implements MigrationInterface {
  name = 'CompanyPhone1756200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS phone character varying(32);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN IF EXISTS phone;`);
  }
}
