import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, In, SelectQueryBuilder } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  PRICE_LIST_ITEMS_REPOSITORY,
  PriceListItemsRepositoryPort,
} from '@modules/price-list-items/application/ports/price-list-items.repository.port';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { SearchPosProductsDto } from './dto/search-pos-products.dto';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { AttributeOrmEntity } from '@modules/attributes/infrastructure/orm-mappers/attribute.orm-entity';
import { posDisplayStockInSaleUnits } from '@modules/product-variants/application/variant-count-bridge.util';
import { normalizeVariantTaxCategory } from '@modules/product-variants/domain/variant-tax-category';
import { applyVariantFiscalProfile } from '@modules/product-variants/application/helpers/variant-fiscal-profile';

export type PosProductSearchResult = {
  productId: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  variantId: string;
  sku: string | null;
  barcode: string | null;
  unitSymbol: string | null;
  unitId: string | null;
  unitAllowDecimals: boolean;
  unitPrice: number;
  unitTaxRate: number;
  unitTaxAmount: number;
  unitPriceWithTax: number;
  trackInventory: boolean;
  availableStock: number | null;
  availableStockBase: number | null;
  attributes: Array<{
    attributeId: string;
    attributeName: string;
    attributeValue: string;
  }>;
  saleUnitSymbol?: string | null;
  stockBaseUnitSymbol?: string | null;
  stockBaseQtyPerCountSaleUnit?: number | null;
  metadata: Record<string, unknown> | null;
  taxCategory: string;
  requiresDte: boolean;
  taxIds: string[];
};

