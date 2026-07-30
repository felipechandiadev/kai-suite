import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { SearchPosProductsQuery } from '../../queries/search-pos-products.query';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { posDisplayStockInSaleUnits } from '@modules/product-variants/application/variant-count-bridge.util';

export type PosProductSearchResult = {
  productId: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  variantId: string;
  sku: string | null;
  barcode: string | null;
  unitSymbol: string | null;
  saleUnitSymbol: string | null;
  unitId: string | null;
  stockBaseUnitId: string | null;
  stockBaseUnitSymbol: string | null;
  saleUnitId: string | null;
  unitAllowDecimals: boolean;
  purchaseUnitId: string | null;
  unitPrice: number;
  unitTaxRate: number;
  unitTaxAmount: number;
  unitPriceWithTax: number;
  trackInventory: boolean;
  availableStock: number | null;
  availableStockBase: number | null;
  stockBaseQtyPerCountSaleUnit: number | null;
  attributes: Array<{
    attributeId: string;
    attributeName: string;
    attributeValue: string;
  }>;
  metadata: Record<string, unknown> | null;
};

export interface SearchPosProductsResult {
  query: string;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  products: PosProductSearchResult[];
}

@QueryHandler(SearchPosProductsQuery)
export class SearchPosProductsQueryHandler implements IQueryHandler<
  SearchPosProductsQuery,
  SearchPosProductsResult
