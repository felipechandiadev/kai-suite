import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Bootstrap idempotente para el schema de `users`:
 *
 * 1. Asegura que el enum `users_rol_enum` incluya `SUPER_ADMIN`.
 * 2. Migra los `ADMIN` legacy con `company_id IS NULL` → `SUPER_ADMIN`.
 * 3. Reemplaza el CHECK `users_role_company_chk` por la versión nueva:
 *      SUPER_ADMIN → company_id IS NULL
 *      otros roles → company_id IS NOT NULL
 * 4. Agrega columna `nonDeletable boolean NOT NULL DEFAULT false`.
 *
 * Cubre instalaciones que no corren `migration:run` y entornos creados con
 * `DB_SYNCHRONIZE=true`. Mismo patrón que `QuotationsEnumBootstrap`.
 */
@Injectable()
export class UsersSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(UsersSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSuperAdminEnumValue();
    await this.ensureExtendedRoleEnumValues();
    await this.migrateLegacyAdmins();
    await this.refreshRoleCompanyCheckConstraint();
    await this.ensureNonDeletableColumn();
  }

  private async ensureExtendedRoleEnumValues(): Promise<void> {
    const labels = [
      'COURIER',
      'POS_OPERATOR',
      'SUB_ADMIN',
      'WAITER',
      'STOCK_OPERATOR',
      'KDS_OPERATOR',
    ];
    for (const label of labels) {
      try {
        await this.dataSource.query(
          `ALTER TYPE "users_rol_enum" ADD VALUE IF NOT EXISTS '${label}'`,
        );
      } catch (err) {
        this.logger.warn(
          `No se pudo asegurar ${label} en users_rol_enum: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  private async ensureSuperAdminEnumValue(): Promise<void> {
    try {
      const exists = await this.dataSource.query<{ exists: boolean }[]>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_type t
           JOIN pg_enum e ON t.oid = e.enumtypid
           WHERE t.typname = 'users_rol_enum' AND e.enumlabel = 'SUPER_ADMIN'
         ) AS exists`,
      );
      if (exists?.[0]?.exists) return;

      this.logger.warn(
        'Valor SUPER_ADMIN no presente en users_rol_enum; agregándolo con ALTER TYPE.',
      );
      await this.dataSource.query(
        `ALTER TYPE "users_rol_enum" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`,
      );
      this.logger.log('Valor SUPER_ADMIN asegurado en users_rol_enum.');
    } catch (err) {
      this.logger.error(
        `No se pudo asegurar SUPER_ADMIN en users_rol_enum: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async migrateLegacyAdmins(): Promise<void> {
    try {
      await this.dataSource.query(
        `UPDATE "users"
           SET "rol" = 'SUPER_ADMIN'
         WHERE "rol" = 'ADMIN' AND "company_id" IS NULL`,
      );
    } catch (err) {
      this.logger.error(
        `No se pudo migrar ADMIN legacy a SUPER_ADMIN: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async refreshRoleCompanyCheckConstraint(): Promise<void> {
    try {
      const current = await this.dataSource.query<
        Array<{ pg_get_constraintdef: string }>
      >(
        `SELECT pg_get_constraintdef(c.oid)
           FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           WHERE t.relname = 'users' AND c.conname = 'users_role_company_chk'`,
      );
      const def = current?.[0]?.pg_get_constraintdef ?? '';
      if (def.includes('SUPER_ADMIN')) return;

      this.logger.warn(
        'Actualizando CHECK users_role_company_chk a la versión con SUPER_ADMIN.',
      );
      await this.dataSource.query(
        `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_company_chk"`,
      );
      await this.dataSource.query(
        `ALTER TABLE "users"
           ADD CONSTRAINT "users_role_company_chk"
           CHECK (
             (rol = 'SUPER_ADMIN' AND company_id IS NULL)
             OR (rol <> 'SUPER_ADMIN' AND company_id IS NOT NULL)
           )`,
      );
    } catch (err) {
      this.logger.error(
        `No se pudo refrescar users_role_company_chk: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async ensureNonDeletableColumn(): Promise<void> {
    try {
      await this.dataSource.query(
        `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nonDeletable" boolean NOT NULL DEFAULT false`,
      );
    } catch (err) {
      this.logger.error(
        `No se pudo asegurar columna nonDeletable en users: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
