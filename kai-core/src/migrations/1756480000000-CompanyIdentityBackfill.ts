import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mueve `settings.companyTagline` → `settings.companyIdentity.tagline`.
 */
export class CompanyIdentityBackfill1756480000000 implements MigrationInterface {
  name = 'CompanyIdentityBackfill1756480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{
      id: string;
      settings: Record<string, unknown> | null;
    }> = await queryRunner.query(`
      SELECT id, settings
      FROM companies
      WHERE "deletedAt" IS NULL
    `);

    for (const row of rows) {
      const settings = { ...(row.settings ?? {}) };
      const legacyTagline =
        typeof settings.companyTagline === 'string'
          ? settings.companyTagline.trim()
          : '';

      const rawIdentity =
        settings.companyIdentity && typeof settings.companyIdentity === 'object'
          ? (settings.companyIdentity as Record<string, unknown>)
          : {};

      const tagline =
        typeof rawIdentity.tagline === 'string' && rawIdentity.tagline.trim()
          ? rawIdentity.tagline.trim()
          : legacyTagline || undefined;

      const brandManifest =
        typeof rawIdentity.brandManifest === 'string' &&
        rawIdentity.brandManifest.trim()
          ? rawIdentity.brandManifest.trim()
          : undefined;

      const companyIdentity: Record<string, string> = {};
      if (tagline) companyIdentity.tagline = tagline;
      if (brandManifest) companyIdentity.brandManifest = brandManifest;

      if (Object.keys(companyIdentity).length === 0 && !legacyTagline) {
        continue;
      }

      if (Object.keys(companyIdentity).length > 0) {
        settings.companyIdentity = companyIdentity;
      }
      delete settings.companyTagline;

      await queryRunner.query(`UPDATE companies SET settings = $1::jsonb WHERE id = $2`, [
        JSON.stringify(settings),
        row.id,
      ]);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Backfill de datos: no reversible de forma segura.
  }
}
