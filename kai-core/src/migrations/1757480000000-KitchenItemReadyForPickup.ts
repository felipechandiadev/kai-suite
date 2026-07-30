import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Separa listo cocina (READY) de listo para retirar (READY_FOR_PICKUP → Kai Board).
 */
export class KitchenItemReadyForPickup1757480000000
  implements MigrationInterface
{
  name = 'KitchenItemReadyForPickup1757480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "kitchen_item_status_enum" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // Postgres no permite quitar un valor de enum de forma segura sin recrear el tipo.
  }
}
