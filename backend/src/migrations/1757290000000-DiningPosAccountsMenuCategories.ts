import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiningPosAccountsMenuCategories1757290000000
  implements MigrationInterface
{
  name = 'DiningPosAccountsMenuCategories1757290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dining_branch_settings
      ADD COLUMN IF NOT EXISTS pos_accounts_menu_category_ids jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dining_branch_settings
      DROP COLUMN IF EXISTS pos_accounts_menu_category_ids
    `);
  }
}
