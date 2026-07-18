import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Memberships multi-rol / multi-empresa + backfill desde users.rol / company_id.
 * También añade valores de enum legacy y tabla user_company_persons (vínculo Person).
 */
export class UserCompanyMemberships1757100000000 implements MigrationInterface {
  name = 'UserCompanyMemberships1757100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extender enum users_rol_enum con roles nuevos (legacy dual-write).
    for (const label of [
      'POS_OPERATOR',
      'SUB_ADMIN',
      'WAITER',
      'STOCK_OPERATOR',
      'KDS_OPERATOR',
    ]) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'users_rol_enum' AND e.enumlabel = '${label}'
          ) THEN
            ALTER TYPE "users_rol_enum" ADD VALUE '${label}';
          END IF;
        END $$;
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_company_memberships" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "is_owner" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_user_company_memberships_user_company" UNIQUE ("user_id", "company_id"),
        CONSTRAINT "fk_ucm_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ucm_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ucm_user_id" ON "user_company_memberships" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ucm_company_id" ON "user_company_memberships" ("company_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_ucm_one_owner_per_company"
      ON "user_company_memberships" ("company_id")
      WHERE "is_owner" = true AND "is_active" = true
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_company_roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "membership_id" uuid NOT NULL,
        "role" varchar(40) NOT NULL,
        CONSTRAINT "uq_user_company_roles_membership_role" UNIQUE ("membership_id", "role"),
        CONSTRAINT "fk_ucr_membership" FOREIGN KEY ("membership_id")
          REFERENCES "user_company_memberships"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ucr_membership_id" ON "user_company_roles" ("membership_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_company_persons" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "person_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_user_company_persons_user_company" UNIQUE ("user_id", "company_id"),
        CONSTRAINT "fk_ucp_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ucp_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ucp_person" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ucp_user_id" ON "user_company_persons" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ucp_company_id" ON "user_company_persons" ("company_id")
    `);

    // Backfill memberships from legacy users (non SUPER_ADMIN with company_id).
    // Nota: soft-delete en users usa columna camelCase "deletedAt".
    await queryRunner.query(`
      INSERT INTO "user_company_memberships" ("user_id", "company_id", "is_owner", "is_active")
      SELECT u.id, u.company_id, false, true
      FROM "users" u
      WHERE u."deletedAt" IS NULL
        AND u.company_id IS NOT NULL
        AND u.rol::text <> 'SUPER_ADMIN'
      ON CONFLICT ("user_id", "company_id") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "user_company_roles" ("membership_id", "role")
      SELECT m.id,
        CASE u.rol::text
          WHEN 'ADMIN' THEN 'ADMIN'
          WHEN 'OPERATOR' THEN 'POS_OPERATOR'
          WHEN 'POS_OPERATOR' THEN 'POS_OPERATOR'
          WHEN 'COURIER' THEN 'COURIER'
          WHEN 'SUB_ADMIN' THEN 'SUB_ADMIN'
          WHEN 'WAITER' THEN 'WAITER'
          WHEN 'STOCK_OPERATOR' THEN 'STOCK_OPERATOR'
          WHEN 'KDS_OPERATOR' THEN 'KDS_OPERATOR'
          ELSE 'POS_OPERATOR'
        END
      FROM "user_company_memberships" m
      JOIN "users" u ON u.id = m.user_id
      ON CONFLICT ("membership_id", "role") DO NOTHING
    `);

    // Mark one ADMIN per company as owner (earliest by user id for determinism).
    await queryRunner.query(`
      WITH ranked AS (
        SELECT m.id AS membership_id,
          ROW_NUMBER() OVER (PARTITION BY m.company_id ORDER BY m.created_at ASC, m.user_id ASC) AS rn
        FROM "user_company_memberships" m
        JOIN "user_company_roles" r ON r.membership_id = m.id AND r.role = 'ADMIN'
        WHERE m.is_active = true
      )
      UPDATE "user_company_memberships" m
      SET is_owner = true
      FROM ranked
      WHERE m.id = ranked.membership_id AND ranked.rn = 1
    `);

    // Backfill user_company_persons from users.person when present.
    // TypeORM default FK column on users is typically "personId".
    await queryRunner.query(`
      DO $$
      DECLARE
        person_col text;
      BEGIN
        SELECT a.attname INTO person_col
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relname = 'users'
          AND a.attname IN ('personId', 'person_id')
          AND NOT a.attisdropped
        ORDER BY CASE a.attname WHEN 'personId' THEN 0 ELSE 1 END
        LIMIT 1;

        IF person_col IS NOT NULL THEN
          EXECUTE format(
            'INSERT INTO user_company_persons (user_id, company_id, person_id)
             SELECT u.id, u.company_id, u.%I
             FROM users u
             WHERE u."deletedAt" IS NULL
               AND u.company_id IS NOT NULL
               AND u.%I IS NOT NULL
             ON CONFLICT (user_id, company_id) DO NOTHING',
            person_col, person_col
          );
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_company_persons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_company_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_company_memberships"`);
  }
}
