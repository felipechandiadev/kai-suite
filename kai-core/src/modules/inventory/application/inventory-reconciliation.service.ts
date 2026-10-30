import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ReconciliationRow {
  variantId: string;
  storageId: string;
  productName: string | null;
  sku: string | null;
  storageName: string | null;
  /** Stock guardado en `stock_levels`. */
  recordedStock: number;
  /** Stock que resulta de sumar los movimientos (compras, ventas, ajustes, traspasos). */
  expectedStock: number;
  /** recordedStock − expectedStock. */
  difference: number;
  pmp: number | null;
  /** Valor del descuadre al PMP (o costo base). */
  differenceValue: number | null;
}

export interface ReconciliationReport {
  asOf: string;
  /** Variantes/almacenes revisados. */
  checked: number;
  mismatches: ReconciliationRow[];
  totals: {
    recordedValue: number;
    mismatchValue: number;
  };
}

const IN_TYPES = ['PURCHASE', 'SALE_RETURN', 'TRANSFER_IN', 'ADJUSTMENT_IN'];
const OUT_TYPES = ['SALE', 'TRANSFER_OUT', 'ADJUSTMENT_OUT'];
const TOLERANCE = 0.0005;

/**
 * Conciliación de inventario: compara `stock_levels.physicalStock` con la suma de los
 * movimientos que lo originan. Solo productos físicos e insumos (los packs y elaborados
 * descuentan componentes y no se concilian aquí). Los ajustes "fijar cantidad" reinician
 * el saldo esperado al valor fijado.
 */
@Injectable()
export class InventoryReconciliationService {
  constructor(private readonly dataSource: DataSource) {}

  async reconcile(companyId: string): Promise<ReconciliationReport> {
    const rows: Array<Record<string, any>> = await this.dataSource.query(
      `
      WITH mv AS (
        SELECT tl."productVariantId" AS vid,
               COALESCE(t."storageId", t."targetStorageId") AS sid,
               t."createdAt" AS at,
               t.id AS tid,
               CASE
                 WHEN t."transactionType"::text = ANY($2::text[]) THEN COALESCE(tl."quantityInBase", tl.quantity)
                 ELSE -COALESCE(tl."quantityInBase", tl.quantity)
               END AS delta,
               (t.metadata::jsonb ->> 'inventoryAdjustMode') IN ('set_absolute', 'set')
                 AND (t.metadata::jsonb ->> 'targetPhysicalStock') IS NOT NULL AS is_reset,
               CASE WHEN (t.metadata::jsonb ->> 'targetPhysicalStock') ~ '^-?[0-9.]+$'
                    THEN (t.metadata::jsonb ->> 'targetPhysicalStock')::numeric END AS target
        FROM transaction_lines tl
        JOIN transactions t ON t.id = tl."transactionId"
        WHERE t.company_id = $1
          AND tl."productVariantId" IS NOT NULL
          AND t."transactionType"::text = ANY($4::text[])
          AND t.status NOT IN ('DRAFT', 'CANCELLED', 'PENDING', 'EXPIRED')
          AND COALESCE(t."storageId", t."targetStorageId") IS NOT NULL
      ),
      last_reset AS (
        SELECT DISTINCT ON (vid, sid) vid, sid, at, tid, target
        FROM mv WHERE is_reset AND target IS NOT NULL
        ORDER BY vid, sid, at DESC, tid DESC
      ),
      expected AS (
        SELECT mv.vid, mv.sid,
               COALESCE(lr.target, 0)
                 + COALESCE(SUM(mv.delta) FILTER (
                     WHERE NOT mv.is_reset
                       AND (lr.vid IS NULL OR (mv.at, mv.tid) > (lr.at, lr.tid))
                   ), 0) AS qty
        FROM mv
        LEFT JOIN last_reset lr ON lr.vid = mv.vid AND lr.sid = mv.sid
        GROUP BY mv.vid, mv.sid, lr.target
      )
      SELECT COALESCE(sl."productVariantId", e.vid) AS "variantId",
             COALESCE(sl."storageId", e.sid) AS "storageId",
             p.name AS "productName", v.sku AS sku, s.name AS "storageName",
             COALESCE(sl."physicalStock", 0)::float AS recorded,
             COALESCE(e.qty, 0)::float AS expected,
             COALESCE(NULLIF(v.pmp, 0), NULLIF(v."baseCost", 0))::float AS pmp
      FROM stock_levels sl
      FULL OUTER JOIN expected e ON e.vid = sl."productVariantId" AND e.sid = sl."storageId"
      JOIN product_variants v ON v.id = COALESCE(sl."productVariantId", e.vid)
      LEFT JOIN products p ON p.id = v."productId"
      LEFT JOIN storages s ON s.id = COALESCE(sl."storageId", e.sid)
      WHERE v.company_id = $1
        AND v."deletedAt" IS NULL
        AND (p.id IS NULL OR p."productType"::text = ANY($3::text[]))
      `,
      [companyId, IN_TYPES, ['PHYSICAL', 'INSUMO'], [...IN_TYPES, ...OUT_TYPES]],
    );

    let recordedValue = 0;
    let mismatchValue = 0;
    const mismatches: ReconciliationRow[] = [];
    for (const r of rows) {
      const recorded = Number(r.recorded) || 0;
      const expected = Number(r.expected) || 0;
      const pmp = r.pmp != null ? Number(r.pmp) : null;
      recordedValue += recorded * (pmp ?? 0);
      const difference = Math.round((recorded - expected) * 1000) / 1000;
      if (Math.abs(difference) <= TOLERANCE) continue;
      const differenceValue = pmp != null ? Math.round(difference * pmp) : null;
      mismatchValue += differenceValue ?? 0;
      mismatches.push({
        variantId: r.variantId,
        storageId: r.storageId,
        productName: r.productName ?? null,
        sku: r.sku ?? null,
        storageName: r.storageName ?? null,
        recordedStock: recorded,
        expectedStock: expected,
        difference,
        pmp,
        differenceValue,
      });
    }
    mismatches.sort(
      (a, b) =>
        Math.abs(b.differenceValue ?? b.difference) -
        Math.abs(a.differenceValue ?? a.difference),
    );
    return {
      asOf: new Date().toISOString(),
      checked: rows.length,
      mismatches,
      totals: {
        recordedValue: Math.round(recordedValue),
        mismatchValue: Math.round(mismatchValue),
      },
    };
  }
}