@Injectable()
export class ProductsPosService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(PRICE_LIST_ITEMS_REPOSITORY)
    private readonly priceListItemRepository: PriceListItemsRepositoryPort,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly multimediaService: MultimediaServiceAdapter,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Búsqueda optimizada de productos para POS
   * - Filtra por lista de precios específica
   * - Retorna solo productos con precio en esa lista
   * - Incluye stock disponible por bodega (branch)
   */
  async searchForPos(dto: SearchPosProductsDto) {
    const {
      query,
      priceListId,
      branchId,
      page = 1,
      pageSize = 20,
      pointOfSaleId,
      productTypes,
    } = dto;

    if (!priceListId) {
      throw new NotFoundException(
        'priceListId es requerido para búsqueda en POS',
      );
    }

    const scope = await this.resolvePosStockScope({ pointOfSaleId, branchId });

    const qb = this.variantRepository.createQueryBuilder('v');
    this.applyPosPriceListVariantJoins(qb, priceListId);

    // Filtrar por búsqueda de texto (nombre, SKU, barcode)
    if (query && query.trim()) {
      // Búsqueda case-insensitive y accent-insensitive (sin depender de extensiones DB).
      // Nota: cubre diacríticos latinos comunes usados en ES/CL. Para collation/unaccent
      // completa podría usarse una extensión (p. ej. Postgres `unaccent`), pero esto
      // entrega el comportamiento esperado en la UI del POS.
      const accentFrom = 'ÁÀÂÄÃáàâäãÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖÕóòôöõÚÙÛÜúùûüÑñ';
      const accentTo = 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNn';
      qb.andWhere(
        `(
          LOWER(TRANSLATE(product.name, '${accentFrom}', '${accentTo}')) LIKE LOWER(TRANSLATE(:q, '${accentFrom}', '${accentTo}'))
          OR LOWER(TRANSLATE(COALESCE(v.sku, ''), '${accentFrom}', '${accentTo}')) LIKE LOWER(TRANSLATE(:q, '${accentFrom}', '${accentTo}'))
          OR LOWER(TRANSLATE(COALESCE(v.barcode, ''), '${accentFrom}', '${accentTo}')) LIKE LOWER(TRANSLATE(:q, '${accentFrom}', '${accentTo}'))
        )`,
        { q: `%${query.trim()}%` },
      );
    }

    const allowedTypes = (productTypes ?? '')
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter((t): t is ProductType =>
        Object.values(ProductType).includes(t as ProductType),
      );
    if (allowedTypes.length > 0) {
      qb.andWhere('product.productType IN (:...productTypes)', {
        productTypes: allowedTypes,
      });
    }

    // Paginación
    const skip = (page - 1) * pageSize;
    qb.skip(skip).take(pageSize);

    // Ejecutar query
    const [variants, total] = await qb.getManyAndCount();

    if (!variants || variants.length === 0) {
      return {
        query: query || '',
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        products: [],
      };
    }

    const products = await this.mapVariantsToPosSearchResults(variants, scope);

    return {
      query: query || '',
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page < Math.ceil(total / pageSize),
        hasPreviousPage: page > 1,
      },
      products,
    };
  }

  /**
   * Snapshot paginado del catálogo POS para uso offline (cursor por variantId).
   */
  async buildCatalogSnapshotForPos(args: {
    pointOfSaleId: string;
    priceListId: string;
    cursor?: string;
    limit?: number;
  }) {
    const priceListId = args.priceListId?.trim();
    if (!priceListId) {
      throw new NotFoundException('priceListId es requerido para snapshot de catálogo');
    }
    const limit = Math.min(500, Math.max(1, args.limit ?? 500));
    const scope = await this.resolvePosStockScope({
      pointOfSaleId: args.pointOfSaleId,
    });

    const baseQb = this.variantRepository.createQueryBuilder('v');
    this.applyPosPriceListVariantJoins(baseQb, priceListId);

    const totalCount = await baseQb.getCount();

    const qb = baseQb.clone();
    const cursor = args.cursor?.trim();
    if (cursor) {
      qb.andWhere('v.id > :cursor', { cursor });
    }

    qb.orderBy('v.id', 'ASC').take(limit);

    const variants = await qb.getMany();
    const items = await this.mapVariantsToPosSearchResults(variants, scope, {
      skipMultimedia: true,
    });
    const nextCursor =
      variants.length === limit ? variants[variants.length - 1]?.id : undefined;

    return {
      items,
      snapshotAt: new Date().toISOString(),
      totalCount,
      nextCursor,
    };
  }

  /**
   * Delta de catálogo POS desde un timestamp ISO (productos actualizados o dados de baja).
   */
  async buildCatalogDeltaForPos(args: {
    pointOfSaleId: string;
    priceListId: string;
    since: string;
  }) {
    const priceListId = args.priceListId?.trim();
    if (!priceListId) {
      throw new NotFoundException('priceListId es requerido para delta de catálogo');
    }
    const sinceDate = new Date(args.since);
    if (Number.isNaN(sinceDate.getTime())) {
      throw new BadRequestException('since inválido (ISO 8601 requerido)');
    }

    const scope = await this.resolvePosStockScope({
      pointOfSaleId: args.pointOfSaleId,
    });

    const activeQb = this.variantRepository.createQueryBuilder('v');
    this.applyPosPriceListVariantJoins(activeQb, priceListId);
    activeQb.andWhere(
      '(product.updatedAt >= :since OR v.updatedAt >= :since OR priceListItem.updatedAt >= :since)',
      { since: sinceDate },
    );
    activeQb.orderBy('v.id', 'ASC').take(500);

    const activeVariants = await activeQb.getMany();
    const items = await this.mapVariantsToPosSearchResults(activeVariants, scope, {
      skipMultimedia: true,
    });

    const tombstoneRows = await this.variantRepository
      .createQueryBuilder('v')
      .innerJoin('v.product', 'product')
      .innerJoin(
        'v.priceListItems',
        'priceListItem',
        'priceListItem.priceListId = :priceListId',
        { priceListId },
      )
      .where(
        '(v.deletedAt IS NOT NULL AND v.deletedAt >= :since) OR (v.isActive = false AND v.updatedAt >= :since) OR (product.deletedAt IS NOT NULL AND product.deletedAt >= :since) OR (product.isActive = false AND product.updatedAt >= :since)',
        { since: sinceDate },
      )
      .select(['v.id'])
      .take(500)
      .getMany();

    return {
      items,
      tombstones: tombstoneRows.map((v) => v.id),
      snapshotAt: new Date().toISOString(),
    };
  }

  /**
   * Datos POS actuales (stock, atributos, imagen) para variantes conocidas.
   * No exige lista de precios; los precios en la respuesta pueden ser 0 (el cliente
   * debe conservar precios congelados, p. ej. desde una cotización).
   */
  async lookupVariantsForPos(args: {
    variantIds: string[];
    pointOfSaleId?: string;
    branchId?: string;
    /** Solo variantes con ítem en esta lista (precio vigente en POS). */
    priceListId?: string;
  }): Promise<PosProductSearchResult[]> {
    const ids = [...new Set(args.variantIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      return [];
    }

    const scope = await this.resolvePosStockScope({
      pointOfSaleId: args.pointOfSaleId,
      branchId: args.branchId,
    });

    const priceListId = args.priceListId?.trim();
    let activeVariants: ProductVariant[];

    if (priceListId) {
      const qb = this.variantRepository.createQueryBuilder('v');
      this.applyPosPriceListVariantJoins(qb, priceListId);
      activeVariants = await qb.andWhere('v.id IN (:...ids)', { ids }).getMany();
    } else {
      const variants = await this.variantRepository.find({
        where: {
          id: In(ids),
          deletedAt: IsNull(),
          isActive: true,
        },
        relations: ['product', 'saleUnit', 'stockBaseUnit'],
      });
      activeVariants = variants.filter(
        (v) =>
          v.product &&
          v.product.deletedAt == null &&
          v.product.isActive === true,
      );
    }

    return this.mapVariantsToPosSearchResults(activeVariants, scope);
  }

  private async resolvePosStockScope(args: {
    pointOfSaleId?: string;
    branchId?: string;
  }): Promise<{
    resolvedBranchId?: string;
    storageIdsForStock: string[] | null;
  }> {
    let resolvedBranchId = args.branchId;
    let storageIdsForStock: string[] | null = null;
    if (args.pointOfSaleId) {
      const pos = await this.dataSource.getRepository(PointOfSale).findOne({
        where: { id: args.pointOfSaleId, deletedAt: IsNull() },
      });
      if (!pos) {
        throw new NotFoundException(`Punto de venta ${args.pointOfSaleId} no encontrado`);
      }
      if (args.branchId && pos.branchId && pos.branchId !== args.branchId) {
        throw new BadRequestException(
          'branchId no coincide con la sucursal del punto de venta indicado',
        );
      }
      resolvedBranchId = pos.branchId ?? args.branchId;
      if (pos.storageId) {
        storageIdsForStock = [pos.storageId];
      }
    }
    return { resolvedBranchId, storageIdsForStock };
  }

  /**
   * Hidrata product, priceListItems (lista activa), unidades en getMany().
   * innerJoin + select parcial no poblaba relaciones y dejaba nombre/precio en 0 offline.
   */
  private applyPosPriceListVariantJoins(
    qb: SelectQueryBuilder<ProductVariant>,
    priceListId: string,
  ): SelectQueryBuilder<ProductVariant> {
    return qb
      .innerJoinAndSelect('v.product', 'product')
      .innerJoinAndSelect(
        'v.priceListItems',
        'priceListItem',
        'priceListItem.priceListId = :priceListId AND priceListItem.deletedAt IS NULL',
        { priceListId },
      )
      .leftJoinAndSelect('v.unit', 'unit')
      .leftJoinAndSelect('v.saleUnit', 'saleUnit')
      .leftJoinAndSelect('v.stockBaseUnit', 'stockBaseUnit')
      .where('v.deletedAt IS NULL')
      .andWhere('v.isActive = :isActive', { isActive: true })
      .andWhere('product.deletedAt IS NULL')
      .andWhere('product.isActive = :isActive', { isActive: true });
  }

  private async mapVariantsToPosSearchResults(
    variants: ProductVariant[],
    scope: {
      resolvedBranchId?: string;
      storageIdsForStock: string[] | null;
    },
    options?: { skipMultimedia?: boolean },
  ): Promise<PosProductSearchResult[]> {
    if (!variants.length) {
      return [];
    }

    const variantIds = variants.map((v) => v.id);
    const productIds = Array.from(
      new Set(variants.map((variant) => variant.productId).filter(Boolean)),
    ) as string[];
    const attributeIds = Array.from(
      new Set(
        variants.flatMap((variant) =>
          variant?.attributeValues && typeof variant.attributeValues === 'object'
            ? Object.keys(variant.attributeValues as Record<string, string>)
            : [],
        ),
      ),
    ).filter(Boolean) as string[];
    let stockByVariant: Record<string, number> = {};
    const multimediaByProduct: Record<string, string | null> = {};
    const attributeNameById: Record<string, string> = {};

    if (scope.storageIdsForStock && scope.storageIdsForStock.length === 1) {
      const stockLevels = await this.stockLevelRepository
        .createQueryBuilder('sl')
        .where('sl.productVariantId IN (:...variantIds)', { variantIds })
        .andWhere('sl.storageId = :storageId', { storageId: scope.storageIdsForStock[0] })
        .select('sl.productVariantId', 'variantId')
        .addSelect('COALESCE(SUM(sl.availableStock), 0)', 'stock')
        .groupBy('sl.productVariantId')
        .getRawMany();

      stockByVariant = stockLevels.reduce(
        (acc, row) => {
          acc[row.variantId] = Number(row.stock || 0);
          return acc;
        },
        {} as Record<string, number>,
      );
    } else if (scope.resolvedBranchId) {
      const stockLevels = await this.stockLevelRepository
        .createQueryBuilder('sl')
        .innerJoin('sl.storage', 'storage')
        .where('sl.productVariantId IN (:...variantIds)', { variantIds })
        .andWhere('storage.branchId = :branchId', { branchId: scope.resolvedBranchId })
        .andWhere('storage.deletedAt IS NULL')
        .select('sl.productVariantId', 'variantId')
        .addSelect('COALESCE(SUM(sl.availableStock), 0)', 'stock')
        .groupBy('sl.productVariantId')
        .getRawMany();

      stockByVariant = stockLevels.reduce(
        (acc, row) => {
          acc[row.variantId] = Number(row.stock || 0);
          return acc;
        },
        {} as Record<string, number>,
      );
    }

    await Promise.all(
      options?.skipMultimedia
        ? []
        : productIds.map(async (productId) => {
            const assets = await this.multimediaService.listByEntity('product', productId);
            multimediaByProduct[productId] = assets[0]?.publicUrl ?? null;
          }),
    );

    if (attributeIds.length > 0) {
      try {
        const rows = await this.dataSource
          .getRepository(AttributeOrmEntity)
          .createQueryBuilder('a')
          .where('a.id IN (:...ids)', { ids: attributeIds })
          .andWhere('a.deletedAt IS NULL')
          .select(['a.id', 'a.name'])
          .getMany();
        for (const a of rows) {
          attributeNameById[a.id] = a.name;
        }
      } catch {
        // ignore, fallback to empty names below
      }
    }

    const companyId = variants.find((v) => v.product?.companyId)?.product?.companyId;
    let unitsById: Map<string, Unit> | undefined;
    if (companyId) {
      const unitRows = await this.unitRepository.find({
        where: { companyId, deletedAt: IsNull() },
      });
      unitsById = new Map(unitRows.map((u) => [u.id, u]));
    }

    return variants
      .filter((variant) => variant.productId)
      .map((variant) => {
        const priceItem = variant.priceListItems?.[0];
        const netPrice = priceItem ? Number(priceItem.netPrice) : 0;
        let grossPrice = priceItem ? Number(priceItem.grossPrice) : 0;

        if (netPrice > 0 && grossPrice > 0) {
          const ratio = grossPrice / netPrice;
          if (ratio > 5) {
            console.warn(
              `⚠️ [ProductsPosSvc] Price correction needed for variant ${variant.sku}: ` +
                `netPrice=${netPrice}, grossPrice=${grossPrice} (ratio=${ratio.toFixed(2)}). ` +
                `Assuming grossPrice was incorrectly multiplied.`,
            );
            if (ratio >= 19) {
              grossPrice = grossPrice / 20;
            } else if (ratio >= 10) {
              grossPrice = grossPrice / 10;
            }
            console.log(
              `✅ [ProductsPosSvc] Corrected grossPrice to ${grossPrice}`,
            );
          }
        }

        const taxAmount = grossPrice - netPrice;
        const calculatedTaxRate = netPrice > 0 ? (taxAmount / netPrice) * 100 : 0;
        const taxRate = Math.max(0, Math.min(100, calculatedTaxRate));

        const attributes: Array<{
          attributeId: string;
          attributeName: string;
          attributeValue: string;
        }> = [];
        if (variant.attributeValues && typeof variant.attributeValues === 'object') {
          const dict = variant.attributeValues as Record<string, unknown>;
          for (const [attributeId, rawValue] of Object.entries(dict)) {
            const attributeValue = rawValue != null ? String(rawValue).trim() : '';
            if (!attributeId || !attributeValue) continue;
            attributes.push({
              attributeId,
              attributeName: attributeNameById[attributeId] ?? '',
              attributeValue,
            });
          }
        }

        const track = variant.trackInventory ?? false;
        const stockBaseQty = stockByVariant[variant.id] ?? 0;
        const availableStockBase = track ? stockBaseQty : null;
        const availableStock = track
          ? posDisplayStockInSaleUnits({
              physicalStockInBase: stockBaseQty,
              stockBaseUnitId: variant.stockBaseUnitId,
              saleUnitId: variant.saleUnitId,
              stockBaseDimension: (variant as any).stockBaseUnit?.dimension ?? null,
              saleDimension: (variant as any).saleUnit?.dimension ?? null,
              stockBaseQtyPerCountSaleUnit: (variant as any).stockBaseQtyPerCountSaleUnit,
              unitsById,
            })
          : null;

        const saleUnitSymbol = (variant as any).saleUnit?.symbol ?? null;
        const stockBaseUnitSymbol = (variant as any).stockBaseUnit?.symbol ?? null;

        return {
          productId: variant.productId!,
          productName: variant.product?.name || 'Producto sin nombre',
          productDescription: variant.product?.description || null,
          productImageUrl: multimediaByProduct[variant.productId!] ?? null,
          variantId: variant.id,
          sku: variant.sku || null,
          barcode: variant.barcode || null,
          unitSymbol: saleUnitSymbol,
          unitId: (variant as any).saleUnitId ?? null,
          unitAllowDecimals: (variant as any).saleUnit?.allowDecimals === true,
          unitPrice: netPrice,
          unitTaxRate: taxRate,
          unitTaxAmount: taxAmount,
          unitPriceWithTax: grossPrice,
          trackInventory: track,
          availableStock,
          availableStockBase,
          attributes,
          saleUnitSymbol,
          stockBaseUnitSymbol,
          stockBaseQtyPerCountSaleUnit:
            (variant as any).stockBaseQtyPerCountSaleUnit ?? null,
          metadata: null,
          taxCategory: normalizeVariantTaxCategory(variant.taxCategory),
          requiresDte: this.resolvePosRequiresDte(variant),
          taxIds: Array.isArray(variant.taxIds)
            ? variant.taxIds.map((id) => String(id)).filter(Boolean)
            : [],
        };
      });
  }

  /**
   * Stock disponible de una variante en la sala de venta del POS (`pointOfSaleId`)
   * o en un `storageId` explícito.
   */
  async getVariantStockForPos(args: {
    variantId: string;
    pointOfSaleId?: string;
    storageId?: string;
  }) {
    const variantId = args.variantId?.trim();
    if (!variantId) {
      throw new BadRequestException('variantId es requerido');
    }
    let storageId = args.storageId?.trim() || undefined;
    let storageName: string | null = null;
    if (!storageId && args.pointOfSaleId?.trim()) {
      const pos = await this.dataSource.getRepository(PointOfSale).findOne({
        where: { id: args.pointOfSaleId.trim(), deletedAt: IsNull() },
        relations: { storage: true },
      });
      if (!pos) {
        throw new NotFoundException('Punto de venta no encontrado');
      }
      storageId = pos.storageId ?? undefined;
      storageName = pos.storage?.name ?? null;
    }
    if (!storageId) {
      throw new BadRequestException(
        'Indique storageId o un pointOfSaleId con sala de venta (storage) configurada',
      );
    }
    if (!storageName) {
      const st = await this.dataSource.getRepository(Storage).findOne({
        where: { id: storageId, deletedAt: IsNull() },
        select: ['id', 'name'],
      });
      storageName = st?.name ?? null;
    }

    const variant = await this.variantRepository.findOne({
      where: { id: variantId, deletedAt: IsNull() },
      relations: ['product', 'unit', 'saleUnit', 'stockBaseUnit'],
    });
    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    const sl = await this.stockLevelRepository.findOne({
      where: { productVariantId: variantId, storageId },
    });
    const stockBaseQty = Number(sl?.availableStock ?? 0);
    const track = variant.trackInventory ?? false;
    const availableStockBase = track ? stockBaseQty : null;
    let unitsById: Map<string, Unit> | undefined;
    const companyId = variant.product?.companyId;
    if (companyId) {
      const unitRows = await this.unitRepository.find({
        where: { companyId, deletedAt: IsNull() },
      });
      unitsById = new Map(unitRows.map((u) => [u.id, u]));
    }

    const availableStock = track
      ? posDisplayStockInSaleUnits({
          physicalStockInBase: stockBaseQty,
          stockBaseUnitId: variant.stockBaseUnitId,
          saleUnitId: variant.saleUnitId,
          stockBaseDimension: (variant as any).stockBaseUnit?.dimension ?? null,
          saleDimension: (variant as any).saleUnit?.dimension ?? null,
          stockBaseQtyPerCountSaleUnit: (variant as any).stockBaseQtyPerCountSaleUnit,
          unitsById,
        })
      : null;

    return {
      success: true as const,
      variantId: variant.id,
      sku: variant.sku ?? null,
      storageId,
      storageName,
      trackInventory: track,
      availableStock,
      availableStockBase,
    };
  }

  /**
   * Stock disponible por almacén (todos los almacenes activos de la empresa).
   * `pointOfSaleId` opcional: marca el almacén de la sala de venta del POS.
   */
  async getVariantStockBreakdownForPos(args: {
    variantId: string;
    pointOfSaleId?: string;
  }) {
    const variantId = args.variantId?.trim();
    if (!variantId) {
      throw new BadRequestException('variantId es requerido');
    }

    let posStorageId: string | null = null;
    if (args.pointOfSaleId?.trim()) {
      const pos = await this.dataSource.getRepository(PointOfSale).findOne({
        where: { id: args.pointOfSaleId.trim(), deletedAt: IsNull() },
        select: ['id', 'storageId'],
      });
      if (!pos) {
        throw new NotFoundException('Punto de venta no encontrado');
      }
      posStorageId = pos.storageId ?? null;
    }

    const variant = await this.variantRepository.findOne({
      where: { id: variantId, deletedAt: IsNull() },
      relations: ['product', 'unit', 'saleUnit', 'stockBaseUnit'],
    });
    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    const track = variant.trackInventory ?? false;
    let unitsById: Map<string, Unit> | undefined;
    const companyId = variant.product?.companyId;
    if (companyId) {
      const unitRows = await this.unitRepository.find({
        where: { companyId, deletedAt: IsNull() },
      });
      unitsById = new Map(unitRows.map((u) => [u.id, u]));
    }

    const levels = await this.stockLevelRepository.find({
      where: { productVariantId: variantId },
      relations: ['storage', 'storage.branch'],
    });
    const levelsByStorageId = new Map(
      levels.map((sl) => [sl.storageId, sl] as const),
    );

    const storageRepo = this.dataSource.getRepository(Storage);
    let storages: Storage[] = [];
    if (companyId) {
      storages = await storageRepo.find({
        where: { companyId, deletedAt: IsNull(), isActive: true },
        relations: ['branch'],
        order: { name: 'ASC' },
      });
    }

    if (storages.length === 0) {
      const seen = new Set<string>();
      for (const sl of levels) {
        if (!sl.storage || seen.has(sl.storageId)) {
          continue;
        }
        seen.add(sl.storageId);
        storages.push(sl.storage);
      }
      storages.sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' }),
      );
    }

    const breakdown = storages.map((storage) => {
      const sl = levelsByStorageId.get(storage.id) ?? null;
      const physicalBaseQty = Number(sl?.physicalStock ?? 0);
      const reservedBaseQty = Number(sl?.committedStock ?? 0);
      const availableBaseQty = Number(sl?.availableStock ?? 0);

      const physicalStockBase = track ? physicalBaseQty : null;
      const reservedStockBase = track ? reservedBaseQty : null;
      const availableStockBase = track ? availableBaseQty : null;

      const physicalStock = track
        ? posDisplayStockInSaleUnits({
            physicalStockInBase: physicalBaseQty,
            stockBaseUnitId: variant.stockBaseUnitId,
            saleUnitId: variant.saleUnitId,
            stockBaseDimension: (variant as any).stockBaseUnit?.dimension ?? null,
            saleDimension: (variant as any).saleUnit?.dimension ?? null,
            stockBaseQtyPerCountSaleUnit: (variant as any).stockBaseQtyPerCountSaleUnit,
            unitsById,
          })
        : null;

      const reservedStock = track
        ? posDisplayStockInSaleUnits({
            physicalStockInBase: reservedBaseQty,
            stockBaseUnitId: variant.stockBaseUnitId,
            saleUnitId: variant.saleUnitId,
            stockBaseDimension: (variant as any).stockBaseUnit?.dimension ?? null,
            saleDimension: (variant as any).saleUnit?.dimension ?? null,
            stockBaseQtyPerCountSaleUnit: (variant as any).stockBaseQtyPerCountSaleUnit,
            unitsById,
          })
        : null;

      const availableStock = track
        ? posDisplayStockInSaleUnits({
            physicalStockInBase: availableBaseQty,
            stockBaseUnitId: variant.stockBaseUnitId,
            saleUnitId: variant.saleUnitId,
            stockBaseDimension: (variant as any).stockBaseUnit?.dimension ?? null,
            saleDimension: (variant as any).saleUnit?.dimension ?? null,
            stockBaseQtyPerCountSaleUnit: (variant as any).stockBaseQtyPerCountSaleUnit,
            unitsById,
          })
        : null;

      return {
        storageId: storage.id,
        storageName: storage.name ?? '',
        branchName: storage.branch?.name ?? null,
        physicalStock,
        physicalStockBase,
        reservedStock,
        reservedStockBase,
        availableStock,
        availableStockBase,
        isPosStorage: posStorageId != null && storage.id === posStorageId,
      };
    });

    breakdown.sort((a, b) => {
      if (a.isPosStorage && !b.isPosStorage) {
        return -1;
      }
      if (!a.isPosStorage && b.isPosStorage) {
        return 1;
      }
      return a.storageName.localeCompare(b.storageName, 'es', {
        sensitivity: 'base',
      });
    });

    return {
      success: true as const,
      variantId: variant.id,
      sku: variant.sku ?? null,
      trackInventory: track,
      posStorageId,
      breakdown,
    };
  }

  private resolvePosRequiresDte(variant: ProductVariant): boolean {
    const profile = applyVariantFiscalProfile(
      {
        taxCategory: variant.taxCategory,
        requiresDte: variant.requiresDte,
        taxIds: variant.taxIds,
      },
      [],
    );
    return profile.requiresDte;
  }
}