> {
  private readonly logger = new Logger(SearchPosProductsQueryHandler.name);

  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly multimediaService: MultimediaServiceAdapter,
  ) {}

  async execute(
    query: SearchPosProductsQuery,
  ): Promise<SearchPosProductsResult> {
    const {
      query: searchQuery,
      priceListId,
      branchId,
      page = 1,
      pageSize = 20,
    } = query;

    this.logger.debug(
      `Searching POS products with query="${searchQuery}", priceListId=${priceListId}, ` +
        `branchId=${branchId}, page=${page}, pageSize=${pageSize}`,
    );

    if (!priceListId) {
      throw new NotFoundException(
        'priceListId es requerido para búsqueda en POS',
      );
    }

    // Construir query base
    const qb = this.variantRepository
      .createQueryBuilder('v')
      .innerJoin('v.product', 'product')
      .innerJoin(
        'v.priceListItems',
        'priceListItem',
        'priceListItem.priceListId = :priceListId AND priceListItem.deletedAt IS NULL',
        { priceListId },
      )
      .leftJoin('v.unit', 'unit')
      .leftJoin('v.saleUnit', 'saleUnit')
      .leftJoin('v.stockBaseUnit', 'stockBaseUnit')
      .leftJoin('v.purchaseUnit', 'purchaseUnit')
      .where('v.deletedAt IS NULL')
      .andWhere('v.isActive = :isActive', { isActive: true })
      .andWhere('product.deletedAt IS NULL')
      .andWhere('product.isActive = :isActive', { isActive: true });

    // Filtrar por búsqueda de texto (nombre, SKU, barcode)
    if (searchQuery && searchQuery.trim()) {
      qb.andWhere(
        '(product.name LIKE :q OR v.sku LIKE :q OR v.barcode LIKE :q)',
        { q: `%${searchQuery.trim()}%` },
      );
    }

    // Seleccionar campos necesarios
    qb.select([
      'v.id',
      'v.productId',
      'v.sku',
      'v.barcode',
      'v.trackInventory',
      'v.stockBaseUnitId',
      'v.saleUnitId',
      'v.purchaseUnitId',
      'v.stockBaseQtyPerCountSaleUnit',
      'v.attributeValues',
      'product.id',
      'product.companyId',
      'product.name',
      'product.description',
      'unit.id',
      'unit.symbol',
      'saleUnit.id',
      'saleUnit.symbol',
      'saleUnit.dimension',
      'saleUnit.allowDecimals',
      'stockBaseUnit.id',
      'stockBaseUnit.symbol',
      'stockBaseUnit.dimension',
      'purchaseUnit.id',
      'priceListItem.id',
      'priceListItem.netPrice',
      'priceListItem.grossPrice',
      'priceListItem.taxIds',
    ]);

    // Paginación
    const skip = (page - 1) * pageSize;
    qb.skip(skip).take(pageSize);

    // Ejecutar query
    const [variants, total] = await qb.getManyAndCount();

    if (!variants || variants.length === 0) {
      return {
        query: searchQuery || '',
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

    // Cargar stock por bodega si se especifica branchId
    const variantIds = variants.map((v) => v.id);
    const productIds = Array.from(
      new Set(variants.map((variant) => variant.productId).filter(Boolean)),
    ) as string[];
    let stockByVariant: Record<string, number> = {};
    const multimediaByProduct: Record<string, string | null> = {};

    if (branchId) {
      const stockLevels = await this.stockLevelRepository
        .createQueryBuilder('sl')
        .innerJoin('sl.storage', 'storage')
        .where('sl.productVariantId IN (:...variantIds)', { variantIds })
        .andWhere('storage.branchId = :branchId', { branchId })
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
      productIds.map(async (productId) => {
        const assets = await this.multimediaService.listByEntity('product', productId);
        multimediaByProduct[productId] = assets[0]?.publicUrl ?? null;
      }),
    );

    const companyId = variants.find((v) => v.product?.companyId)?.product?.companyId;
    let unitsById: Map<string, Unit> | undefined;
    if (companyId) {
      const unitRows = await this.unitRepository.find({
        where: { companyId, deletedAt: IsNull() },
      });
      unitsById = new Map(unitRows.map((u) => [u.id, u]));
    }

    // Mapear resultados al formato esperado por el POS
    const products: PosProductSearchResult[] = variants
      .filter((variant) => variant.productId) // Filtrar variantes sin productId
      .map((variant) => {
        const priceItem = variant.priceListItems?.[0];
        const netPrice = priceItem ? Number(priceItem.netPrice) : 0;
        let grossPrice = priceItem ? Number(priceItem.grossPrice) : 0;

        // HOTFIX: Detect and correct obviously invalid prices
        // If grossPrice is unreasonably higher than netPrice (e.g., 20x), assume it was multiplied by a factor
        if (netPrice > 0 && grossPrice > 0) {
          const ratio = grossPrice / netPrice;
          // If ratio > 5, assume grossPrice was mis-calculated and should not exceed 1.5x netPrice (150% with heavy tax)
          if (ratio > 5) {
            this.logger.warn(
              `⚠️ Price correction needed for variant ${variant.sku}: ` +
                `netPrice=${netPrice}, grossPrice=${grossPrice} (ratio=${ratio.toFixed(2)}). ` +
                `Assuming grossPrice was incorrectly multiplied.`,
            );
            // Divide grossPrice by 10 if it looks like it was multiplied by 10 or more
            if (ratio >= 19) {
              // Likely multiplied by 20
              grossPrice = grossPrice / 20;
            } else if (ratio >= 10) {
              // Likely multiplied by 10
              grossPrice = grossPrice / 10;
            }
            this.logger.debug(`✅ Corrected grossPrice to ${grossPrice}`);
          }
        }

        const taxAmount = grossPrice - netPrice;
        // Calculate and clamp taxRate to valid range (0-100)
        const calculatedTaxRate =
          netPrice > 0 ? (taxAmount / netPrice) * 100 : 0;
        const taxRate = Math.max(0, Math.min(100, calculatedTaxRate));

        // Parsear atributos
        let attributes: Array<{
          attributeId: string;
          attributeName: string;
          attributeValue: string;
        }> = [];
        if (variant.attributeValues) {
          try {
            const parsed =
              typeof variant.attributeValues === 'string'
                ? JSON.parse(variant.attributeValues)
                : variant.attributeValues;
            if (Array.isArray(parsed)) {
              attributes = parsed;
            }
          } catch (e) {
            // Ignorar error de parsing
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

        return {
          productId: variant.productId!,
          productName: variant.product?.name || 'Producto sin nombre',
          productDescription: variant.product?.description || null,
          productImageUrl: multimediaByProduct[variant.productId!] ?? null,
          variantId: variant.id,
          sku: variant.sku || null,
          barcode: variant.barcode || null,
          saleUnitSymbol: (variant as any).saleUnit?.symbol ?? null,
          unitSymbol: (variant as any).saleUnit?.symbol ?? null,
          unitId: (variant as any).saleUnitId ?? null,
          unitAllowDecimals: (variant as any).saleUnit?.allowDecimals === true,
          stockBaseUnitId: (variant as any).stockBaseUnitId ?? null,
          stockBaseUnitSymbol: (variant as any).stockBaseUnit?.symbol ?? null,
          saleUnitId: (variant as any).saleUnitId ?? null,
          purchaseUnitId: (variant as any).purchaseUnitId ?? null,
          unitPrice: netPrice,
          unitTaxRate: taxRate,
          unitTaxAmount: taxAmount,
          unitPriceWithTax: grossPrice,
          trackInventory: track,
          availableStock,
          availableStockBase,
          stockBaseQtyPerCountSaleUnit: (() => {
            const raw = (variant as any).stockBaseQtyPerCountSaleUnit;
            if (raw == null || raw === '') return null;
            const n = Number(raw);
            return Number.isFinite(n) && n > 0 ? n : null;
          })(),
          attributes,
          metadata: null,
        };
      });

    return {
      query: searchQuery || '',
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
}
