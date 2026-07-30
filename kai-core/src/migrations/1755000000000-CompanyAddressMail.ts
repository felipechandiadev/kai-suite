import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyAddressMail1755000000000 implements MigrationInterface {
  name = 'CompanyAddressMail1755000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS address character varying(500);
    `);
    await queryRunner.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS mail character varying(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN IF EXISTS mail;`);
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN IF EXISTS address;`);
  }
}
