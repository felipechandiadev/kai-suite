import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sincroniza `committed_stock` y `available_stock` desde reservas históricas
 * (`INVENTORY_RESERVATION` COMPLETED) cuando el saldo aún no refleja compromisos.
 */
export class SyncCommittedStockFromReservations1756070000000
  implements MigrationInterface
{
  name = 'SyncCommittedStockFromReservations1756070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH reserved AS (
        SELECT
          tl."productVariantId" AS variant_id,
          t."storageId" AS storage_id,
          t."company_id" AS company_id,
          COALESCE(SUM(tl.quantity), 0) AS reserved_qty
        FROM transaction_lines tl
        INNER JOIN transactions t ON t.id = tl."transactionId"
        WHERE t."transactionType" = 'INVENTORY_RESERVATION'
          AND t.status = 'COMPLETED'
          AND tl."productVariantId" IS NOT NULL
          AND t."storageId" IS NOT NULL
        GROUP BY tl."productVariantId", t."storageId", t."company_id"
      ),
      upserted AS (
        INSERT INTO stock_levels (
          id,
          company_id,
          "productVariantId",
          "storageId",
          "physicalStock",
          "committedStock",
          "availableStock",
          "incomingStock",
          "updatedAt",
          "lastUpdated"
        )
        SELECT
          gen_random_uuid(),
          r.company_id,
          r.variant_id,
          r.storage_id,
          0,
          r.reserved_qty,
          0 - r.reserved_qty,
          0,
          now(),
          now()
        FROM reserved r
        WHERE NOT EXISTS (
          SELECT 1 FROM stock_levels sl
          WHERE sl."productVariantId" = r.variant_id
            AND sl."storageId" = r.storage_id
        )
        RETURNING "productVariantId", "storageId"
      )
      UPDATE stock_levels sl
      SET
        "committedStock" = r.reserved_qty,
        "availableStock" = COALESCE(sl."physicalStock", 0) - r.reserved_qty,
        "updatedAt" = now(),
        "lastUpdated" = now()
      FROM reserved r
      WHERE sl."productVariantId" = r.variant_id
        AND sl."storageId" = r.storage_id
        AND COALESCE(sl."committedStock", 0) < r.reserved_qty;
    `);
  }

  public async down(): Promise<void> {
    // No revert: committed_stock may include live reservations.
  }
}
