import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega `settings jsonb` a `points_of_sale` para configuración por POS
 * (medios de pago habilitados/precargados, etc.).
 *
 * También garantiza que `companies.settings` exista como jsonb (la entidad
 * lo declara como `type: 'json'`, y es nullable; este paso es defensivo
 * por si alguna instalación no lo tiene).
 */
export class PosSettingsJson1743000000000 implements MigrationInterface {
  name = 'PosSettingsJson1743000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. points_of_sale.settings
    const posCol = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'points_of_sale' AND column_name = 'settings'`,
    );
    if (posCol.length === 0) {
      await queryRunner.query(
        `ALTER TABLE points_of_sale ADD COLUMN settings jsonb`,
      );
    }

    // 2. companies.settings (defensivo)
    const companyCol = await queryRunner.query(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'settings'`,
    );
    if (companyCol.length === 0) {
      await queryRunner.query(
        `ALTER TABLE companies ADD COLUMN settings jsonb`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No eliminamos `companies.settings` porque puede existir desde antes.
    const posCol = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'points_of_sale' AND column_name = 'settings'`,
    );
    if (posCol.length > 0) {
      await queryRunner.query(
        `ALTER TABLE points_of_sale DROP COLUMN settings`,
      );
    }
  }
}
