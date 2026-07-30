import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfill métodos canónicos pickup + local-delivery y sincroniza
 * local_delivery_enabled con el método local-delivery activo.
 */
export class EShopCanonicalFulfillmentMethods1756780000000
  implements MigrationInterface
{
  name = 'EShopCanonicalFulfillmentMethods1756780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "e_shop_fulfillment_methods" (
        "company_id", "code", "name", "description", "type",
        "requires_address", "requires_phone", "instructions",
        "is_active", "sort_order"
      )
      SELECT
        c.id,
        'pickup',
        'Retiro en tienda',
        'Retira tu pedido en nuestra boutique',
        'PICKUP',
        false,
        false,
        'Te avisaremos cuando tu pedido esté listo para retiro.',
        true,
        0
      FROM companies c
      WHERE COALESCE((c.settings->>'eShopEnabled')::boolean, false) = true
        AND NOT EXISTS (
          SELECT 1 FROM e_shop_fulfillment_methods m
          WHERE m.company_id = c.id AND m.code = 'pickup'
        );
    `);

    await queryRunner.query(`
      INSERT INTO "e_shop_fulfillment_methods" (
        "company_id", "code", "name", "description", "type",
        "requires_address", "requires_phone", "instructions",
        "is_active", "sort_order"
      )
      SELECT
        c.id,
        'local-delivery',
        'Reparto local',
        'Entrega programada en la Región del Maule',
        'LOCAL_DELIVERY',
        true,
        true,
        'Selecciona dirección y franja de reparto disponible.',
        false,
        1
      FROM companies c
      WHERE COALESCE((c.settings->>'eShopEnabled')::boolean, false) = true
        AND NOT EXISTS (
          SELECT 1 FROM e_shop_fulfillment_methods m
          WHERE m.company_id = c.id AND m.code = 'local-delivery'
        );
    `);

    // Sync settings from method when method is active (method is source of truth)
    await queryRunner.query(`
      UPDATE e_shop_delivery_settings ds
      SET local_delivery_enabled = true,
          updated_at = NOW()
      FROM e_shop_fulfillment_methods m
      WHERE m.company_id = ds.company_id
        AND m.code = 'local-delivery'
        AND m.is_active = true
        AND ds.local_delivery_enabled = false;
    `);

    // If settings say enabled but method inactive, activate the method
    await queryRunner.query(`
      UPDATE e_shop_fulfillment_methods m
      SET is_active = true,
          updated_at = NOW()
      FROM e_shop_delivery_settings ds
      WHERE ds.company_id = m.company_id
        AND m.code = 'local-delivery'
        AND ds.local_delivery_enabled = true
        AND m.is_active = false;
    `);
  }

  public async down(): Promise<void> {
    // Non-destructive: keep canonical methods
  }
}
