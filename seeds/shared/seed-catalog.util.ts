import { DeepPartial, Repository } from 'typeorm';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import type {
  SeedAttributeDefinition,
  SeedProductDefinition,
  SeedUnitKey,
  SeedVariantDefinition,
} from './seed-catalog.types';

export function resolveSeedVariantAttributeValues(
  raw: Record<string, string> | undefined,
  attributesByName: Map<string, Attribute>,
  logPrefix = 'Seed',
): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [attrName, optionValue] of Object.entries(raw)) {
    const option = optionValue?.trim();
    if (!option) {
      continue;
    }
    const attr = attributesByName.get(attrName.trim());
    if (!attr?.id) {
      console.warn(
        `⚠️ ${logPrefix}: atributo «${attrName}» no encontrado; se omite en variante`,
      );
      continue;
    }
    const allowed = Array.isArray(attr.options) ? attr.options : [];
    if (!allowed.includes(option)) {
      console.warn(
        `⚠️ ${logPrefix}: opción «${option}» no válida para atributo «${attrName}»; se omite`,
      );
      continue;
    }
    out[attr.id] = option;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export async function syncSeedCategories(
  categoryRepo: Repository<Category>,
  companyId: string,
  categoryNames: readonly string[],
  logPrefix = 'Seed',
  opts?: { silent?: boolean },
): Promise<Map<string, Category>> {
  const categoryByName = new Map<string, Category>();
  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    const existing = await categoryRepo.findOne({
      where: { name, companyId },
    });
    const saved = existing
      ? await categoryRepo.save({
          ...existing,
          companyId,
          name,
          description: undefined,
          parentId: undefined,
          sortOrder: i,
          isActive: true,
          resultCenterId: null,
        })
      : await categoryRepo.save(
          categoryRepo.create({
            companyId,
            name,
            description: undefined,
            parentId: undefined,
            sortOrder: i,
            isActive: true,
            resultCenterId: null,
          }),
        );
    categoryByName.set(name, saved);
    if (!opts?.silent) {
      console.log(
        `✅ ${logPrefix} categoría ${saved.name} ${existing ? 'sincronizada' : 'creada'}: id=${saved.id}`,
      );
    }
  }
  if (opts?.silent) {
    console.log(
      `✅ ${logPrefix} categorías sincronizadas: ${categoryNames.length}`,
    );
  }
  return categoryByName;
}

export async function syncSeedAttributes(
  attributeRepo: Repository<Attribute>,
  defs: readonly SeedAttributeDefinition[],
  logPrefix = 'Seed',
): Promise<Map<string, Attribute>> {
  const attributesByName = new Map<string, Attribute>();
  for (const def of defs) {
    const existingAttr = await attributeRepo.findOne({
      where: { name: def.name },
    });
    const saved = existingAttr
      ? await attributeRepo.save({
          ...existingAttr,
          description: undefined,
          options: [...def.options],
          displayOrder: def.displayOrder,
          isActive: true,
        })
      : await attributeRepo.save(
          attributeRepo.create({
            name: def.name,
            description: undefined,
            options: [...def.options],
            displayOrder: def.displayOrder,
            isActive: true,
          }),
        );
    attributesByName.set(saved.name, saved);
    console.log(
      `✅ ${logPrefix} atributo ${saved.name} (${saved.options.length} opciones) ${existingAttr ? 'sincronizado' : 'creado'}: id=${saved.id}`,
    );
  }
  return attributesByName;
}

export async function syncSeedBrands(
  brandRepo: Repository<Brand>,
  companyId: string,
  brandNames: readonly string[],
  logPrefix = 'Seed',
): Promise<Map<string, string>> {
  const brandIdByName = new Map<string, string>();
  for (const nm of brandNames) {
    let b = await brandRepo.findOne({
      where: { companyId, name: nm },
    });
    if (!b) {
      b = brandRepo.create({ companyId, name: nm, isActive: true });
      b = await brandRepo.save(b);
      console.log(`✅ ${logPrefix} marca creada: «${nm}» id=${b.id}`);
    } else {
      b.isActive = true;
      b = await brandRepo.save(b);
      console.log(`✅ ${logPrefix} marca sincronizada: «${nm}» id=${b.id}`);
    }
    brandIdByName.set(nm, b.id);
  }
  return brandIdByName;
}

