import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject } from '@nestjs/common';
import { Repository, DataSource, In } from 'typeorm';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  PRICE_LIST_ITEMS_REPOSITORY,
  PriceListItemsRepositoryPort,
} from '@modules/price-list-items/application/ports/price-list-items.repository.port';
import { SearchProductsDto } from './dto/search-products.dto';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { attachProductVariantMultimedia } from './helpers/attach-product-variant-multimedia';
import { applyProductCatalogTextSearch } from './product-catalog-search.util';
import { ProductEshopVisibilitySyncService } from './services/product-eshop-visibility-sync.service';
import { CatalogRealtimePublisher } from '@modules/catalog-realtime/catalog-realtime.publisher';

type MovementDirection = 'IN' | 'OUT';

const MOVEMENT_DIRECTION: Record<TransactionType, MovementDirection | null> = {
  [TransactionType.SALE]: 'OUT',
  [TransactionType.PURCHASE]: 'IN',
  [TransactionType.PURCHASE_ORDER]: null,
  [TransactionType.SALE_RETURN]: 'IN',
  [TransactionType.CUSTOMER_CREDIT_NOTE]: null,
  [TransactionType.CUSTOMER_CREDIT_NOTE_PAYOUT]: null,
  [TransactionType.PURCHASE_RETURN]: 'OUT',
  [TransactionType.SUPPLIER_INVOICE]: null,
  [TransactionType.SUPPLIER_RECEIPT]: null,
  [TransactionType.SUPPLIER_HONORARIUM_RECEIPT]: null,
  [TransactionType.SUPPLIER_GUIDE]: null,
  [TransactionType.SUPPLIER_CREDIT_NOTE]: null,
  [TransactionType.CUSTOMER_ORDER]: null,
  [TransactionType.SERVICE_ORDER]: null,
  [TransactionType.PRODUCTION_BATCH]: null,
  [TransactionType.QUOTATION]: null,
  [TransactionType.BACKORDER]: null,
  [TransactionType.TRANSFER_OUT]: 'OUT',
  [TransactionType.TRANSFER_IN]: 'IN',
  [TransactionType.ADJUSTMENT_IN]: 'IN',
  [TransactionType.ADJUSTMENT_OUT]: 'OUT',
  [TransactionType.PAYMENT_IN]: null,
  [TransactionType.PAYROLL_PAYMENT]: null,
  [TransactionType.PAYMENT_EXECUTION]: null,
  [TransactionType.CASH_DEPOSIT]: null,
  [TransactionType.OPERATING_EXPENSE]: null,
  [TransactionType.CASH_SESSION_OPENING]: null,
  [TransactionType.CASH_SESSION_WITHDRAWAL]: null,
  [TransactionType.CASH_SESSION_DEPOSIT]: null,
  [TransactionType.PAYROLL]: null,
  [TransactionType.CAPITAL_CONTRIBUTION]: null,
  [TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER]: null,
  [TransactionType.CASH_WITHDRAWAL_TO_PETTY_CASH]: null,
  [TransactionType.SUPPLIER_PAYMENT]: null,
  [TransactionType.BANK_TO_CASH_TRANSFER]: null,
  [TransactionType.EXPENSE_PAYMENT]: null,
  [TransactionType.CASH_SESSION_CLOSING]: null,
  [TransactionType.CASH_SESSION_TO_HUB_TRANSFER]: null,
  [TransactionType.VOID_ADJUSTMENT]: null,
  [TransactionType.INVENTORY_COUNT]: null,
  [TransactionType.INVENTORY_RESERVATION]: null,
  [TransactionType.INVENTORY_BLOCK]: null,
  [TransactionType.INVENTORY_UNBLOCK]: null,
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
    @Inject(PRICE_LIST_ITEMS_REPOSITORY)
    private readonly priceListItemRepository: PriceListItemsRepositoryPort,
    private readonly dataSource: DataSource,
    private readonly multimediaService: MultimediaServiceAdapter,
    private readonly eshopVisibilitySync: ProductEshopVisibilitySyncService,
    @Optional() private readonly catalogRealtime?: CatalogRealtimePublisher,
  ) {
    this.logger = new Logger(ProductsService.name);
  }

  private readonly logger: Logger;

  private resolveDirection(type: TransactionType): MovementDirection | null {
    return MOVEMENT_DIRECTION[type] ?? null;
  }

  async search(searchDto: SearchProductsDto) {
    // Basic search implementation: return matching products with their variants
    const qb = this.productRepository
      .createQueryBuilder('p')
      .where('p.deletedAt IS NULL');

    applyProductCatalogTextSearch(qb, searchDto.query, { product: 'p' });

    const products = await qb.getMany();

    if (!products || products.length === 0) return [];

    // Load variants for the found products and attach price list items
    const productIds = products.map((p) => p.id);
    const variants = await this.variantRepository
      .createQueryBuilder('v')
      .leftJoinAndSelect(
        'v.priceListItems',
        'priceListItem',
        'priceListItem.deletedAt IS NULL',
      )
      .leftJoinAndSelect(
        'priceListItem.priceList',
        'priceList',
        'priceList.deletedAt IS NULL AND priceList.isActive = true',
      )
      .leftJoinAndSelect('v.unit', 'unit')
      .where('v.deletedAt IS NULL')
      .andWhere('v.productId IN (:...productIds)', { productIds })
      .getMany();

    const variantsByProduct: Record<string, any[]> = {};
    for (const v of variants) {
      if (!variantsByProduct[v.productId || ''])
        variantsByProduct[v.productId || ''] = [];
      const priceListItems = (v.priceListItems || []).map((item: any) => ({
        priceListId: item.priceListId,
        priceListName: item.priceList?.name || 'Lista sin nombre',
        currency: item.priceList?.currency || 'CLP',
        netPrice: Number(item.netPrice),
        grossPrice: Number(item.grossPrice),
        taxIds: item.taxIds || [],
      }));
      variantsByProduct[v.productId || ''].push({
        ...v,
        unitOfMeasure: v.unit?.name || 'Unidad',
        priceListItems,
      });
    }

    const variantIds = variants.map((v) => v.id);
    await attachProductVariantMultimedia(
      this.multimediaService,
      variantsByProduct as Record<string, Array<Record<string, unknown>>>,
      variantIds,
    );

    const enriched = products.map((p) => ({
      ...p,
      variants: variantsByProduct[p.id] ?? [],
      variantCount: (variantsByProduct[p.id] ?? []).length,
    }));

    return enriched;
  }

  async create(data: any) {
    const product = new Product();
    product.name = String(data.name || '').trim();
    product.description = data.description
      ? String(data.description)
      : undefined;
    product.brand = data.brand ? String(data.brand) : undefined;
    product.categoryId = data.categoryId || undefined;
    product.productType = data.productType ?? product.productType;
    product.taxIds = Array.isArray(data.taxIds) ? data.taxIds : undefined;
    product.isActive =
      typeof data.isActive === 'boolean' ? data.isActive : true;
    product.visibleInEShop = data.visibleInEShop === true;
    product.baseUnitId = data.baseUnitId || undefined;
    try {
      const saved = await this.productRepository.save(product as any);
      return { success: true, product: saved };
    } catch (err) {
      console.error('Error creating product', err);
      return {
        success: false,
        error: err?.message || 'Error creating product',
      };
    }
  }

  async getStocks(productId: string) {
    const raw = await this.dataSource
      .getRepository(StockLevel)
      .createQueryBuilder('sl')
      .innerJoin('sl.variant', 'variant')
      .innerJoin('sl.storage', 'storage')
      .select('storage.id', 'warehouseId')
      .addSelect('storage.name', 'warehouseName')
      .addSelect('COALESCE(SUM(sl.availableStock), 0)', 'stock')
      .where('variant.productId = :productId', { productId })
      .andWhere('storage.deletedAt IS NULL')
      .groupBy('storage.id')
      .addGroupBy('storage.name')
      .getRawMany();

    return {
      success: true,
      stocks: raw.map((r) => ({
        warehouseId: r.warehouseId,
        warehouseName: r.warehouseName ?? null,
        stock: Number(r.stock ?? 0),
      })),
    };
  }

  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined)
      updateData.name = String(data.name || '').trim();
    if (data.description !== undefined)
      updateData.description = data.description
        ? String(data.description)
        : null;
    if (data.brand !== undefined)
      updateData.brand = data.brand ? String(data.brand) : null;
    if (data.categoryId !== undefined)
      updateData.categoryId = data.categoryId || null;
    if (data.productType !== undefined)
      updateData.productType = data.productType;
    if (data.taxIds !== undefined)
      updateData.taxIds = Array.isArray(data.taxIds) ? data.taxIds : undefined;
    if (data.isActive !== undefined)
      updateData.isActive =
        typeof data.isActive === 'boolean' ? data.isActive : true;
    if (data.visibleInEShop !== undefined)
      updateData.visibleInEShop = data.visibleInEShop === true;
    if (data.baseUnitId !== undefined)
      updateData.baseUnitId = data.baseUnitId || null;

    await this.productRepository.update(id, updateData);
    if (data.visibleInEShop === true) {
      await this.eshopVisibilitySync.afterProductEshopVisibilitySet(id, true);
    }
    const updated = await this.productRepository.findOne({ where: { id } });
    if (!updated)
      return { success: false, message: 'Product not found', statusCode: 404 };
    try {
      if (updated.companyId) {
        this.catalogRealtime?.emitInvalidated({
          companyId: updated.companyId,
          kinds: ['PRODUCT'],
          productIds: [updated.id],
          at: new Date().toISOString(),
        });
      }
    } catch (err) {
      this.logger.warn(
        `Catalog PRODUCT invalidate failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return { success: true, product: updated };
  }

  async remove(id: string) {
    const result = await this.productRepository.softDelete(id as any);
    if (!result.affected) {
      return { success: false, message: 'Product not found', statusCode: 404 };
    }
    return { success: true };
  }
}
