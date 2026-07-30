import { MigrationInterface, QueryRunner } from 'typeorm';

export class CourierRole1756770000000 implements MigrationInterface {
  name = 'CourierRole1756770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'users_rol_enum' AND e.enumlabel = 'COURIER'
        ) THEN
          ALTER TYPE "users_rol_enum" ADD VALUE 'COURIER';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL no permite quitar valores de enum de forma segura.
  }
}
