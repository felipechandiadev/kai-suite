import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Anulación operativa de cuentas dining (VOID), distinta de cobro (CLOSED).
 */
export class DiningOrderStatusVoid1757680000000 implements MigrationInterface {
  name = 'DiningOrderStatusVoid1757680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "dining_order_status_enum" ADD VALUE IF NOT EXISTS 'VOID';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // Postgres no permite quitar un valor de enum de forma segura sin recrear el tipo.
  }
}
