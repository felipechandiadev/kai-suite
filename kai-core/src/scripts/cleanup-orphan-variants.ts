#!/usr/bin/env ts-node
/**
 * Limpia variantes "fantasma": variantes activas cuyo producto fue eliminado (borrado lógico).
 * Aparecían en Existencias como filas sin nombre porque `ProductsService.remove` no eliminaba
 * las variantes del producto.
 *
 * Uso: cd kai-core && npm run catalog:cleanup-orphan-variants -- [--apply] [--company <uuid>]
 * Sin --apply solo informa (dry-run). Variantes con existencias NO se tocan: se listan para revisión.
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../config/data-source';

dotenv.config();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

type OrphanRow = {
  id: string;
  sku: string;
  product_name: string | null;
  stock: string | null;
  committed: string | null;
};

async function main() {
  const apply = process.argv.includes('--apply');
  const company = arg('--company');
  await AppDataSource.initialize();
  try {
    const params: unknown[] = [];
    let companyFilter = '';
    if (company) {
      params.push(company);
      companyFilter = `AND v."company_id" = $${params.length}`;
    }
    const rows: OrphanRow[] = await AppDataSource.query(
      `SELECT v.id, v.sku, p.name AS product_name,
              COALESCE(SUM(sl."physicalStock"), 0) AS stock,
              COALESCE(SUM(sl."committedStock"), 0) AS committed
         FROM product_variants v
         JOIN products p ON p.id = v."productId" AND p."deletedAt" IS NOT NULL
         LEFT JOIN stock_levels sl ON sl."productVariantId" = v.id
        WHERE v."deletedAt" IS NULL ${companyFilter}
        GROUP BY v.id, v.sku, p.name
        ORDER BY p.name, v.sku`,
      params,
    );
    const clean = rows.filter((r) => Number(r.stock) <= 0 && Number(r.committed) <= 0);
    const withStock = rows.filter((r) => !clean.includes(r));

    console.log(`Variantes fantasma: ${rows.length} (sin stock: ${clean.length}, con stock: ${withStock.length})`);
    for (const r of withStock) {
      console.log(`  REVISAR (stock ${r.stock}, comprometido ${r.committed}): ${r.sku} — producto eliminado "${r.product_name}"`);
    }
    if (!apply) {
      console.log('Dry-run: use --apply para eliminar (borrado lógico) las variantes sin stock.');
      return;
    }
    if (clean.length === 0) return;
    const res = await AppDataSource.query(
      `UPDATE product_variants SET "deletedAt" = now() WHERE id = ANY($1::uuid[]) AND "deletedAt" IS NULL`,
      [clean.map((r) => r.id)],
    );
    console.log(`Eliminadas (borrado lógico): ${Array.isArray(res) ? (res[1] ?? clean.length) : clean.length}`);
  } finally {
    await AppDataSource.destroy();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
