import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduce el rol SUPER_ADMIN (cliente-facing, sin empresa) separado del
 * ADMIN (atado a una empresa). Migra los ADMIN existentes que tienen
 * company_id NULL a SUPER_ADMIN, ajusta el CHECK constraint y agrega la
 * columna `nonDeletable` para proteger usuarios (típicamente el seed
 * super-admin de "Administrador de Sistema").
 */
export class SuperAdminRoleAndUserNonDeletable1749000000000
  implements MigrationInterface
{
  name = 'SuperAdminRoleAndUserNonDeletable1749000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const enumHasSuperAdmin: Array<{ exists: boolean }> =
      await queryRunner.query(
        `SELECT EXISTS (
           SELECT 1 FROM pg_enum e
           JOIN pg_type t ON t.oid = e.enumtypid
           WHERE t.typname = 'users_rol_enum' AND e.enumlabel = 'SUPER_ADMIN'
         ) AS exists`,
      );
    if (!enumHasSuperAdmin[0]?.exists) {
      await queryRunner.query(
        `ALTER TYPE "users_rol_enum" ADD VALUE 'SUPER_ADMIN'`,
      );
    }

    await queryRunner.query(
      `UPDATE "users"
         SET "rol" = 'SUPER_ADMIN'
       WHERE "rol" = 'ADMIN' AND "company_id" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_company_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users"
         ADD CONSTRAINT "users_role_company_chk"
         CHECK (
           (rol = 'SUPER_ADMIN' AND company_id IS NULL)
           OR (rol <> 'SUPER_ADMIN' AND company_id IS NOT NULL)
         )`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nonDeletable" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "nonDeletable"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_company_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users"
         ADD CONSTRAINT "users_role_company_chk"
         CHECK (
           (rol = 'ADMIN' AND company_id IS NULL)
           OR (rol = 'OPERATOR' AND company_id IS NOT NULL)
         )`,
    );

    await queryRunner.query(
      `UPDATE "users" SET "rol" = 'ADMIN' WHERE "rol" = 'SUPER_ADMIN'`,
    );
  }
}
