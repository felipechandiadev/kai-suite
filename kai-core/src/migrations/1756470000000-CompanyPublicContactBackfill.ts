import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Copia `companies.mail` / `companies.phone` a `settings.publicContact`
 * cuando el JSON aún no tiene email/teléfono.
 */
export class CompanyPublicContactBackfill1756470000000 implements MigrationInterface {
  name = 'CompanyPublicContactBackfill1756470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{
      id: string;
      mail: string | null;
      phone: string | null;
      settings: Record<string, unknown> | null;
    }> = await queryRunner.query(`
      SELECT id, mail, phone, settings
      FROM companies
      WHERE "deletedAt" IS NULL
    `);

    for (const row of rows) {
      const settings = { ...(row.settings ?? {}) };
      const rawPc =
        settings.publicContact && typeof settings.publicContact === 'object'
          ? (settings.publicContact as Record<string, unknown>)
          : {};

      const email =
        typeof rawPc.email === 'string' && rawPc.email.trim()
          ? rawPc.email.trim()
          : row.mail?.trim() || undefined;
      const phone =
        typeof rawPc.phone === 'string' && rawPc.phone.trim()
          ? rawPc.phone.trim()
          : row.phone?.trim() || undefined;

      const instagram =
        typeof rawPc.instagram === 'string' && rawPc.instagram.trim()
          ? rawPc.instagram.trim()
          : undefined;
      const tiktok =
        typeof rawPc.tiktok === 'string' && rawPc.tiktok.trim()
          ? rawPc.tiktok.trim()
          : undefined;

      const publicContact: Record<string, string> = {};
      if (email) publicContact.email = email;
      if (phone) publicContact.phone = phone;
      if (instagram) publicContact.instagram = instagram;
      if (tiktok) publicContact.tiktok = tiktok;

      if (Object.keys(publicContact).length === 0) {
        continue;
      }

      settings.publicContact = publicContact;
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
