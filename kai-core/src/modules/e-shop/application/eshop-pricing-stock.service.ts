import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { CompaniesService } from '@modules/companies/application/companies.service';
import type { EShopStoreContext } from './eshop-store.context';
import { resolveEShopOperationalContext } from './helpers/eshop-operational-context.util';
import {
  evaluateStockPolicy,
  type StockCheckLine,
} from './helpers/eshop-stock-policy.util';
import type { EShopStockPolicy } from '@modules/companies/domain/company-eshop-flat.types';
import type {
  CartIssue,
  PricedCartLine,
} from './types/eshop-cart.types';

export type ResolvePricedLinesInput = {
  lines: Array<{ productVariantId: string; quantity: number }>;
  previousPrices?: Map<string, number>;
};

export type ResolvePricedLinesResult = {
  pricedLines: PricedCartLine[];
  stockLines: StockCheckLine[];
  issues: CartIssue[];
  variantsById: Map<string, ProductVariant>;
};

@Injectable()
export class EShopPricingStockService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(StockLevel)
    private readonly stockRepo: Repository<StockLevel>,
    @InjectRepository(PriceListItem)
    private readonly priceListItemRepo: Repository<PriceListItem>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly companiesService: CompaniesService,
  ) {}

  async loadStockMap(
    companyId: string,
    variantIds: string[],
    storageId: string | null,
  ): Promise<Map<string, number>> {
    if (!storageId || variantIds.length === 0) {
      return new Map();
    }
    const rows = await this.stockRepo
      .createQueryBuilder('sl')
      .select('sl.productVariantId', 'variantId')
      .addSelect('COALESCE(sl.availableStock, 0)', 'qty')
      .where('sl.companyId = :companyId', { companyId })
      .andWhere('sl.storageId = :storageId', { storageId })
      .andWhere('sl.productVariantId IN (:...variantIds)', { variantIds })
      .getRawMany<{ variantId: string; qty: string }>();
    return new Map(rows.map((r) => [r.variantId, Math.max(0, Number(r.qty) || 0)]));
  }

  async loadPriceMap(
    companyId: string,
    variantIds: string[],
    priceListId: string | null,
  ): Promise<Map<string, number>> {
    if (!priceListId || variantIds.length === 0) {
      return new Map();
    }
    const items = await this.priceListItemRepo.find({
      where: {
        companyId,
        priceListId,
        productVariantId: In(variantIds),
        deletedAt: IsNull(),
      },
    });
    return new Map(
      items.map((i) => [i.productVariantId!, Number(i.grossPrice) || 0]),
    );
  }

  async loadActiveVariants(
    companyId: string,
    variantIds: string[],
  ): Promise<Map<string, ProductVariant>> {
    if (variantIds.length === 0) {
      return new Map();
    }
    const variants = await this.variantRepo.find({
      where: {
        id: In(variantIds),
        companyId,
        isActive: true,
        visibleInEShop: true,
      },
      relations: ['product'],
    });
    return new Map(variants.map((v) => [v.id, v]));
  }

  async resolveOperationalContext(store: EShopStoreContext) {
    return resolveEShopOperationalContext(
      store.companyId,
      store.eShop,
      this.branchRepo,
    );
  }

  async resolvePricedLines(
    store: EShopStoreContext,
    input: ResolvePricedLinesInput,
  ): Promise<ResolvePricedLinesResult> {
    const settings = await this.companiesService.getEShopFlatSettings(store.companyId);
    const stockPolicy = settings.eShopStockPolicy;
    const operational = await this.resolveOperationalContext(store);
    const variantIds = [...new Set(input.lines.map((l) => l.productVariantId))];
    const variantsById = await this.loadActiveVariants(store.companyId, variantIds);
    const stockMap = await this.loadStockMap(
      store.companyId,
      variantIds,
      operational.storageId,
    );
    const priceMap = await this.loadPriceMap(
      store.companyId,
      variantIds,
      operational.priceListId,
    );

    const issues: CartIssue[] = [];
    const pricedLines: PricedCartLine[] = [];
    const stockLines: StockCheckLine[] = [];

    for (const line of input.lines) {
      const variant = variantsById.get(line.productVariantId);
      if (!variant || variant.product?.visibleInEShop !== true) {
        issues.push({
          code: 'VARIANT_UNAVAILABLE',
          productVariantId: line.productVariantId,
          message: 'Este producto ya no está disponible en la tienda',
        });
        continue;
      }

      const trackInventory = variant.trackInventory === true;
      const availableQty = trackInventory
        ? (stockMap.get(variant.id) ?? 0)
        : Number.MAX_SAFE_INTEGER;
      let qty = Math.max(1, Math.floor(line.quantity));

      const unitPrice =
        priceMap.get(variant.id) ?? (Number(variant.basePrice) || 0);
      const previousPrice = input.previousPrices?.get(variant.id);
      if (
        previousPrice != null &&
        Math.round(previousPrice) !== Math.round(unitPrice)
      ) {
        issues.push({
          code: 'PRICE_CHANGED',
          productVariantId: variant.id,
          message: 'El precio de este producto cambió',
          previousUnitPrice: previousPrice,
          currentUnitPrice: unitPrice,
        });
      }

      if (trackInventory && availableQty <= 0) {
        issues.push({
          code: 'OUT_OF_STOCK',
          productVariantId: variant.id,
          message: 'Este producto está sin stock',
          requestedQty: qty,
          availableQty: 0,
        });
        if (stockPolicy === 'BLOCK_OUT_OF_STOCK') {
          continue;
        }
      } else if (trackInventory && qty > availableQty) {
        issues.push({
          code: 'INSUFFICIENT_STOCK',
          productVariantId: variant.id,
          message: `Solo hay ${availableQty} unidad(es) disponible(s)`,
          requestedQty: qty,
          availableQty,
        });
        if (stockPolicy === 'BLOCK_OUT_OF_STOCK') {
          continue;
        }
        if (stockPolicy === 'ALLOW_BACKORDER' || stockPolicy === 'IGNORE_STOCK') {
          const adjustedQty = Math.max(1, availableQty);
          if (adjustedQty !== qty) {
            issues.push({
              code: 'QTY_ADJUSTED',
              productVariantId: variant.id,
              message: `Ajustamos la cantidad a ${adjustedQty}`,
              requestedQty: qty,
              availableQty: adjustedQty,
            });
            qty = adjustedQty;
          }
        }
      }

      stockLines.push({
        variantId: variant.id,
        requestedQty: qty,
        availableQty: trackInventory ? availableQty : Number.MAX_SAFE_INTEGER,
        trackInventory,
      });

      pricedLines.push({
        productId: variant.productId!,
        productVariantId: variant.id,
        quantity: qty,
        unitPrice,
        productName: variant.product?.name ?? variant.sku,
        variantName: variant.product?.name ?? variant.sku,
        sku: variant.sku?.trim() || null,
        imageUrl: null,
        availableQty: trackInventory ? availableQty : Number.MAX_SAFE_INTEGER,
        trackInventory,
      });
    }

    evaluateStockPolicy(stockPolicy, stockLines);

    return { pricedLines, stockLines, issues, variantsById };
  }

  async getStockPolicy(companyId: string): Promise<EShopStockPolicy> {
    const settings = await this.companiesService.getEShopFlatSettings(companyId);
    return settings.eShopStockPolicy;
  }
}
