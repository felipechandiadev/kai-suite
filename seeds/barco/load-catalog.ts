import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProductType } from '@modules/products/domain/product.entity';
import type { SeedProductDefinition } from '../shared/seed-catalog.types';

export type BarcoCatalogProduct = {
  name: string;
  sku: string;
  barcode?: string | null;
  categoryName: string;
  productBaseUnit: 'UN' | 'ML' | 'L' | 'G' | 'KG';
  baseCost: number;
  basePrice: number;
  retailNet: number;
  trackInventory: boolean;
  allowNegativeStock?: boolean;
  allowDecimals?: boolean;
  initialStock?: number;
};

export type BarcoCatalogFile = {
  source: string;
  generatedAt: string;
  brand: string;
  categories: string[];
  products: BarcoCatalogProduct[];
};

const STOCK_OUTLIER_MAX = 1e7;

function resolveCatalogPath(fileName: string): string {
  const envKey =
    fileName === 'catalog-food.json'
      ? process.env.BARCO_CATALOG_FOOD_PATH
      : process.env.BARCO_CATALOG_STORE_PATH || process.env.BARCO_CATALOG_PATH;
  if (envKey?.trim()) return envKey.trim();

  const local = join(__dirname, 'data', fileName);
  if (existsSync(local)) return local;

  const deployments = join(
    __dirname,
    '..',
    '..',
    '..',
    'kai-deployments',
    'tenants',
    'barco',
    'seed',
    'data',
    fileName,
  );
  if (existsSync(deployments)) return deployments;

  // Legacy single catalog fallback for store
  if (fileName === 'catalog-store.json') {
    const legacyLocal = join(__dirname, 'data', 'catalog.json');
    if (existsSync(legacyLocal)) return legacyLocal;
    const legacyDep = join(
      __dirname,
      '..',
      '..',
      '..',
      'kai-deployments',
      'tenants',
      'barco',
      'seed',
      'data',
      'catalog.json',
    );
    if (existsSync(legacyDep)) return legacyDep;
  }

  throw new Error(
    `No se encontró ${fileName}. Generá con: python3 seed/generate_catalog.py --all`,
  );
}

export function loadBarcoCatalogFile(
  which: 'store' | 'food',
): BarcoCatalogFile {
  const fileName =
    which === 'food' ? 'catalog-food.json' : 'catalog-store.json';
  const path = resolveCatalogPath(fileName);
  const raw = JSON.parse(readFileSync(path, 'utf8')) as BarcoCatalogFile;
  if (!Array.isArray(raw.products) || raw.products.length === 0) {
    throw new Error(`Catálogo vacío: ${path}`);
  }
  console.log(
    `📦 Catálogo ${which}: ${raw.products.length} productos · ${raw.categories?.length ?? 0} categorías · ${path}`,
  );
  return raw;
}

/** @deprecated use loadBarcoCatalogFile('store') */
export function loadBarcoCatalog(): BarcoCatalogFile {
  return loadBarcoCatalogFile('store');
}

export function mapBarcoCatalogToSeedProducts(
  catalog: BarcoCatalogFile,
  brandOverride?: string,
): SeedProductDefinition[] {
  const brand = brandOverride?.trim() || catalog.brand?.trim() || 'Marca';
  return catalog.products.map((p) => {
    const unit = p.productBaseUnit || 'UN';
    return {
      name: p.name,
      brand,
      productType: ProductType.PHYSICAL,
      categoryName: p.categoryName || 'Sin categoría',
      productBaseUnit: unit,
      visibleInEShop: false,
      variants: [
        {
          sku: p.sku,
          barcode: p.barcode || undefined,
          basePrice: p.basePrice || 0,
          baseCost: p.baseCost || 0,
          trackInventory: p.trackInventory !== false,
          allowNegativeStock: p.allowNegativeStock === true,
          retailNet: p.retailNet ?? 0,
          uom: { stock: unit, sale: unit, purchase: unit },
        },
      ],
    };
  });
}

/** Stock inicial por SKU (desde DINVENTARIO; outliers ≥ 1e7 → 0). */
export function barcoInitialStockBySku(
  catalog: BarcoCatalogFile,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of catalog.products) {
    let qty = Math.max(0, Number(p.initialStock) || 0);
    if (qty >= STOCK_OUTLIER_MAX) qty = 0;
    m.set(p.sku, qty);
  }
  return m;
}
