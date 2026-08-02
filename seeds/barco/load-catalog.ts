import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProductType } from '@modules/products/domain/product.entity';
import type { SeedProductDefinition } from '../shared/seed-catalog.types';
import { SEED_BRAND_NAME } from './config';

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

/** Preferencia: env → seeds/barco/data → kai-deployments tenant export. */
export function resolveBarcoCatalogPath(): string {
  if (process.env.BARCO_CATALOG_PATH?.trim()) {
    return process.env.BARCO_CATALOG_PATH.trim();
  }
  const local = join(__dirname, 'data', 'catalog.json');
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
    'catalog.json',
  );
  if (existsSync(deployments)) return deployments;
  throw new Error(
    'No se encontró catalog.json de Barco. Generá seed/data/catalog.json o seteá BARCO_CATALOG_PATH.',
  );
}

export function loadBarcoCatalog(): BarcoCatalogFile {
  const path = resolveBarcoCatalogPath();
  const raw = JSON.parse(readFileSync(path, 'utf8')) as BarcoCatalogFile;
  if (!Array.isArray(raw.products) || raw.products.length === 0) {
    throw new Error(`Catálogo Barco vacío: ${path}`);
  }
  console.log(
    `📦 Catálogo Barco: ${raw.products.length} productos · ${raw.categories?.length ?? 0} categorías · ${path}`,
  );
  return raw;
}

export function mapBarcoCatalogToSeedProducts(
  catalog: BarcoCatalogFile,
): SeedProductDefinition[] {
  const brand = catalog.brand?.trim() || SEED_BRAND_NAME;
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

/** Stock inicial por SKU (desde DINVENTARIO del export). */
export function barcoInitialStockBySku(
  catalog: BarcoCatalogFile,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of catalog.products) {
    m.set(p.sku, Math.max(0, Number(p.initialStock) || 0));
  }
  return m;
}