export type SeedCatalogContext = {
  companyId: string;
  productRepo: Repository<Product>;
  variantRepo: Repository<ProductVariant>;
  priceListItemRepo: Repository<PriceListItem>;
  ivaTax: Tax;
  categoryByName: Map<string, Category>;
  brandIdByName: Map<string, string>;
  attributesByName: Map<string, Attribute>;
  seedUnitId: Record<SeedUnitKey, string>;
  listaMinoristaId: string;
  listaMayoristaId: string;
  listaEshopId: string;
  logPrefix?: string;
  defaultStockQty?: number;
  /** Si true, no loguea cada producto (útil en catálogos grandes). */
  silentProducts?: boolean;
};

export type SeedCatalogResult = {
  variantCount: number;
  stockByVariantId: Map<string, number>;
};

export async function seedProductsFromDefinitions(
  products: readonly SeedProductDefinition[],
  ctx: SeedCatalogContext,
): Promise<SeedCatalogResult> {
  const logPrefix = ctx.logPrefix ?? 'Seed';
  const defaultStock = ctx.defaultStockQty ?? 12;
  const stockByVariantId = new Map<string, number>();
  let variantCount = 0;

  const upsertPriceListItem = async (args: {
    priceListId: string;
    productId: string;
    productVariantId: string;
    net: number;
    taxId: string;
  }) => {
    const gross = Math.round(args.net * 1.19);
    let row = await ctx.priceListItemRepo.findOne({
      where: {
        priceListId: args.priceListId,
        productId: args.productId,
        productVariantId: args.productVariantId,
      },
    });
    if (!row) {
      row = ctx.priceListItemRepo.create({
        priceListId: args.priceListId,
        productId: args.productId,
        productVariantId: args.productVariantId,
        netPrice: args.net,
        grossPrice: gross,
        taxIds: [args.taxId],
      });
    } else {
      row.netPrice = args.net;
      row.grossPrice = gross;
      row.taxIds = [args.taxId];
    }
    await ctx.priceListItemRepo.save(row);
  };

  for (const def of products) {
    const category = ctx.categoryByName.get(def.categoryName);
    if (!category) {
      throw new Error(
        `${logPrefix}: categoría «${def.categoryName}» no existe (producto «${def.name}»)`,
      );
    }

    let product = await ctx.productRepo.findOne({
      where: { name: def.name, companyId: ctx.companyId },
    });
    const isInsumo = def.productType === ProductType.INSUMO;
    const productPayload = {
      name: def.name,
      brand: def.brand,
      brandId: ctx.brandIdByName.get(def.brand) ?? null,
      description: def.description,
      productType: def.productType,
      categoryId: category.id,
      taxIds: [ctx.ivaTax.id],
      isActive: true,
      visibleInEShop: isInsumo ? false : (def.visibleInEShop ?? true),
      baseUnitId: ctx.seedUnitId[def.productBaseUnit ?? 'UN'],
    };
    if (!product) {
      product = ctx.productRepo.create(productPayload);
    } else {
      Object.assign(product, productPayload);
    }
    product = await ctx.productRepo.save(product);

    for (const vd of def.variants) {
      await upsertSeedVariant(
        product.id,
        vd,
        ctx,
        upsertPriceListItem,
        logPrefix,
        def.productType,
        product.visibleInEShop === true,
      );
      variantCount += 1;
      const saved = await ctx.variantRepo.findOne({
        where: { sku: vd.sku, companyId: ctx.companyId },
      });
      if (saved && vd.trackInventory) {
        // ELABORADO / PREPARADO: stock sale de producción/comanda, no del seed.
        const startsAtZero =
          def.productType === ProductType.ELABORADO ||
          def.productType === ProductType.PREPARADO;
        stockByVariantId.set(saved.id, startsAtZero ? 0 : defaultStock);
      }
    }

    if (!ctx.silentProducts) {
      console.log(
        `✅ ${logPrefix} producto «${def.name}» (${def.productType}) variantes=${def.variants.length}`,
      );
    }
  }

  return { variantCount, stockByVariantId };
}

