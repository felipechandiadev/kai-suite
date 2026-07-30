import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rellena `companies.settings.eShopDefaultStorageId` en empresas con eShop activo
 * o sucursal eShop configurada, usando el almacén predeterminado de esa sucursal.
 *
 * No altera el esquema: la relación eShop ↔ almacén vive en el JSON `settings`.
 */
export class EShopDefaultStorageBackfill1756460000000 implements MigrationInterface {
  name = 'EShopDefaultStorageBackfill1756460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const companies: Array<{ id: string; settings: Record<string, unknown> | null }> =
      await queryRunner.query(`
        SELECT id, settings
        FROM companies
        WHERE "deletedAt" IS NULL
      `);

    for (const company of companies) {
      const settings = (company.settings ?? {}) as Record<string, unknown>;
      const existingStorageId =
        typeof settings.eShopDefaultStorageId === 'string'
          ? settings.eShopDefaultStorageId.trim()
          : '';
      if (existingStorageId) {
        continue;
      }

      const eShopEnabled =
        settings.eShopEnabled === true ||
        settings.eShopEnabled === 1 ||
        settings.eShopEnabled === '1' ||
        settings.eShopEnabled === 'true';

      const branchId =
        typeof settings.eShopDefaultBranchId === 'string'
          ? settings.eShopDefaultBranchId.trim()
          : '';

      if (!eShopEnabled && !branchId) {
        continue;
      }

      const storageRows: Array<{ id: string; branchId: string | null }> =
        await queryRunner.query(
          `
          SELECT id, "branchId"
          FROM storages
          WHERE company_id = $1
            AND "deletedAt" IS NULL
            AND "isActive" = true
            AND ($2::uuid IS NULL OR "branchId" = $2::uuid)
          ORDER BY
            CASE
              WHEN $2::uuid IS NOT NULL AND "branchId" = $2::uuid AND "isDefault" = true
              THEN 0
              ELSE 1
            END,
            "isDefault" DESC,
            "createdAt" ASC
          LIMIT 1
          `,
          [company.id, branchId || null],
        );

      if (!storageRows.length) {
        continue;
      }

      const storage = storageRows[0];
      const next: Record<string, unknown> = {
        ...settings,
        eShopDefaultStorageId: storage.id,
      };

      if (!branchId && storage.branchId) {
        next.eShopDefaultBranchId = storage.branchId;
      }

      await queryRunner.query(`UPDATE companies SET settings = $1::jsonb WHERE id = $2`, [
        JSON.stringify(next),
        company.id,
      ]);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Backfill de datos: no reversible de forma segura.
  }
}
