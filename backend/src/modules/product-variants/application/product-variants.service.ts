import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Unit } from '@modules/units/domain/unit.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  ProductVariantsRepositoryPort,
  PRODUCT_VARIANTS_REPOSITORY,
} from './ports/product-variants.repository.port';
import {
  PRICE_LIST_ITEMS_REPOSITORY,
  PriceListItemsRepositoryPort,
} from '@modules/price-list-items/application/ports/price-list-items.repository.port';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { AttributesService } from '@modules/attributes/application/attributes.service';
import { Product } from '@modules/products/domain/product.entity';
import { VariantQuantityConversionService } from './variant-quantity-conversion.service';
import { SearchPurchasingVariantsDto } from './dto/search-purchasing-variants.dto';
import type { PmpHistoryEntry } from '../domain/pmp-history.types';
import type { SalePriceHistoryEntry } from '../domain/sale-price-history.types';
import {
  filterSalePriceHistory,
  recordSalePriceHistory,
  type SalePriceSnapshot,
} from './helpers/sale-price-history';
import { TenantContext } from '@common/tenant';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { User } from '@modules/users/domain/user.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import {
  foldPurchasingSearchText,
  mysqlFoldLowerColumnExpr,
  PG_PURCHASING_SEARCH_TRANSLATE_FROM,
  PG_PURCHASING_SEARCH_TRANSLATE_TO,
  purchasingSearchLikePattern,
} from './helpers/purchasing-search-text-fold';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { variantThresholdDefaultsFromRow } from '@modules/stock-realtime/stock-threshold-field.util';
import {
  resolveStockThresholds,
  sumVariantPhysicalStock,
  type VariantThresholds,
} from '@modules/stock-realtime/stock-threshold-resolution.util';
import {
  computeVariantStockAlertKinds,
  stockLevelToThresholdSlice,
} from '@modules/stock-realtime/variant-stock-alert.util';
import { ProductEshopVisibilitySyncService } from '@modules/products/application/services/product-eshop-visibility-sync.service';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import {
  applyTaxIdsToPriceRows,
  applyVariantFiscalProfile,
  resolveDefaultIvaTaxIdsFromCatalog,
  type VariantPriceFiscalRow,
} from './helpers/variant-fiscal-profile';
import {
  DEFAULT_VARIANT_TAX_CATEGORY,
  isSpecialVariantTaxCategory,
} from '../domain/variant-tax-category';