async function upsertSeedVariant(
  productId: string,
  vd: SeedVariantDefinition,
  ctx: SeedCatalogContext,
  upsertPriceListItem: (args: {
    priceListId: string;
    productId: string;
    productVariantId: string;
    net: number;
    taxId: string;
  }) => Promise<void>,
  logPrefix: string,
  productType: ProductType,
  productVisibleInEShop: boolean,
): Promise<void> {
  let variant = await ctx.variantRepo.findOne({
    where: { sku: vd.sku, companyId: ctx.companyId },
  });
  const triplet = vd.uom ?? { stock: 'UN' as const, sale: 'UN' as const, purchase: 'UN' as const };
  const saleId = ctx.seedUnitId[triplet.sale];
  const stockId = ctx.seedUnitId[triplet.stock];
  const purchaseId = ctx.seedUnitId[triplet.purchase];

  const attributeValues = resolveSeedVariantAttributeValues(
    vd.attributeValues,
    ctx.attributesByName,
    logPrefix,
  );

  const isInsumo = productType === ProductType.INSUMO;
  const variantPayload: DeepPartial<ProductVariant> = {
    productId,
    sku: vd.sku,
    barcode: vd.barcode,
    basePrice: isInsumo ? 0 : (vd.basePrice ?? 0),
    baseCost: vd.baseCost,
    pmp: null,
    pmpHistory: null,
    unitId: saleId,
    stockBaseUnitId: stockId,
    saleUnitId: saleId,
    purchaseUnitId: purchaseId,
    attributeValues,
    taxIds: [ctx.ivaTax.id],
    trackInventory: vd.trackInventory,
    allowNegativeStock: vd.allowNegativeStock ?? false,
    isActive: true,
    visibleInEShop: isInsumo ? false : productVisibleInEShop,
    minimumStock: 0,
    maximumStock: 0,
    reorderPoint: 0,
  };

  if (!isInsumo && vd.shipping) {
    const k = vd.shipping.volumetricDivisorK ?? 5000;
    variantPayload.netWeightKg = vd.shipping.netWeightKg;
    variantPayload.grossWeightKg = vd.shipping.grossWeightKg;
    variantPayload.packageLengthCm = vd.shipping.packageLengthCm;
    variantPayload.packageWidthCm = vd.shipping.packageWidthCm;
    variantPayload.packageHeightCm = vd.shipping.packageHeightCm;
    variantPayload.volumetricDivisorK = k;
  }

  if (!variant) {
    variant = ctx.variantRepo.create(variantPayload);
  } else {
    Object.assign(variant, variantPayload);
  }

  const savedVariant = await ctx.variantRepo.save(variant);

  if (isInsumo) {
    return;
  }

  const retailNet = vd.retailNet;
  if (retailNet == null) {
    throw new Error(
      `${logPrefix}: variante «${vd.sku}» sin retailNet (requerido para productos vendibles)`,
    );
  }

  await upsertPriceListItem({
    priceListId: ctx.listaMinoristaId,
    productId,
    productVariantId: savedVariant.id,
    net: retailNet,
    taxId: ctx.ivaTax.id,
  });
  await upsertPriceListItem({
    priceListId: ctx.listaEshopId,
    productId,
    productVariantId: savedVariant.id,
    net: retailNet,
    taxId: ctx.ivaTax.id,
  });
  if (vd.inBothPriceLists) {
    const wholesaleNet = vd.wholesaleNet;
    if (wholesaleNet == null) {
      throw new Error(
        `${logPrefix}: variante «${vd.sku}» sin wholesaleNet (inBothPriceLists=true)`,
      );
    }
    await upsertPriceListItem({
      priceListId: ctx.listaMayoristaId,
      productId,
      productVariantId: savedVariant.id,
      net: wholesaleNet,
      taxId: ctx.ivaTax.id,
    });
  }
}

export { ProductType };
