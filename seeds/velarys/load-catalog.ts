import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProductType } from '@modules/products/domain/product.entity';
import type { SeedProductDefinition } from '../shared/seed-catalog.types';

export type VelarysProductionUnitCode = 'BARRA' | 'COCINA' | 'PASTELERIA';

export type VelarysCatalogProduct = {
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
  productionUnitCode?: VelarysProductionUnitCode | null;
};

export type VelarysCatalogFile = {
  source: string;
  generatedAt: string;
  brand: string;
  categories: string[];
  products: VelarysCatalogProduct[];
};

function resolveCatalogPath(): string {
  if (process.env.VELARYS_CATALOG_PATH?.trim()) {
    return process.env.VELARYS_CATALOG_PATH.trim();
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
    'velarys',
    'seed',
    'data',
    'catalog.json',
  );
  if (existsSync(deployments)) return deployments;
  throw new Error(
    'No se encontró catalog.json. Generá con: seeds/velarys/.venv/bin/python scripts/import-menu-xls.py',
  );
}

export function loadVelarysCatalog(): VelarysCatalogFile {
  const path = resolveCatalogPath();
  const raw = JSON.parse(readFileSync(path, 'utf8')) as VelarysCatalogFile;
  if (!Array.isArray(raw.products) || raw.products.length === 0) {
    throw new Error(`Catálogo vacío: ${path}`);
  }
  console.log(
    `📦 Catálogo Velarys: ${raw.products.length} productos · ${raw.categories?.length ?? 0} categorías · ${path}`,
  );
  return raw;
}

function toProductType(raw: string): ProductType {
  if (raw === ProductType.PREPARADO) return ProductType.PREPARADO;
  if (raw === ProductType.ELABORADO) return ProductType.ELABORADO;
  if (raw === ProductType.PHYSICAL) return ProductType.PHYSICAL;
  return ProductType.PHYSICAL;
}

export function mapVelarysCatalogToSeedProducts(
  catalog: VelarysCatalogFile,
  brandOverride?: string,
): {
  products: SeedProductDefinition[];
  productionUnitBySku: Map<string, VelarysProductionUnitCode>;
} {
  const brand = brandOverride?.trim() || catalog.brand?.trim() || 'Velarys';
  const productionUnitBySku = new Map<string, VelarysProductionUnitCode>();
  const products: SeedProductDefinition[] = catalog.products.map((p) => {
    const sku = String(p.sku).trim();
    if (
      p.productionUnitCode === 'BARRA' ||
      p.productionUnitCode === 'COCINA' ||
      p.productionUnitCode === 'PASTELERIA'
    ) {
      productionUnitBySku.set(sku, p.productionUnitCode);
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