/** PMP en API: `null` si no hubo primera compra; nunca forzar 0 por defecto. */
function pmpForApi(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function supplierDisplayName(supplier: Supplier | null | undefined): string | null {
  if (!supplier) return null;
  const alias = supplier.alias?.trim();
  if (alias) return alias;
  const person = (supplier as { person?: { businessName?: string; firstName?: string; lastName?: string } })
    .person;
  if (!person) return null;
  const business = person.businessName?.trim();
  if (business) return business;
  const full = [person.firstName, person.lastName]
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .join(' ');
  return full || null;
}

const PURCHASE_INSIGHTS_EXCLUDED_STATUSES: TransactionStatus[] = [
  TransactionStatus.DRAFT,
  TransactionStatus.CANCELLED,
  TransactionStatus.VOIDED,
];

@Injectable()
export class ProductVariantsService {
  constructor(
    @Inject(PRODUCT_VARIANTS_REPOSITORY)
    private readonly variantRepository: ProductVariantsRepositoryPort,
    @Inject(PRICE_LIST_ITEMS_REPOSITORY)
    private readonly priceListItemRepository: PriceListItemsRepositoryPort,
    private readonly multimediaService: MultimediaServiceAdapter,
    private readonly attributesService: AttributesService,
    @InjectRepository(ProductVariant)
    private readonly variantOrm: Repository<ProductVariant>,
    @InjectRepository(StockLevel)
    private readonly stockLevelOrm: Repository<StockLevel>,
    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,
    private readonly conversion: VariantQuantityConversionService,
    private readonly eshopVisibilitySync: ProductEshopVisibilitySyncService,
  ) {}

  private purchasingStockBreakdownForVariant(
    v: ProductVariant,
    levels: StockLevel[],
  ): {
    storageStocks: Array<{
      storageId: string;
      storageName: string;
      branchName: string | null;
      availableStock: number;
      hasStockAlert: boolean;
    }>;
    hasStockAlert: boolean;
  } {
    if (!levels.length) {
      return { storageStocks: [], hasStockAlert: false };
    }
    const slices = levels.map((sl) => stockLevelToThresholdSlice(sl));
    const totalPhysical = sumVariantPhysicalStock(slices);
    const defaults = variantThresholdDefaultsFromRow(v);
    const variantRow: VariantThresholds = {
      minimumStock: defaults.minimumStock,
      minimumStockEnabled: defaults.minimumStockEnabled,
      maximumStock: defaults.maximumStock,
      maximumStockEnabled: defaults.maximumStockEnabled,
      reorderPoint: defaults.reorderPoint,
      reorderPointEnabled: defaults.reorderPointEnabled,
    };
    const storageStocks = levels.map((sl) => {
      const qty = Number(sl.physicalStock ?? 0) || 0;
      const reserved = Number(sl.committedStock ?? 0) || 0;
      const available = qty - reserved;
      const slice = stockLevelToThresholdSlice(sl);
      const resolved = resolveStockThresholds(variantRow, slice, {
        totalPhysicalStock: totalPhysical,
      });
      const st = sl.storage;
      const storageName = (st?.name ?? '').trim() || 'Almacén';
      const branchRaw = (st as { branch?: { name?: string } } | undefined)?.branch?.name;
      const branchName =
        branchRaw != null && String(branchRaw).trim() ? String(branchRaw).trim() : null;
      return {
        storageId: sl.storageId,
        storageName,
        branchName,
        availableStock: available,
        hasStockAlert: resolved.alerts.length > 0,
      };
    });
    storageStocks.sort((a, b) =>
      a.storageName.localeCompare(b.storageName, 'es', { sensitivity: 'base' }),
    );
    const variantKinds = computeVariantStockAlertKinds(v, slices);
    return { storageStocks, hasStockAlert: variantKinds.length > 0 };
  }

  private parseCountBridgeInput(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return n;
  }

  async findAll(params?: Record<string, any>) {
    // If adapter exposes query builder, use it; otherwise fallback to port's findAll
    const qb = (this.variantRepository as any).createQueryBuilder
      ? (this.variantRepository as any).createQueryBuilder('v')
      : null;

    if (qb) {
      qb.leftJoinAndSelect(
        'v.priceListItems',
        'priceListItem',
        'priceListItem.deletedAt IS NULL',
      )
        .leftJoinAndSelect(
          'priceListItem.priceList',
          'priceList.deletedAt IS NULL AND priceList.isActive = true',
        )
        .leftJoinAndSelect('v.product', 'product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('v.unit', 'unit')
        .leftJoinAndSelect('v.stockBaseUnit', 'stockBaseUnit')
        .leftJoinAndSelect('v.saleUnit', 'saleUnit')
        .leftJoinAndSelect('v.purchaseUnit', 'purchaseUnit')
        .where('v.deletedAt IS NULL');
      if (params?.productId)
        qb.andWhere('v.productId = :productId', {
          productId: params.productId,
        });
    }

    const variants = qb
      ? await qb.getMany()
      : await this.variantRepository.findAll(params);

    // Group variants by product for the frontend
    const productMap = new Map<string, any>();
    const variantMediaMap = new Map<string, { primaryImageUrl: string | null; mediaAssets: Array<{ id: string; publicUrl: string; mimeType: string; kind: string }> }>();

    await Promise.all(
      variants.map(async (variant) => {
        const assets = await this.multimediaService.listByEntity(
          'product-variant',
          variant.id,
        );
        variantMediaMap.set(variant.id, {
          primaryImageUrl: assets[0]?.publicUrl ?? null,
          mediaAssets: assets.map((asset) => ({
            id: asset.id,
            publicUrl: asset.publicUrl,
            mimeType: asset.mimeType,
            kind: asset.kind,
          })),
        });
      }),
    );

    for (const variant of variants) {
      const productId = variant.productId || 'no-product';
      if (!productMap.has(productId)) {
        const product = variant.product;
        productMap.set(productId, {
          id: productId,
          name: product?.name || 'Producto sin nombre',
          brand: product?.brand || null,
          categoryId: product?.categoryId || null,
          categoryName: product?.category?.name || null,
          isActive: product?.isActive ?? true,
          visibleInEShop: product?.visibleInEShop === true,
          isMultiVariant: false,
          variantCount: 0,
          variants: [],
        });
      }

      const productData = productMap.get(productId);
      productData.variantCount++;

      const priceListItems = (variant.priceListItems || []).map(
        (item: any) => ({
          priceListId: item.priceListId,
          priceListName: item.priceList?.name || 'Lista sin nombre',
          currency: item.priceList?.currency || 'CLP',
          netPrice: Number(item.netPrice),
          grossPrice: Number(item.grossPrice),
          taxIds: item.taxIds || [],
          updatedAt: item.updatedAt
            ? new Date(item.updatedAt).toISOString()
            : null,
        }),
      );

      productData.variants.push({
        id: variant.id,
        productId: variant.productId,
        sku: variant.sku,
        barcode: variant.barcode,
        basePrice: Number(variant.basePrice),
        baseCost: Number(variant.baseCost),
        pmp: pmpForApi(variant.pmp),
        unitId: variant.unitId,
        stockBaseUnitId: variant.stockBaseUnitId,
        saleUnitId: variant.saleUnitId,
        purchaseUnitId: variant.purchaseUnitId,
        stockBaseQtyPerCountSaleUnit:
          (variant as any).stockBaseQtyPerCountSaleUnit != null
            ? Number((variant as any).stockBaseQtyPerCountSaleUnit)
            : null,
        stockBaseQtyPerCountPurchaseUnit:
          (variant as any).stockBaseQtyPerCountPurchaseUnit != null
            ? Number((variant as any).stockBaseQtyPerCountPurchaseUnit)
            : null,
        unitOfMeasure: variant.unit?.name || 'Unidad',
        attributeValues: variant.attributeValues || {},
        displayName: this.generateDisplayName(variant),
        trackInventory: variant.trackInventory,
        allowNegativeStock: variant.allowNegativeStock,
        isActive: variant.isActive,
        visibleInEShop: Boolean((variant as any).visibleInEShop),
        netWeightKg:
          (variant as any).netWeightKg != null
            ? Number((variant as any).netWeightKg)
            : null,
        grossWeightKg:
          (variant as any).grossWeightKg != null
            ? Number((variant as any).grossWeightKg)
            : null,
        packageLengthCm:
          (variant as any).packageLengthCm != null
            ? Number((variant as any).packageLengthCm)
            : null,
        packageWidthCm:
          (variant as any).packageWidthCm != null
            ? Number((variant as any).packageWidthCm)
            : null,
        packageHeightCm:
          (variant as any).packageHeightCm != null
            ? Number((variant as any).packageHeightCm)
            : null,
        volumetricDivisorK:
          (variant as any).volumetricDivisorK != null
            ? Number((variant as any).volumetricDivisorK)
            : null,
        primaryImageUrl:
          variantMediaMap.get(variant.id)?.primaryImageUrl ?? null,
        mediaAssets: variantMediaMap.get(variant.id)?.mediaAssets ?? [],
        priceListItems,
      });
    }

    return Array.from(productMap.values());
  }

  /**
   * Rejects payloads where the same price list appears more than once per variant.
   */
  private assertUniquePriceListIdsInPayload(items: unknown): void {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    const ids = items
      .map((item: any) =>
        typeof item?.priceListId === 'string' ? item.priceListId.trim() : '',
      )
      .filter((id: string) => id.length > 0);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new BadRequestException(
        'No puede repetir la misma lista de precios en más de una fila.',
      );
    }
  }

  private attributeValuesSignature(
    av: Record<string, string> | null | undefined,
  ): string | null {
    if (!av || typeof av !== 'object' || Object.keys(av).length === 0) {
      return null;
    }
    const sortedKeys = Object.keys(av).sort();
    const norm: Record<string, string> = {};
    for (const k of sortedKeys) {
      norm[k] = String((av as any)[k]).trim();
    }
    return JSON.stringify(norm);
  }

  private parseAttributeValuesRow(raw: unknown): Record<string, string> | null {
    if (raw == null) {
      return null;
    }
    if (typeof raw === 'string') {
      try {
        const p = JSON.parse(raw);
        if (typeof p === 'object' && p != null && !Array.isArray(p)) {
          return p as Record<string, string>;
        }
        return null;
      } catch {
        return null;
      }
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, string>;
    }
    return null;
  }

  private async assertUniqueAttributeValuesAmongSiblings(
    productId: string | null | undefined,
    normalized: Record<string, string> | null,
    excludeVariantId?: string,
  ): Promise<void> {
    const sig = this.attributeValuesSignature(normalized);
    if (!sig || !productId) {
      return;
    }
    const siblings = await this.variantRepository.findAll({ productId });
    for (const s of siblings) {
      if (excludeVariantId && (s as any).id === excludeVariantId) {
        continue;
      }
      const av = this.parseAttributeValuesRow((s as any).attributeValues);
      if (this.attributeValuesSignature(av) === sig) {
        throw new BadRequestException(
          'Ya existe una variante de este producto con la misma combinación de atributos.',
        );
      }
    }
  }

  private generateDisplayName(variant: any): string {
    if (
      !variant.attributeValues ||
      Object.keys(variant.attributeValues).length === 0
    ) {
      return 'Variante estándar';
    }

    const parts = Object.entries(variant.attributeValues)
      .map(([_, value]) => `${value}`)
      .filter(Boolean);

    return parts.join(', ') || 'Variante sin nombre';
  }

  /** Exact match by SKU or barcode (stock PWA scanner). */
  async lookupByCode(value: string, by: 'barcode' | 'sku') {
    const v = String(value || '').trim();
    if (!v) {
      throw new BadRequestException('value es obligatorio');
    }
    const mode = by === 'sku' ? 'sku' : 'barcode';
    const qb = this.variantOrm
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .where('variant.deletedAt IS NULL')
      .andWhere('(product.deletedAt IS NULL OR product.id IS NULL)');
    if (mode === 'sku') {
      qb.andWhere('LOWER(variant.sku) = LOWER(:v)', { v });
    } else {
      qb.andWhere(
        'variant.barcode IS NOT NULL AND LOWER(variant.barcode) = LOWER(:v)',
        { v },
      );
    }
    const variants = await qb.getMany();
    const items = variants.map((variant) => {
      const product: any = variant.product;
      return {
        variantId: variant.id,
        sku: variant.sku || '',
        barcode: variant.barcode ?? null,
        productName: product?.name || '',
        attributeValues: variant.attributeValues || {},
      };
    });
    if (items.length === 1) {
      return items[0];
    }
    return { items };
  }

  async findOne(id: string) {
    const v =
      typeof (this.variantRepository as any).findById === 'function'
        ? await (this.variantRepository as any).findById(id)
        : null;
    if (!v) throw new NotFoundException('Product variant not found');
    const mediaMap = await this.multimediaService.listByEntityIds(
      'product-variant',
      [v.id],
      undefined,
      'all',
    );
    const assets = mediaMap[v.id] ?? [];
    (v as any).primaryImageUrl = null;
    (v as any).mediaAssets = assets.map((asset) => ({
      id: asset.id,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      kind: asset.kind,
    }));
    return v;
  }

  async create(data: any) {
    const sanitizedData = { ...data };
    const multimediaAssetIds = Array.isArray(sanitizedData.multimediaAssetIds)
      ? [...sanitizedData.multimediaAssetIds]
      : undefined;
    delete sanitizedData.multimediaAssetIds;
    delete (sanitizedData as any).pmpHistory;
    delete (sanitizedData as any).salePriceHistory;

    this.assertUniquePriceListIdsInPayload(sanitizedData.priceListItems);

    const normalizedAttrValues =
      await this.attributesService.validateAndNormalizeAttributeValues(
        sanitizedData.attributeValues,
      );
    await this.assertUniqueAttributeValuesAmongSiblings(
      sanitizedData.productId || null,
      normalizedAttrValues,
    );

    if (
      Object.prototype.hasOwnProperty.call(sanitizedData, 'pmp') &&
      sanitizedData.pmp != null &&
      Number(sanitizedData.pmp) > 0
    ) {
      throw new BadRequestException(
        'El PMP se asigna con la primera compra registrada; no puede definirse al crear la variante.',
      );
    }
    delete (sanitizedData as { pmp?: unknown }).pmp;

    if (!sanitizedData.productId) {
      throw new BadRequestException('productId es obligatorio para crear variante.');
    }
    const product = await this.variantOrm.manager.getRepository(Product).findOne({
      where: { id: sanitizedData.productId },
    });
    if (!product?.companyId) {
      throw new BadRequestException('Producto no encontrado o sin empresa.');
    }
    const companyId = product.companyId;
    const saleId = String(sanitizedData.saleUnitId ?? sanitizedData.unitId ?? '').trim();
    if (!saleId) {
      throw new BadRequestException('unitId (unidad de venta) es obligatoria.');
    }
    const stockId = String(sanitizedData.stockBaseUnitId ?? saleId).trim();
    const purchaseId = String(sanitizedData.purchaseUnitId ?? saleId).trim();
    const bridgesForValidate = {
      stockBaseQtyPerCountSaleUnit: this.parseCountBridgeInput(
        sanitizedData.stockBaseQtyPerCountSaleUnit,
      ),
      stockBaseQtyPerCountPurchaseUnit: this.parseCountBridgeInput(
        sanitizedData.stockBaseQtyPerCountPurchaseUnit,
      ),
    };
    await this.conversion.validateVariantUomTripletAsync(
      stockId,
      saleId,
      purchaseId,
      companyId,
      bridgesForValidate,
    );
    const unitRows = await this.variantOrm.manager.getRepository(Unit).find({
      where: { companyId, deletedAt: IsNull() },
    });
    const byIdForNorm = new Map(unitRows.map((u) => [u.id, u]));
    const persistedBridges = this.conversion.normalizePersistedCountBridges(
      stockId,
      saleId,
      purchaseId,
      byIdForNorm,
      bridgesForValidate,
    );

    const variant = {
      companyId,
      productId: sanitizedData.productId || null,
      sku: sanitizedData.sku || '',
      barcode: sanitizedData.barcode || null,
      basePrice: sanitizedData.basePrice ?? 0,
      baseCost: sanitizedData.baseCost ?? 0,
      pmp: null,
      pmpHistory: null,
      salePriceHistory: null,
      unitId: saleId,
      stockBaseUnitId: stockId,
      saleUnitId: saleId,
      purchaseUnitId: purchaseId,
      stockBaseQtyPerCountSaleUnit: persistedBridges.stockBaseQtyPerCountSaleUnit,
      stockBaseQtyPerCountPurchaseUnit: persistedBridges.stockBaseQtyPerCountPurchaseUnit,
      netWeightKg: sanitizedData.netWeightKg ?? null,
      grossWeightKg: sanitizedData.grossWeightKg ?? null,
      packageLengthCm: sanitizedData.packageLengthCm ?? null,
      packageWidthCm: sanitizedData.packageWidthCm ?? null,
      packageHeightCm: sanitizedData.packageHeightCm ?? null,
      volumetricDivisorK: sanitizedData.volumetricDivisorK ?? null,
      attributeValues: normalizedAttrValues,
      taxIds: null as string[] | null,
      taxCategory: DEFAULT_VARIANT_TAX_CATEGORY,
      requiresDte: true,
      trackInventory:
        typeof sanitizedData.trackInventory === 'boolean'
          ? sanitizedData.trackInventory
          : true,
      allowNegativeStock: Boolean(sanitizedData.allowNegativeStock),
      minimumStock: sanitizedData.minimumStock ?? 0,
      minimumStockEnabled: Boolean(sanitizedData.minimumStockEnabled),
      maximumStock: sanitizedData.maximumStock ?? 0,
      maximumStockEnabled: Boolean(sanitizedData.maximumStockEnabled),
      reorderPoint: sanitizedData.reorderPoint ?? 0,
      reorderPointEnabled: Boolean(sanitizedData.reorderPointEnabled),
      isActive:
        typeof sanitizedData.isActive === 'boolean'
          ? sanitizedData.isActive
          : true,
      visibleInEShop: Object.prototype.hasOwnProperty.call(
        sanitizedData,
        'visibleInEShop',
      )
        ? sanitizedData.visibleInEShop === true
        : product.visibleInEShop === true,
    } as any;

    const createPriceRows = this.mapPriceRowsFromPayload(sanitizedData.priceListItems);
    const createFiscal = await this.buildFiscalProfileForSave(
      companyId,
      {
        taxCategory: sanitizedData.taxCategory,
        requiresDte: sanitizedData.requiresDte,
        taxIds: sanitizedData.taxIds,
        priceListItems: createPriceRows.length ? createPriceRows : undefined,
      },
    );
    variant.taxCategory = createFiscal.taxCategory;
    variant.requiresDte = createFiscal.requiresDte;
    variant.taxIds = createFiscal.taxIds;
    if (createFiscal.priceListItems && sanitizedData.priceListItems?.length) {
      sanitizedData.priceListItems = this.mergeFiscalPriceRowsIntoPayload(
        sanitizedData.priceListItems,
        createFiscal.priceListItems,
      );
    }

    try {
      const saved = await this.variantRepository.save(variant);

      if (
        sanitizedData.priceListItems &&
        Array.isArray(sanitizedData.priceListItems) &&
        sanitizedData.priceListItems.length > 0
      ) {
        const priceListItems = sanitizedData.priceListItems.map(
          (item: any) =>
            ({
              priceListId: item.priceListId,
              productId: sanitizedData.productId || null,
              productVariantId: saved.id as any,
              netPrice: item.netPrice ?? 0,
              grossPrice: item.grossPrice ?? 0,
              taxIds: item.taxIds ?? null,
            }) as any,
        );

        await Promise.all(
          priceListItems.map((it: any) =>
            this.priceListItemRepository.save(it),
          ),
        );

        (saved as ProductVariant).salePriceHistory = recordSalePriceHistory({
          existing: null,
          previousItems: [],
          nextItems: this.snapshotsFromPayload(sanitizedData.priceListItems),
          previousBasePrice: 0,
          nextBasePrice: Number(saved.basePrice) || 0,
          source: 'variant_create',
          userId: TenantContext.getUserId(),
        });
        await this.variantRepository.save(saved);
      }

      await this.syncMediaLinks(saved.id, multimediaAssetIds);
      const enriched = await this.findOne(saved.id);

      return { success: true, variant: enriched };
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Error creating variant',
      };
    }
  }

  async update(id: string, data: any) {
    const sanitizedData = { ...data };
    const multimediaAssetIds = Array.isArray(sanitizedData.multimediaAssetIds)
      ? [...sanitizedData.multimediaAssetIds]
      : undefined;
    delete sanitizedData.multimediaAssetIds;
    delete (sanitizedData as any).pmpHistory;
    delete (sanitizedData as any).salePriceHistory;

    const v =
      typeof (this.variantRepository as any).findById === 'function'
        ? await (this.variantRepository as any).findById(id)
        : null;
    if (!v) throw new NotFoundException('Product variant not found');

    this.assertUniquePriceListIdsInPayload(sanitizedData.priceListItems);

    let normalizedAttrValues: Record<string, string> | null | undefined;
    if (Object.prototype.hasOwnProperty.call(sanitizedData, 'attributeValues')) {
      normalizedAttrValues =
        await this.attributesService.validateAndNormalizeAttributeValues(
          sanitizedData.attributeValues,
        );
      delete sanitizedData.attributeValues;
    }

    if (Object.prototype.hasOwnProperty.call(sanitizedData, 'pmp')) {
      throw new BadRequestException(
        'El PMP no se edita en catálogo; se actualiza al registrar compras.',
      );
    }
    delete (sanitizedData as { pmp?: unknown }).pmp;

    Object.assign(v, sanitizedData);
    if (normalizedAttrValues !== undefined) {
      await this.assertUniqueAttributeValuesAmongSiblings(
        (v as any).productId || null,
        normalizedAttrValues,
        id,
      );
      (v as any).attributeValues = normalizedAttrValues;
    }

    const companyId = String((v as any).companyId ?? '').trim();
    if (!companyId) {
      throw new BadRequestException('Variante sin company_id; no se puede validar unidades.');
    }
    // `unitId` en API = unidad de venta legacy. `Object.assign` actualiza `unitId` pero no pisa `saleUnitId`
    // si el body solo envía `unitId` → hay que resolver la venta desde el payload primero.
    const saleId = String(
      (sanitizedData.saleUnitId != null && String(sanitizedData.saleUnitId).trim()
        ? String(sanitizedData.saleUnitId).trim()
        : null) ??
        (sanitizedData.unitId != null && String(sanitizedData.unitId).trim()
          ? String(sanitizedData.unitId).trim()
          : null) ??
        (v as any).saleUnitId ??
        (v as any).unitId ??
        '',
    ).trim();
    if (!saleId) {
      throw new BadRequestException('La variante debe tener unitId o saleUnitId.');
    }
    const stockId = String(
      (sanitizedData.stockBaseUnitId != null && String(sanitizedData.stockBaseUnitId).trim()
        ? String(sanitizedData.stockBaseUnitId).trim()
        : null) ?? (v as any).stockBaseUnitId ?? saleId,
    ).trim();
    const purchaseId = String(
      (sanitizedData.purchaseUnitId != null && String(sanitizedData.purchaseUnitId).trim()
        ? String(sanitizedData.purchaseUnitId).trim()
        : null) ?? (v as any).purchaseUnitId ?? saleId,
    ).trim();
    (v as any).saleUnitId = saleId;
    (v as any).stockBaseUnitId = stockId;
    (v as any).purchaseUnitId = purchaseId;
    (v as any).unitId = saleId;
    const bridgesForValidate = {
      stockBaseQtyPerCountSaleUnit: this.parseCountBridgeInput((v as any).stockBaseQtyPerCountSaleUnit),
      stockBaseQtyPerCountPurchaseUnit: this.parseCountBridgeInput(
        (v as any).stockBaseQtyPerCountPurchaseUnit,
      ),
    };
    await this.conversion.validateVariantUomTripletAsync(
      stockId,
      saleId,
      purchaseId,
      companyId,
      bridgesForValidate,
    );
    const unitRows = await this.variantOrm.manager.getRepository(Unit).find({
      where: { companyId, deletedAt: IsNull() },
    });
    const byIdForNorm = new Map(unitRows.map((u) => [u.id, u]));
    const persistedBridges = this.conversion.normalizePersistedCountBridges(
      stockId,
      saleId,
      purchaseId,
      byIdForNorm,
      bridgesForValidate,
    );
    (v as any).stockBaseQtyPerCountSaleUnit = persistedBridges.stockBaseQtyPerCountSaleUnit;
    (v as any).stockBaseQtyPerCountPurchaseUnit = persistedBridges.stockBaseQtyPerCountPurchaseUnit;

    const existingPriceItems = await this.priceListItemRepository.findByVariantId(id);
    const payloadPriceRows = this.mapPriceRowsFromPayload(sanitizedData.priceListItems);
    const fiscalPriceRows =
      payloadPriceRows.length > 0
        ? payloadPriceRows
        : this.mapPriceRowsFromEntities(existingPriceItems);
    const updateFiscal = await this.buildFiscalProfileForSave(companyId, {
      taxCategory: Object.prototype.hasOwnProperty.call(sanitizedData, 'taxCategory')
        ? sanitizedData.taxCategory
        : (v as any).taxCategory,
      requiresDte: Object.prototype.hasOwnProperty.call(sanitizedData, 'requiresDte')
        ? sanitizedData.requiresDte
        : (v as any).requiresDte,
      taxIds: Object.prototype.hasOwnProperty.call(sanitizedData, 'taxIds')
        ? sanitizedData.taxIds
        : (v as any).taxIds,
      priceListItems: fiscalPriceRows.length ? fiscalPriceRows : undefined,
    });
    (v as any).taxCategory = updateFiscal.taxCategory;
    (v as any).requiresDte = updateFiscal.requiresDte;
    (v as any).taxIds = updateFiscal.taxIds;
    if (updateFiscal.priceListItems && sanitizedData.priceListItems?.length) {
      sanitizedData.priceListItems = this.mergeFiscalPriceRowsIntoPayload(
        sanitizedData.priceListItems,
        updateFiscal.priceListItems,
      );
    }

    // `findById` carga ManyToOne de unidades; si solo actualizamos las columnas FK, las relaciones
    // en memoria siguen con el id anterior y TypeORM puede volver a escribir esos ids al guardar.
    delete (v as any).unit;
    delete (v as any).stockBaseUnit;
    delete (v as any).saleUnit;
    delete (v as any).purchaseUnit;

    if (
      sanitizedData.priceListItems &&
      Array.isArray(sanitizedData.priceListItems) &&
      sanitizedData.priceListItems.length > 0
    ) {
      const previousItems = await this.priceListItemRepository.findByVariantId(id);
      const previousBase = Number((v as any).basePrice) || 0;
      const nextBase =
        sanitizedData.basePrice != null && Number.isFinite(Number(sanitizedData.basePrice))
          ? Number(sanitizedData.basePrice)
          : previousBase;
      (v as any).salePriceHistory = recordSalePriceHistory({
        existing: (v as any).salePriceHistory,
        previousItems: this.snapshotsFromPriceListItems(previousItems),
        nextItems: this.snapshotsFromPayload(sanitizedData.priceListItems),
        previousBasePrice: previousBase,
        nextBasePrice: nextBase,
        source: 'catalog_edit',
        userId: TenantContext.getUserId(),
      });
    }

    const fiscalProfileChanged =
      Object.prototype.hasOwnProperty.call(sanitizedData, 'taxCategory') ||
      Object.prototype.hasOwnProperty.call(sanitizedData, 'requiresDte') ||
      Object.prototype.hasOwnProperty.call(sanitizedData, 'taxIds');

    const saved = await this.variantRepository.save(v);

    if (fiscalProfileChanged && saved.productId) {
      await this.variantOrm.manager
        .getRepository(Product)
        .update({ id: saved.productId }, { updatedAt: new Date() });
    }

    if (
      sanitizedData.priceListItems &&
      Array.isArray(sanitizedData.priceListItems) &&
      sanitizedData.priceListItems.length > 0
    ) {
      await this.priceListItemRepository.deleteByVariantId(saved.id);
      const priceListItems = sanitizedData.priceListItems.map(
        (item: any) =>
          ({
            priceListId: item.priceListId,
            productId: saved.productId || null,
            productVariantId: saved.id,
            netPrice: item.netPrice ?? 0,
            grossPrice: item.grossPrice ?? 0,
            taxIds: item.taxIds ?? null,
          }) as any,
      );
      await Promise.all(
        priceListItems.map((it: any) => this.priceListItemRepository.save(it)),
      );
    } else if (
      isSpecialVariantTaxCategory(updateFiscal.taxCategory) &&
      existingPriceItems.length > 0
    ) {
      await this.syncPriceListItemsForSpecialCategory(saved.id, existingPriceItems);
    } else if (
      Object.prototype.hasOwnProperty.call(sanitizedData, 'taxIds') &&
      !(
        sanitizedData.priceListItems &&
        Array.isArray(sanitizedData.priceListItems) &&
        sanitizedData.priceListItems.length > 0
      ) &&
      existingPriceItems.length > 0
    ) {
      await this.syncPriceListItemsTaxIds(
        saved.id,
        existingPriceItems,
        updateFiscal.taxIds ?? [],
        companyId,
      );
    }

    await this.syncMediaLinks(saved.id, multimediaAssetIds);

    if (Object.prototype.hasOwnProperty.call(sanitizedData, 'visibleInEShop')) {
      await this.eshopVisibilitySync.afterVariantEshopVisibilityChanged(
        saved.productId,
      );
    }

    const enriched = await this.findOne(saved.id);

    return { success: true, variant: enriched };
  }

  /**
   * Búsqueda paginada de variantes para recepciones / órdenes de compra (nombre, SKU, código, categoría).
   */
  async searchForPurchasing(dto: SearchPurchasingVariantsDto) {
    const page = Math.max(1, dto.page ?? 1);
    const rawSize = dto.pageSize ?? 10;
    const pageSize = Math.min(50, Math.max(1, rawSize));
    const q = dto.q?.trim();

    const qb = this.variantOrm
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('v.unit', 'unit')
      .leftJoinAndSelect('v.purchaseUnit', 'purchaseUnit')
      .leftJoinAndSelect('v.stockBaseUnit', 'stockBaseUnit')
      .where('v.deletedAt IS NULL')
      .andWhere('product.deletedAt IS NULL');

    if (q) {
      /**
       * Mismo criterio que el grid de productos (`get-all-products.handler`):
       * pliegue en TS + `lower(translate(col))` (Postgres) o `REPLACE` (MySQL) para tildes comunes.
       */
      const likeParam = purchasingSearchLikePattern(foldPurchasingSearchText(q));
      const dbType = this.variantOrm.manager.connection.options.type as string;
      if (dbType === 'postgres') {
        const ff = PG_PURCHASING_SEARCH_TRANSLATE_FROM;
        const ft = PG_PURCHASING_SEARCH_TRANSLATE_TO;
        qb.andWhere(
          `(lower(translate(product.name, :ff, :ft)) LIKE :q
            OR (product.brand IS NOT NULL AND lower(translate(product.brand, :ff, :ft)) LIKE :q)
            OR lower(translate(v.sku, :ff, :ft)) LIKE :q
            OR (v.barcode IS NOT NULL AND lower(translate(v.barcode, :ff, :ft)) LIKE :q)
            OR (category.name IS NOT NULL AND lower(translate(category.name, :ff, :ft)) LIKE :q))`,
          { q: likeParam, ff, ft },
        );
      } else {
        const pName = mysqlFoldLowerColumnExpr('product.name');
        const pBrand = mysqlFoldLowerColumnExpr('product.brand');
        const pSku = mysqlFoldLowerColumnExpr('v.sku');
        const pBarcode = mysqlFoldLowerColumnExpr('v.barcode');
        const pCat = mysqlFoldLowerColumnExpr('category.name');
        qb.andWhere(
          `(${pName} LIKE :q
            OR (product.brand IS NOT NULL AND ${pBrand} LIKE :q)
            OR ${pSku} LIKE :q
            OR (v.barcode IS NOT NULL AND ${pBarcode} LIKE :q)
            OR (category.name IS NOT NULL AND ${pCat} LIKE :q))`,
          { q: likeParam },
        );
      }
    }

    qb.orderBy('product.name', 'ASC').addOrderBy('v.sku', 'ASC');
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [variants, total] = await qb.getManyAndCount();

    const variantIds = variants.map((x) => x.id).filter(Boolean);
    const levelsByVariant = new Map<string, StockLevel[]>();
    if (variantIds.length > 0) {
      const allLevels = await this.stockLevelOrm.find({
        where: { productVariantId: In(variantIds) },
        relations: ['storage', 'storage.branch'],
      });
      for (const sl of allLevels) {
        const vid = String(sl.productVariantId || '');
        if (!vid) continue;
        const arr = levelsByVariant.get(vid) ?? [];
        arr.push(sl);
        levelsByVariant.set(vid, arr);
      }
    }

    const companyId = variants[0]?.companyId;
    const unitsById =
      companyId != null ? await this.conversion.unitsMapForCompany(companyId) : null;

    const items = await Promise.all(
      variants.map(async (v) => {
        const pmp = pmpForApi(v.pmp);
        const stockQtyPerPurchaseUnit =
          unitsById != null
            ? this.conversion.purchaseQtyToStockBaseFactor(v, unitsById)
            : 1;
        const suggestedPurchaseUnitCost =
          companyId && pmp != null
            ? await this.conversion.purchaseUnitCostFromPmpForVariant(v, pmp, companyId)
            : null;
        const purchaseUnitLabel =
          (v as any).purchaseUnit?.symbol ||
          (v as any).purchaseUnit?.name ||
          v.unit?.symbol ||
          v.unit?.name ||
          null;
        const stockBaseUnitLabel =
          (v as any).stockBaseUnit?.symbol ||
          (v as any).stockBaseUnit?.name ||
          null;
        const levels = levelsByVariant.get(v.id) ?? [];
        const { storageStocks, hasStockAlert } = this.purchasingStockBreakdownForVariant(
          v,
          levels,
        );
        return {
          id: v.id,
          productId: v.productId ?? '',
          productName: v.product?.name ?? '',
          categoryName: v.product?.category?.name ?? null,
          sku: v.sku,
          barcode: v.barcode ?? null,
          pmp,
          suggestedPurchaseUnitCost,
          purchaseUnitLabel,
          stockBaseUnitLabel,
          stockQtyPerPurchaseUnit,
          attributeValues:
            v.attributeValues &&
            typeof v.attributeValues === 'object' &&
            !Array.isArray(v.attributeValues)
              ? (v.attributeValues as Record<string, string>)
              : {},
          unitLabel: purchaseUnitLabel,
          defaultTaxIds: Array.isArray(v.taxIds) ? v.taxIds.map((x) => String(x)) : [],
          storageStocks,
          hasStockAlert,
        };
      }),
    );

    return { items, page, pageSize, total };
  }

  /**
   * PMP histórico (JSON en variante) y últimas compras confirmadas (transacciones PURCHASE).
   */
  async getPurchaseInsights(variantId: string, limitRaw?: number) {
    const limit = Math.min(50, Math.max(1, limitRaw ?? 15));

    const variant = await this.variantOrm.findOne({
      where: { id: variantId, deletedAt: IsNull() },
      relations: ['product', 'stockBaseUnit', 'purchaseUnit'],
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    const historyRaw = (variant as ProductVariant).pmpHistory;
    const history: PmpHistoryEntry[] = Array.isArray(historyRaw) ? historyRaw : [];
    const currentPmp = pmpForApi((variant as ProductVariant).pmp);
    const pmpSeries = this.buildPmpSeriesFromHistory(history, currentPmp);

    const lineRepo = this.variantOrm.manager.getRepository(TransactionLine);
    const rows = await lineRepo
      .createQueryBuilder('line')
      .innerJoinAndSelect('line.transaction', 'tx')
      .leftJoinAndSelect('tx.supplier', 'supplier')
      .leftJoinAndSelect('supplier.person', 'supplierPerson')
      .leftJoinAndSelect('tx.storageEntry', 'storageEntry')
      .where('line.productVariantId = :variantId', { variantId })
      .andWhere('line.companyId = :companyId', { companyId: variant.companyId })
      .andWhere('tx.transactionType = :purchaseType', {
        purchaseType: TransactionType.PURCHASE,
      })
      .andWhere('tx.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: PURCHASE_INSIGHTS_EXCLUDED_STATUSES,
      })
      .orderBy('tx.createdAt', 'DESC')
      .addOrderBy('line.lineNumber', 'ASC')
      .take(limit)
      .getMany();

    const stockBaseUnitLabel =
      (variant as any).stockBaseUnit?.symbol ||
      (variant as any).stockBaseUnit?.name ||
      null;
    const purchaseUnitLabel =
      (variant as any).purchaseUnit?.symbol ||
      (variant as any).purchaseUnit?.name ||
      null;

    const unitsById = await this.conversion.unitsMapForCompany(variant.companyId);

    const recentPurchases = rows.map((line) => {
      const tx = line.transaction as Transaction | undefined;
      const createdAt =
        tx?.createdAt instanceof Date
          ? tx.createdAt.toISOString()
          : tx?.createdAt
            ? String(tx.createdAt)
            : null;

      let quantityInStockBase: number;
      const storedBase = line.quantityInBase;
      if (storedBase != null && Number.isFinite(Number(storedBase))) {
        quantityInStockBase = Number(storedBase);
      } else {
        const defaultUnit =
          (variant.purchaseUnitId ?? variant.unitId ?? '').trim();
        const lineUnit = (line.unitId ?? defaultUnit).trim();
        try {
          quantityInStockBase = this.conversion.toVariantStockBaseSync(
            variant as ProductVariant,
            Number(line.quantity) || 0,
            lineUnit,
            unitsById,
            'purchase',
          ).quantityInBase;
        } catch {
          quantityInStockBase = Number(line.quantity) || 0;
        }
      }

      return {
        transactionId: tx?.id ?? null,
        documentNumber: tx?.documentNumber ?? null,
        date: createdAt,
        quantity: Number(line.quantity) || 0,
        quantityInStockBase,
        unitLabel: line.unitOfMeasure?.trim() || purchaseUnitLabel,
        supplierName: supplierDisplayName(tx?.supplier as Supplier | undefined),
        destinationName:
          (tx as { storageEntry?: { name?: string } })?.storageEntry?.name?.trim() ||
          null,
        unitCost: line.unitCost != null ? Number(line.unitCost) : null,
      };
    });

    const av =
      variant.attributeValues &&
      typeof variant.attributeValues === 'object' &&
      !Array.isArray(variant.attributeValues)
        ? (variant.attributeValues as Record<string, string>)
        : {};

    return {
      variant: {
        id: variant.id,
        productName: variant.product?.name ?? '',
        sku: variant.sku,
        attributeValues: av,
        pmp: currentPmp,
        stockBaseUnitLabel,
        purchaseUnitLabel,
      },
      pmpSeries,
      recentPurchases,
    };
  }

  /**
   * Historial de precios de venta (JSON en variante).
   */
  async getSalePriceHistory(
    variantId: string,
    opts: { priceListId?: string; limit?: number },
  ) {
    const variant = await this.variantOrm.findOne({
      where: { id: variantId, deletedAt: IsNull() },
      relations: ['product'],
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    const raw = (variant as ProductVariant).salePriceHistory;
    const history: SalePriceHistoryEntry[] = Array.isArray(raw) ? raw : [];
    let items = filterSalePriceHistory(history, {
      priceListId: opts.priceListId,
      limit: opts.limit ?? 100,
    });

    const missingNameIds = [
      ...new Set(
        items
          .filter((e) => e.priceListId && !e.priceListName?.trim())
          .map((e) => e.priceListId as string),
      ),
    ];
    if (missingNameIds.length > 0) {
      const lists = await this.variantOrm.manager.getRepository(PriceList).find({
        where: { id: In(missingNameIds) },
        select: { id: true, name: true },
      });
      const nameById = new Map(lists.map((pl) => [pl.id, pl.name?.trim() || '']));
      items = items.map((e) => {
        if (e.priceListId && !e.priceListName?.trim()) {
          const name = nameById.get(e.priceListId);
          if (name) {
            return { ...e, priceListName: name };
          }
        }
        return e;
      });
    }

    const userIds = [
      ...new Set(
        items.map((e) => e.userId?.trim()).filter((id): id is string => !!id),
      ),
    ];
    if (userIds.length > 0) {
      const users = await this.variantOrm.manager.getRepository(User).find({
        where: { id: In(userIds) },
        relations: ['person'],
      });
      const displayById = new Map(
        users.map((u) => [u.id, this.formatSalePriceHistoryUserName(u)]),
      );
      items = items.map((e) => {
        const uid = e.userId?.trim();
        if (!uid) {
          return e;
        }
        const userDisplayName = displayById.get(uid);
        return userDisplayName ? { ...e, userDisplayName } : e;
      });
    }

    const av =
      variant.attributeValues &&
      typeof variant.attributeValues === 'object' &&
      !Array.isArray(variant.attributeValues)
        ? (variant.attributeValues as Record<string, string>)
        : {};

    return {
      variant: {
        id: variant.id,
        productName: variant.product?.name ?? '',
        sku: variant.sku,
        attributeValues: av,
        basePrice: Number(variant.basePrice) || 0,
      },
      items,
    };
  }

  private buildPmpSeriesFromHistory(
    history: PmpHistoryEntry[],
    currentPmp: number | null,
  ): { at: string; pmp: number }[] {
    const sorted = [...history].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
    const points: { at: string; pmp: number }[] = [];
    for (const entry of sorted) {
      const pmp = Number(entry.newPmp);
      const at = typeof entry.at === 'string' ? entry.at.trim() : '';
      if (!at || !Number.isFinite(pmp)) continue;
      const last = points[points.length - 1];
      if (last && last.at === at && last.pmp === pmp) continue;
      points.push({ at, pmp });
    }
    if (currentPmp != null) {
      const last = points[points.length - 1];
      if (!last || last.pmp !== currentPmp) {
        points.push({ at: new Date().toISOString(), pmp: currentPmp });
      }
    }
    return points;
  }

  async remove(id: string) {
    const v =
      typeof (this.variantRepository as any).findById === 'function'
        ? await (this.variantRepository as any).findById(id)
        : null;
    if (!v) return { success: false, error: 'Not found' };

    if (typeof (this.variantRepository as any).softRemove === 'function') {
      await (this.variantRepository as any).softRemove(v);
    } else {
      v.deletedAt = new Date();
      await this.variantRepository.save(v);
    }

    await this.eshopVisibilitySync.afterVariantEshopVisibilityChanged(
      (v as ProductVariant).productId,
    );

    return { success: true };
  }

  private snapshotsFromPriceListItems(items: PriceListItem[] | null | undefined): SalePriceSnapshot[] {
    const out: SalePriceSnapshot[] = [];
    if (!Array.isArray(items)) {
      return out;
    }
    for (const item of items) {
      const priceListId = item.priceListId != null ? String(item.priceListId).trim() : '';
      if (!priceListId) {
        continue;
      }
      const pl = (item as { priceList?: { name?: string } }).priceList;
      out.push({
        priceListId,
        priceListName: pl?.name?.trim() || undefined,
        netPrice: Number(item.netPrice),
        grossPrice: Number(item.grossPrice),
        taxIds: Array.isArray(item.taxIds) ? [...item.taxIds] : null,
      });
    }
    return out;
  }

  private snapshotsFromPayload(payload: unknown[]): SalePriceSnapshot[] {
    if (!Array.isArray(payload)) {
      return [];
    }
    const out: SalePriceSnapshot[] = [];
    for (const raw of payload) {
      if (!raw || typeof raw !== 'object') {
        continue;
      }
      const o = raw as Record<string, unknown>;
      const priceListId = o.priceListId != null ? String(o.priceListId).trim() : '';
      if (!priceListId) {
        continue;
      }
      out.push({
        priceListId,
        priceListName:
          o.priceListName != null ? String(o.priceListName).trim() || undefined : undefined,
        netPrice: Number(o.netPrice),
        grossPrice: Number(o.grossPrice),
        taxIds: Array.isArray(o.taxIds) ? o.taxIds.map(String) : null,
      });
    }
    return out;
  }

  private async syncMediaLinks(
    _variantId: string,
    multimediaAssetIds?: string[],
  ): Promise<void> {
    if (!Array.isArray(multimediaAssetIds) || multimediaAssetIds.length === 0) {
      return;
    }
    // Galería general de variantes eliminada; multimedia solo por atributo en admin.
  }

  private async resolveDefaultIvaTaxIds(companyId: string): Promise<string[]> {
    const taxes = await this.taxRepo.find({
      where: { companyId, isActive: true, taxType: TaxType.IVA },
    });
    return resolveDefaultIvaTaxIdsFromCatalog(taxes);
  }

  private mapPriceRowsFromPayload(items: unknown): VariantPriceFiscalRow[] {
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map((item: any) => ({
      netPrice: Math.round(Number(item?.netPrice) || 0),
      grossPrice: Math.round(Number(item?.grossPrice) || 0),
      taxIds: Array.isArray(item?.taxIds) ? item.taxIds.map(String) : null,
    }));
  }

  private mapPriceRowsFromEntities(items: PriceListItem[]): VariantPriceFiscalRow[] {
    return items.map((item) => ({
      netPrice: Math.round(Number(item.netPrice) || 0),
      grossPrice: Math.round(Number(item.grossPrice) || 0),
      taxIds: Array.isArray(item.taxIds) ? item.taxIds.map(String) : null,
    }));
  }

  private mergeFiscalPriceRowsIntoPayload(
    payloadItems: any[],
    fiscalRows: VariantPriceFiscalRow[],
  ): any[] {
    return payloadItems.map((item, index) => {
      const fiscal = fiscalRows[index];
      if (!fiscal) {
        return item;
      }
      return {
        ...item,
        grossPrice: fiscal.grossPrice,
        taxIds: fiscal.taxIds ?? null,
      };
    });
  }

  private async buildFiscalProfileForSave(
    companyId: string,
    input: {
      taxCategory?: unknown;
      requiresDte?: unknown;
      taxIds?: string[] | null;
      priceListItems?: VariantPriceFiscalRow[];
    },
  ) {
    const defaultIvaTaxIds = await this.resolveDefaultIvaTaxIds(companyId);
    return applyVariantFiscalProfile(input, defaultIvaTaxIds);
  }

  private async syncPriceListItemsForSpecialCategory(
    variantId: string,
    items: PriceListItem[],
  ): Promise<void> {
    for (const item of items) {
      const net = Math.round(Number(item.netPrice) || 0);
      await this.priceListItemRepository.save({
        ...item,
        productVariantId: variantId,
        grossPrice: net,
        taxIds: null,
      } as any);
    }
  }

  private async syncPriceListItemsTaxIds(
    variantId: string,
    items: PriceListItem[],
    taxIds: string[] | null,
    companyId: string,
  ): Promise<void> {
    const catalogTaxes = await this.taxRepo.find({
      where: { companyId, isActive: true },
    });
    const saleCatalog = catalogTaxes
      .filter((t) => t.taxType !== TaxType.RETENTION)
      .map((t) => ({
        id: t.id,
        taxType: String(t.taxType),
        rate: Number(t.rate) || 0,
        isActive: t.isActive,
      }));
    const fiscalRows = this.mapPriceRowsFromEntities(items);
    const nextRows = applyTaxIdsToPriceRows(fiscalRows, taxIds, saleCatalog);
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const next = nextRows[i];
      if (!item || !next) {
        continue;
      }
      await this.priceListItemRepository.save({
        ...item,
        productVariantId: variantId,
        grossPrice: next.grossPrice,
        taxIds: next.taxIds ?? null,
      } as any);
    }
  }

  private formatSalePriceHistoryUserName(user: User): string {
    const person = user.person;
    if (person) {
      const businessName = person.businessName?.trim();
      if (businessName) {
        return businessName;
      }
      const parts = [person.firstName, person.lastName].filter(
        (v): v is string => typeof v === 'string' && v.trim().length > 0,
      );
      if (parts.length > 0) {
        return parts.join(' ').trim();
      }
    }
    return user.userName?.trim() || 'Usuario';
  }
}
