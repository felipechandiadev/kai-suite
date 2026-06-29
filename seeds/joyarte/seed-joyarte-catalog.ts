import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'node:crypto';
import { ProductType } from '@modules/products/domain/product.entity';
import type { SeedAttributeDefinition, SeedProductDefinition } from '../shared/seed-catalog.types';

export const SEED_JOYARTE_VARIANT_SKU_PREFIX = 'JOYARTE-';

function joyarteDuplicateSkuSuffix(productName: string): string {
  return createHash('sha256').update(productName).digest('hex').slice(0, 8);
}

function toJoyarteVariantSku(rawSku: string): string {
  return rawSku.startsWith(SEED_JOYARTE_VARIANT_SKU_PREFIX)
    ? rawSku
    : `${SEED_JOYARTE_VARIANT_SKU_PREFIX}${rawSku}`;
}

function countDuplicateCatalogSkus(catalog: JoyarteCatalogJson): Map<string, number> {
  const counts = new Map<string, number>();
  for (const product of catalog.products) {
    for (const variant of product.variants) {
      const sku = toJoyarteVariantSku(variant.sku);
      counts.set(sku, (counts.get(sku) ?? 0) + 1);
    }
  }
  return counts;
}

function resolveJoyarteVariantSku(
  rawSku: string,
  productName: string,
  duplicateCounts: Map<string, number>,
): string {
  const baseSku = toJoyarteVariantSku(rawSku);
  if ((duplicateCounts.get(baseSku) ?? 0) <= 1) {
    return baseSku;
  }
  const suffix = joyarteDuplicateSkuSuffix(productName);
  const deduped = `${baseSku}-${suffix}`;
  return deduped.length <= 100 ? deduped : `${baseSku.slice(0, 90)}-${suffix}`;
}

export const SEED_JOYARTE_CATEGORIES = [
  'Anillos',
  'Aros',
  'Cadenas',
  'Colgantes',
  'Collares',
  'Pulseras',
  'Anillos de Compromiso',
  'Argollas de Matrimonio',
  'Joyas de Oro',
  'Joyas de Plata',
] as const;

export type SeedJoyarteCategoryName = (typeof SEED_JOYARTE_CATEGORIES)[number];

export const SEED_JOYARTE_BRANDS = ['Joyarte', 'Joyas Barón', 'Danielle Costantini'] as const;

export const SEED_JOYARTE_ATTRIBUTES: readonly SeedAttributeDefinition[] = [
  {
    name: 'Talla',
    options: ['10', '12', '14', '16', '18', '20', '22'],
    displayOrder: 0,
  },
  {
    name: 'Material',
    options: ['Oro 18kt', 'Oro 14kt', 'Plata 925', 'Platino 900'],
    displayOrder: 1,
  },
  {
    name: 'Tono',
    options: ['Amarillo', 'Blanco', 'Rosado', 'Miel', 'Bicolor'],
    displayOrder: 2,
  },
  {
    name: 'Piedra',
    options: ['Diamante', 'Circonita', 'Perla', 'Topacio', 'Sin piedra'],
    displayOrder: 3,
  },
];

export type JoyarteCatalogJson = {
  meta: {
    source: string;
    importedAt: string;
    productCount: number;
  };
  categories: string[];
  brands: string[];
  products: Array<{
    name: string;
    brand: string;
    categoryName: string;
    description?: string;
    productType: 'PHYSICAL';
    imageFile?: string;
    variants: Array<{
      sku: string;
      retailNet: number;
      baseCost?: number;
      trackInventory?: boolean;
      attributeValues?: Record<string, string>;
    }>;
  }>;
};

const JOYARTE_DATA_DIR = path.join(__dirname, 'data');

export function loadJoyarteCatalogJson(): JoyarteCatalogJson {
  const filePath = path.join(JOYARTE_DATA_DIR, 'catalog.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No se encontró ${filePath}. Ejecute: npm run seed:import-joyarte`,
    );
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as JoyarteCatalogJson;
  if (!Array.isArray(raw.products) || raw.products.length === 0) {
    throw new Error(`catalog.json inválido o vacío en ${filePath}`);
  }
  return raw;
}

export function mapJoyarteCatalogToSeedProducts(
  catalog: JoyarteCatalogJson,
): SeedProductDefinition[] {
  const duplicateSkuCounts = countDuplicateCatalogSkus(catalog);
  return catalog.products
    .map((p) => ({
      name: p.name,
      brand: p.brand,
      description: p.description,
      productType: ProductType.PHYSICAL,
      categoryName: p.categoryName,
      productBaseUnit: 'UN' as const,
      visibleInEShop: true,
      variants: p.variants
        .filter((v) => v.retailNet > 0 && v.retailNet < 50_000_000)
        .map((v) => {
          const retailNet = v.retailNet;
          const baseCost = v.baseCost ?? Math.round(retailNet * 0.45);
          return {
            sku: resolveJoyarteVariantSku(v.sku, p.name, duplicateSkuCounts),
            basePrice: retailNet,
            baseCost,
            trackInventory: v.trackInventory ?? true,
            retailNet,
            wholesaleNet: Math.round(retailNet * 0.88),
            inBothPriceLists: false,
            attributeValues: v.attributeValues,
          };
        }),
    }))
    .filter((p) => p.variants.length > 0);
}

export function getJoyarteCatalogProductNames(catalog: JoyarteCatalogJson): Set<string> {
  return new Set(catalog.products.map((p) => p.name));
}

export function getJoyarteCatalogSkus(catalog: JoyarteCatalogJson): Set<string> {
  const duplicateSkuCounts = countDuplicateCatalogSkus(catalog);
  const skus = new Set<string>();
  for (const p of catalog.products) {
    for (const v of p.variants) {
      skus.add(resolveJoyarteVariantSku(v.sku, p.name, duplicateSkuCounts));
    }
  }
  return skus;
}

export const SEED_JOYARTE_ESHOP_FEATURED_PRODUCT_NAMES = [
  'Anillo Compromiso de Oro de 18kt Solitario 29 puntos de diamante',
  'Anillo Compromiso Platino 950  Nápoles 1x12ptos Diamante',
  'Par Argollas Matrimonio de Platino de 2,0mm Verona',
  'Anillo Oro Blanco 18kt Perla Nácar',
  'Collares de Oro 18kt Modelo Mariposa & Circones',
  'Aros Oro 18kt  Argolla Circonita',
  'Cadena Oro 18Kt Portuguesa',
  'Anillo de Plata Esterlina 925 Roseta',
  'Collar de Plata Esterlina 925 Corazones',
] as const;

export const SEED_JOYARTE_ASSETS_ROOT = path.join(__dirname, 'assets');
