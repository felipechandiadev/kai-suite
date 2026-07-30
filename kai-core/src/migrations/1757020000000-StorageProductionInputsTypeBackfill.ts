import { MigrationInterface, QueryRunner } from 'typeorm';

/** Backfill: categoría PRODUCTION_INPUT → type PRODUCTION_INPUTS. */
export class StorageProductionInputsTypeBackfill1757020000000
  implements MigrationInterface
{
  name = 'StorageProductionInputsTypeBackfill1757020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE storages
      SET type = 'PRODUCTION_INPUTS'
      WHERE category = 'PRODUCTION_INPUT'
        AND type IS DISTINCT FROM 'PRODUCTION_INPUTS';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE storages
      SET type = 'WAREHOUSE'
      WHERE category = 'PRODUCTION_INPUT'
        AND type = 'PRODUCTION_INPUTS';
    `);
  }
}
