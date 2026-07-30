import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiningOpenTablePolicy1756960000000 implements MigrationInterface {
  name = 'DiningOpenTablePolicy1756960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dining_branch_settings
      ADD COLUMN IF NOT EXISTS allow_waiter_open_table boolean NOT NULL DEFAULT true;
    `);
    await queryRunner.query(`
      ALTER TABLE dining_branch_settings
      ADD COLUMN IF NOT EXISTS allow_pos_open_table boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dining_branch_settings
      DROP COLUMN IF EXISTS allow_pos_open_table;
    `);
    await queryRunner.query(`
      ALTER TABLE dining_branch_settings
      DROP COLUMN IF EXISTS allow_waiter_open_table;
    `);
  }
}
