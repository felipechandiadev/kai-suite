import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'node:crypto';
import { DataSource, Like, Repository } from 'typeorm';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Category } from '@modules/categories/domain/category.entity';
import type { SanSebastianCatalogJson } from './scripts/import-san-sebastian-from-sami6';

export const SEED_SAN_SEBASTIAN_VARIANT_SKU_PREFIX = 'SS-';
export const SEED_SAN_SEBASTIAN_BRAND = 'San Sebastián';

const DATA_DIR = path.join(__dirname, 'data');
const CATALOG_PATH = path.join(DATA_DIR, 'san-sebastian-catalog.json');
const CATEGORIES_PATH = path.join(DATA_DIR, 'san-sebastian-categories.json');

const IVA_RATE = 0.19;
const INSERT_BATCH_SIZE = 250;

export function loadSanSebastianCategoriesJson(): readonly string[] {
  if (!fs.existsSync(CATEGORIES_PATH)) {
    throw new Error(
      `No se encontró ${CATEGORIES_PATH}. Ejecute: npm run seed:import-san-sebastian`,
    );
  }
  const raw = JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf8')) as string[];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Categorías inválidas o vacías en ${CATEGORIES_PATH}`);
  }
  return raw;
}

export function loadSanSebastianCatalogJson(): SanSebastianCatalogJson {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(
      `No se encontró ${CATALOG_PATH}. Ejecute: npm run seed:import-san-sebastian`,
    );
  }
  const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')) as SanSebastianCatalogJson;
  if (!Array.isArray(raw.products) || raw.products.length === 0) {
    throw new Error(`Catálogo inválido o vacío en ${CATALOG_PATH}`);
  }
  return raw;
}

function toRetailNet(saleGross: number, hasIva: boolean): number {
  if (saleGross <= 0) return 0;
  if (!hasIva) return saleGross;
  return Math.round(saleGross / (1 + IVA_RATE));
}

function toGross(net: number, hasIva: boolean): number {
  if (net <= 0) return 0;
  return hasIva ? Math.round(net * (1 + IVA_RATE)) : net;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function clearSanSebastianCatalog(args: {
  companyId: string;
  dataSource: DataSource;
  variantRepo: Repository<ProductVariant>;
}): Promise<{ removedVariants: number; removedProducts: number }> {
  const { companyId, dataSource, variantRepo } = args;

  const variants = await variantRepo.find({
    where: { companyId, sku: Like(`${SEED_SAN_SEBASTIAN_VARIANT_SKU_PREFIX}%`) },
    select: ['id', 'productId'],
  });
  if (variants.length === 0) {
    return { removedVariants: 0, removedProducts: 0 };
  }

  const variantIds = variants.map((v) => v.id);
  const productIds = [...new Set(variants.map((v) => v.productId).filter(Boolean))];

  for (const batch of chunk(variantIds, INSERT_BATCH_SIZE)) {
    await dataSource
      .createQueryBuilder()
      .delete()
      .from(PriceListItem)
      .where('"productVariantId" IN (:...ids)', { ids: batch })
      .execute();
    await variantRepo.delete(batch);
  }

  let removedProducts = 0;
  for (const batch of chunk(productIds, INSERT_BATCH_SIZE)) {
    const result = await dataSource
      .createQueryBuilder()
      .delete()
      .from(Product)
      .where('id IN (:...ids)', { ids: batch })
      .andWhere('companyId = :companyId', { companyId })
      .execute();
    removedProducts += result.affected ?? 0;
  }

  return { removedVariants: variants.length, removedProducts };
}

export async function seedSanSebastianCatalogBulk(args: {
  companyId: string;
  dataSource: DataSource;
  productRepo: Repository<Product>;
  variantRepo: Repository<ProductVariant>;
  priceListItemRepo: Repository<PriceListItem>;
  categoryByName: Map<string, Category>;
  unitId: string;
  priceListId: string;
  ivaTaxId: string;
  catalog: SanSebastianCatalogJson;
}): Promise<{ productCount: number; variantCount: number }> {
  const {
    companyId,
    dataSource,
    productRepo,
    variantRepo,
    priceListItemRepo,
    categoryByName,
    unitId,
    priceListId,
    ivaTaxId,
    catalog,
  } = args;

  const cleared = await clearSanSebastianCatalog({ companyId, dataSource, variantRepo });
  if (cleared.removedVariants > 0) {
    console.log(
      `🧹 Catálogo SS previo eliminado: ${cleared.removedVariants} variantes, ${cleared.removedProducts} productos`,
    );
  }

  const productRows: Record<string, unknown>[] = [];
  const variantRows: Record<string, unknown>[] = [];
  const priceRows: Record<string, unknown>[] = [];

  for (const item of catalog.products) {
    const category = categoryByName.get(item.categoryName);
    if (!category) {
      throw new Error(
        `Seed San Sebastián: categoría «${item.categoryName}» no existe (producto «${item.name}»)`,
      );
    }

    const productId = randomUUID();
    const variantId = randomUUID();
    const sku = `${SEED_SAN_SEBASTIAN_VARIANT_SKU_PREFIX}${item.sami6Id}`;
    const retailNet = toRetailNet(item.saleGross, item.hasIva);
    const gross = toGross(retailNet, item.hasIva);
    const taxIds = item.hasIva ? [ivaTaxId] : [];

    productRows.push({
      id: productId,
      companyId,
      name: item.name,
      brand: SEED_SAN_SEBASTIAN_BRAND,
      brandId: null,
      description: null,
      productType: ProductType.PHYSICAL,
      categoryId: category.id,
      taxIds: taxIds,
      isActive: true,
      visibleInEShop: false,
      baseUnitId: unitId,
    });

    variantRows.push({
      id: variantId,
      companyId,
      productId,
      sku,
      barcode: item.barcode,
      basePrice: retailNet,
      baseCost: 0,
      pmp: null,
      pmpHistory: null,
      unitId,
      stockBaseUnitId: unitId,
      saleUnitId: unitId,
      purchaseUnitId: unitId,
      taxIds: taxIds,
      trackInventory: false,
      allowNegativeStock: false,
      isActive: true,
      visibleInEShop: false,
      minimumStock: 0,
      maximumStock: 0,
      reorderPoint: 0,
      minimumStockEnabled: false,
      maximumStockEnabled: false,
      reorderPointEnabled: false,
    });

    priceRows.push({
      id: randomUUID(),
      companyId,
      priceListId,
      productId,
      productVariantId: variantId,
      netPrice: retailNet,
      grossPrice: gross,
      taxIds: taxIds,
    });
  }

  for (const batch of chunk(productRows, INSERT_BATCH_SIZE)) {
    await productRepo.insert(batch as never);
  }
  for (const batch of chunk(variantRows, INSERT_BATCH_SIZE)) {
    await variantRepo.insert(batch as never);
  }
  for (const batch of chunk(priceRows, INSERT_BATCH_SIZE)) {
    await priceListItemRepo.insert(batch as never);
  }

  console.log(
    `✅ Catálogo San Sebastián insertado: ${productRows.length} productos / ${variantRows.length} variantes (sin control de stock)`,
  );

  return { productCount: productRows.length, variantCount: variantRows.length };
}
