import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { TenantContext } from '../../../src/common/tenant/tenant.context';

export interface BaseFixtures {
  companyId: string;
  userId: string;
  branchId: string;
  storageId: string;
  unitId: string;
  pointOfSaleId: string;
}

/** Lee de la BD clonada los datos base (empresa, usuario, sucursal, bodega, unidad). */
export async function loadBase(ds: DataSource): Promise<BaseFixtures> {
  const [s] = await ds.query(
    `SELECT s.id AS "storageId", s.company_id AS "companyId", s."branchId" AS "branchId"
       FROM storages s WHERE s."deletedAt" IS NULL AND s."branchId" IS NOT NULL ORDER BY s."createdAt" LIMIT 1`,
  );
  const [u] = await ds.query(`SELECT id FROM users LIMIT 1`);
  const [unit] = await ds.query(`SELECT id FROM units LIMIT 1`);
  const [pos] = await ds.query(
    `SELECT id FROM points_of_sale WHERE company_id = $1 AND "branchId" = $2 LIMIT 1`,
    [s?.companyId, s?.branchId],
  );
  if (!s || !u || !unit || !pos)
    throw new Error('La BD origen no tiene datos base (bodega/usuario/unidad)');
  return {
    companyId: s.companyId,
    userId: u.id,
    branchId: s.branchId,
    storageId: s.storageId,
    unitId: unit.id,
    pointOfSaleId: pos.id,
  };
}

export async function createSupplier(
  ds: DataSource,
  b: BaseFixtures,
): Promise<string> {
  const personId = randomUUID();
  const supplierId = randomUUID();
  await ds.query(
    `INSERT INTO persons (id, company_id, "firstName") VALUES ($1, $2, $3)`,
    [personId, b.companyId, `Proveedor prueba ${personId.slice(0, 6)}`],
  );
  await ds.query(
    `INSERT INTO suppliers (id, company_id, "personId") VALUES ($1, $2, $3)`,
    [supplierId, b.companyId, personId],
  );
  return supplierId;
}

/** Producto PHYSICAL con una variante, sin stock. */
export async function createPhysicalVariant(
  ds: DataSource,
  b: BaseFixtures,
  opts: { name?: string; baseCost?: number; basePrice?: number } = {},
): Promise<{ productId: string; variantId: string; sku: string }> {
  const productId = randomUUID();
  const variantId = randomUUID();
  const sku = `T-${variantId.slice(0, 8)}`;
  await ds.query(
    `INSERT INTO products (id, company_id, name, "productType") VALUES ($1, $2, $3, 'PHYSICAL')`,
    [productId, b.companyId, opts.name ?? `Producto prueba ${sku}`],
  );
  await ds.query(
    `INSERT INTO product_variants (id, company_id, "productId", sku, unit_id, stock_base_unit_id, sale_unit_id, purchase_unit_id, "basePrice", "baseCost")
     VALUES ($1, $2, $3, $4, $5, $5, $5, $5, $6, $7)`,
    [
      variantId,
      b.companyId,
      productId,
      sku,
      b.unitId,
      opts.basePrice ?? 1000,
      opts.baseCost ?? 0,
    ],
  );
  return { productId, variantId, sku };
}

export async function physicalStock(
  ds: DataSource,
  variantId: string,
  storageId: string,
): Promise<number> {
  const [r] = await ds.query(
    `SELECT COALESCE(SUM("physicalStock"), 0)::float AS s FROM stock_levels
      WHERE "productVariantId" = $1 AND "storageId" = $2`,
    [variantId, storageId],
  );
  return Number(r.s);
}

/** Ejecuta `fn` con el contexto de empresa activo (como lo hace TenantGuard). */
export function asCompany<T>(
  b: BaseFixtures,
  fn: () => Promise<T>,
): Promise<T> {
  return TenantContext.run(
    { userId: b.userId, activeCompanyId: b.companyId, rol: 'ADMIN' },
    fn,
  );
}

/** Espera a que una condición asíncrona (p. ej. stock aplicado por evento post-commit) se cumpla. */
export async function waitFor(
  check: () => Promise<boolean>,
  what: string,
  timeoutMs = 5000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Tiempo agotado esperando: ${what}`);
}

/** Espera a que el stock físico de la variante en la bodega llegue al valor esperado. */
export async function waitForStock(
  ds: DataSource,
  variantId: string,
  storageId: string,
  expected: number,
): Promise<void> {
  await waitFor(
    async () => (await physicalStock(ds, variantId, storageId)) === expected,
    `stock ${expected} (variante ${variantId})`,
  );
}
