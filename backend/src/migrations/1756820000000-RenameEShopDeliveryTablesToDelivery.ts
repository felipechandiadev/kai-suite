import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renombra tablas legacy `e_shop_delivery_*` → `delivery_*`.
 * Si coexisten ambas (CREATE IF NOT EXISTS creó tablas vacías),
 * reemplaza las nuevas con los datos legacy.
 */
export class RenameEShopDeliveryTablesToDelivery1756820000000
  implements MigrationInterface
{
  name = 'RenameEShopDeliveryTablesToDelivery1756820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const renames: Array<[string, string]> = [
      ['e_shop_delivery_stops', 'delivery_stops'],
      ['e_shop_delivery_dispatches', 'delivery_dispatches'],
      ['e_shop_delivery_order_line_picks', 'delivery_order_line_picks'],
      ['e_shop_delivery_orders', 'delivery_orders'],
      ['e_shop_delivery_occurrence_zones', 'delivery_occurrence_zones'],
      ['e_shop_delivery_occurrences', 'delivery_occurrences'],
      ['e_shop_delivery_zones', 'delivery_zones'],
      ['e_shop_delivery_coverage_communes', 'delivery_coverage_communes'],
      ['e_shop_delivery_settings', 'delivery_settings'],
    ];
    for (const [from, to] of renames) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = '${from}'
          ) THEN
            IF EXISTS (
              SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = '${to}'
            ) THEN
              EXECUTE 'DROP TABLE IF EXISTS "' || '${to}' || '" CASCADE';
            END IF;
            EXECUTE 'ALTER TABLE "' || '${from}' || '" RENAME TO "' || '${to}' || '"';
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const renames: Array<[string, string]> = [
      ['delivery_stops', 'e_shop_delivery_stops'],
      ['delivery_dispatches', 'e_shop_delivery_dispatches'],
      ['delivery_order_line_picks', 'e_shop_delivery_order_line_picks'],
      ['delivery_orders', 'e_shop_delivery_orders'],
      ['delivery_occurrence_zones', 'e_shop_delivery_occurrence_zones'],
      ['delivery_occurrences', 'e_shop_delivery_occurrences'],
      ['delivery_zones', 'e_shop_delivery_zones'],
      ['delivery_coverage_communes', 'e_shop_delivery_coverage_communes'],
      ['delivery_settings', 'e_shop_delivery_settings'],
    ];
    for (const [from, to] of renames) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = '${from}'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = '${to}'
          ) THEN
            EXECUTE 'ALTER TABLE "' || '${from}' || '" RENAME TO "' || '${to}' || '"';
          END IF;
        END $$;
      `);
    }
  }
}
