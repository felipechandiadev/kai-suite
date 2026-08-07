import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProductType } from '@modules/products/domain/product.entity';
import type { SeedProductDefinition } from '../shared/seed-catalog.types';

export type MiasProductionUnitCode = 'COCINA';

export type MiasCatalogProduct = {
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
  productType: 'PHYSICAL' | 'PREPARADO' | 'ELABORADO' | string;
  productionUnitCode?: MiasProductionUnitCode | null;
};

export type MiasCatalogFile = {
  source: string;
  generatedAt: string;
  brand: string;
  categories: string[];
  products: MiasCatalogProduct[];
};

function resolveCatalogPath(): string {
  if (process.env.MIAS_CATALOG_PATH?.trim()) {
    return process.env.MIAS_CATALOG_PATH.trim();
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
    'mias',
    'seed',
    'data',
    'catalog.json',
  );
  if (existsSync(deployments)) return deployments;
  throw new Error(
    'No se encontró catalog.json. Generá con: python3 seeds/mias/scripts/import-unicenta-sql.py',
  );
}

export function loadMiasCatalog(): MiasCatalogFile {
  const path = resolveCatalogPath();
  const raw = JSON.parse(readFileSync(path, 'utf8')) as MiasCatalogFile;
  if (!Array.isArray(raw.products) || raw.products.length === 0) {
    throw new Error(`Catálogo vacío: ${path}`);
  }
  console.log(
    `📦 Catálogo Mias: ${raw.products.length} productos · ${raw.categories?.length ?? 0} categorías · ${path}`,
  );
  return raw;
}

function toProductType(raw: string): ProductType {
  if (raw === ProductType.PREPARADO) return ProductType.PREPARADO;
  if (raw === ProductType.ELABORADO) return ProductType.ELABORADO;
  if (raw === ProductType.PHYSICAL) return ProductType.PHYSICAL;
  return ProductType.PHYSICAL;
}

export function mapMiasCatalogToSeedProducts(
  catalog: MiasCatalogFile,
  brandOverride?: string,
): {
  products: SeedProductDefinition[];
  productionUnitBySku: Map<string, MiasProductionUnitCode>;
} {
  const brand = brandOverride?.trim() || catalog.brand?.trim() || 'Mias';
  const productionUnitBySku = new Map<string, MiasProductionUnitCode>();
  const products: SeedProductDefinition[] = catalog.products.map((p) => {
    const sku = String(p.sku).trim();
    if (p.productionUnitCode === 'COCINA') {
      productionUnitBySku.set(sku, 'COCINA');
    }
    const unit = p.productBaseUnit || 'UN';
    return {
      name: p.name,
      brand,
      productType: toProductType(String(p.productType)),
      categoryName: p.categoryName || 'Sin categoría',
      productBaseUnit: unit,
      visibleInEShop: false,
      variants: [
        {
          sku,
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
  return { products, productionUnitBySku };
}
