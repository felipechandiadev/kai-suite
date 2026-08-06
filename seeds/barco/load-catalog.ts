import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProductType } from '@modules/products/domain/product.entity';
import type { SeedProductDefinition } from '../shared/seed-catalog.types';
import {
  disambiguateDuplicateNames,
  stripParenEanFromName,
} from './catalog-clean.util';

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

/** @deprecated use loadUnifiedBarcoCatalog */
export function loadBarcoCatalog(): BarcoCatalogFile {
  return loadBarcoCatalogFile('store');
}

function normalizeKeyPart(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function productDedupeKey(p: BarcoCatalogProduct): string {
  const barcode = (p.barcode ?? '').toString().trim();
  if (barcode) return `b:${barcode}`;
  return `n:${normalizeKeyPart(p.name || '')}`;
}

function remappedSku(prefix: string, original: string, used: Set<string>): string {
  const base = `${prefix}${String(original).trim() || 'SKU'}`;
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Unifica catalog-food + catalog-store.
 * Food gana en choques (barcode o nombre). SKUs remapeados a únicos.
 * trackInventory se fuerza a false al mapear a seed products.
 */
export function loadUnifiedBarcoCatalog(): BarcoCatalogFile {
  const food = loadBarcoCatalogFile('food');
  const store = loadBarcoCatalogFile('store');

  const byKey = new Map<string, BarcoCatalogProduct>();
  let foodDupes = 0;
  let storeSkipped = 0;
  let storeAdded = 0;

  for (const p of food.products) {
    const key = productDedupeKey(p);
    if (!key || key === 'n:') continue;
    if (byKey.has(key)) {
      foodDupes += 1;
      continue;
    }
    byKey.set(key, { ...p });
  }

  for (const p of store.products) {
    const key = productDedupeKey(p);
    if (!key || key === 'n:') continue;
    if (byKey.has(key)) {
      storeSkipped += 1;
      continue;
    }
    byKey.set(key, { ...p });
    storeAdded += 1;
  }

  const usedSkus = new Set<string>();
  const products: BarcoCatalogProduct[] = [];
  for (const p of byKey.values()) {
    let sku = String(p.sku ?? '').trim();
    if (!sku || usedSkus.has(sku)) {
      sku = remappedSku('OHL-', sku || 'SKU', usedSkus);
    }
    usedSkus.add(sku);
    products.push({
      ...p,
      sku,
      trackInventory: false,
      allowNegativeStock: false,
      initialStock: 0,
    });
  }

  const catSeen = new Map<string, string>();
  for (const c of [...(food.categories ?? []), ...(store.categories ?? [])]) {
    const n = normalizeKeyPart(c);
    if (!n || catSeen.has(n)) continue;
    catSeen.set(n, c);
  }
  for (const p of products) {
    const raw = p.categoryName || 'Sin categoría';
    const n = normalizeKeyPart(raw);
    if (!n) {
      p.categoryName = 'Sin categoría';
      continue;
    }
    if (!catSeen.has(n)) {
      catSeen.set(n, raw);
    }
    // Misma grafía que la categoría sincronizada (evita «niños» vs «Niños»).
    p.categoryName = catSeen.get(n)!;
  }
  if (!catSeen.has(normalizeKeyPart('Sin categoría'))) {
    catSeen.set(normalizeKeyPart('Sin categoría'), 'Sin categoría');
  }

  console.log(
    `📦 Catálogo unificado: ${products.length} productos · ${catSeen.size} categorías` +
      ` (food dupes=${foodDupes}, store skipped=${storeSkipped}, store-only=${storeAdded})`,
  );

  return {
    source: 'unified:food+store',
    generatedAt: new Date().toISOString(),
    brand: 'Ohlala',
    categories: [...catSeen.values()],
    products,
  };
}

export function mapBarcoCatalogToSeedProducts(
  catalog: BarcoCatalogFile,
  brandOverride?: string,
): SeedProductDefinition[] {
  const brand = brandOverride?.trim() || catalog.brand?.trim() || 'Ohlala';
  const cleaned = catalog.products.map((p) => {
    const { clean } = stripParenEanFromName(p.name, p.barcode, p.sku);
    return {
      nombre: clean,
      sku: p.sku,
      codigo_barras: (p.barcode ?? '').toString().trim(),
      product: p,
    };
  });
  const uniqueNames = disambiguateDuplicateNames(cleaned);
  return uniqueNames.map((row) => {
    const p = row.product;
    const unit = p.productBaseUnit || 'UN';
    return {
      name: row.nombre,
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
          trackInventory: false,
          allowNegativeStock: false,
          retailNet: p.retailNet ?? 0,
          uom: { stock: unit, sale: unit, purchase: unit },
        },
      ],
    };
  });
}

/** Sin control de stock: mapa vacío. */
export function barcoInitialStockBySku(
  _catalog: BarcoCatalogFile,
): Map<string, number> {
  return new Map();
}
