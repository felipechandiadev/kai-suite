import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceptionDteFields1754000000000 implements MigrationInterface {
  name = 'ReceptionDteFields1754000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "receptions"
      ADD COLUMN IF NOT EXISTS "dteNumber" character varying(128) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "receptions"
      ADD COLUMN IF NOT EXISTS "dteType" character varying(32) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "receptions" DROP COLUMN IF EXISTS "dteType";
    `);
    await queryRunner.query(`
      ALTER TABLE "receptions" DROP COLUMN IF EXISTS "dteNumber";
    `);
  }
}

