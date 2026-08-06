import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiningTableIsActive1757670000000 implements MigrationInterface {
  name = 'DiningTableIsActive1757670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dining_tables
      ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dining_tables
      DROP COLUMN IF EXISTS is_active
    `);
  }
}
