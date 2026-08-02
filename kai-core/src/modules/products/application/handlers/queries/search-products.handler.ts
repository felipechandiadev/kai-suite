import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SearchProductsQuery } from '../../queries/search-products.query';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { attachProductVariantMultimedia } from '../../helpers/attach-product-variant-multimedia';
import { attachProductMultimedia } from '../../helpers/attach-product-multimedia';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { applyProductCatalogTextSearch, isProductIdSearchQuery } from '../../product-catalog-search.util';
import { TenantContext } from '@common/tenant/tenant.context';

export interface SearchProductsResult {
  id: string;
  name: string;
  productType?: string;
  brand?: string | null;
  brandId?: string | null;
  description?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  isActive?: boolean;
  visibleInEShop?: boolean;
  variants: Array<{
    id: string;
    productId?: string;
    sku?: string;
    unitOfMeasure?: string;
    priceListItems: Array<{
      priceListId: string;
      priceListName: string;
      currency: string;
      netPrice: number;
      grossPrice: number;
      taxIds?: string[];
    }>;
    primaryImageUrl?: string | null;
    mediaAssets?: Array<{
      id: string;
      publicUrl: string;
      mimeType: string;
      kind: string;
    }>;
  }>;
  variantCount: number;
  primaryImageUrl?: string | null;
  mediaAssets?: Array<{
    id: string;
    publicUrl: string;
    mimeType: string;
    kind: string;
    isPrimary?: boolean;
  }>;
}

@QueryHandler(SearchProductsQuery)
export class SearchProductsQueryHandler implements IQueryHandler<
  SearchProductsQuery,
  SearchProductsResult[]
> {
  private readonly logger = new Logger(SearchProductsQueryHandler.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly multimediaService: MultimediaServiceAdapter,
  ) {}

  async execute(query: SearchProductsQuery): Promise<SearchProductsResult[]> {
    this.logger.debug(
      `Searching products with query="${query.query}", page=${query.page}, pageSize=${query.pageSize}`,
    );

    // Basic search implementation: return matching products with their variants
    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.catalogBrand', 'catalogBrand')
      .where('p.deletedAt IS NULL');

    const companyId = TenantContext.getCompanyId();
    if (companyId) {
      qb.andWhere('p.companyId = :companyId', { companyId });
    }

    if (isProductIdSearchQuery(query.query)) {
      qb.andWhere('p.id = :productIdExact', {
        productIdExact: query.query!.trim(),
      });
    } else {
      applyProductCatalogTextSearch(qb, query.query, { product: 'p' });
    }

    const typeFilter = query.productType?.trim().toUpperCase() ?? '';
    if (
      typeFilter &&
      Object.values(ProductType).includes(typeFilter as ProductType)
    ) {
      qb.andWhere('p.productType = :productType', { productType: typeFilter });
    }

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
        maxDiscountPercent:
          item.maxDiscountPercent != null &&
          Number.isFinite(Number(item.maxDiscountPercent))
            ? Number(item.maxDiscountPercent)
            : null,
        minPrice:
          item.minPrice != null && Number.isFinite(Number(item.minPrice))
            ? Math.round(Number(item.minPrice))
            : null,
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
      variantsByProduct,
      variantIds,
    );

    const enriched = products.map((p) => ({
      id: p.id,
      name: p.name,
      productType: p.productType,
      brand: p.catalogBrand?.name ?? p.brand,
      brandId: p.brandId ?? null,
      description: p.description,
      categoryId: p.categoryId ?? null,
      categoryName: p.category?.name ?? null,
      isActive: p.isActive,
      visibleInEShop: p.visibleInEShop === true,
      onMenu: p.onMenu === true,
      variants: variantsByProduct[p.id] ?? [],
      variantCount: (variantsByProduct[p.id] ?? []).length,
    }));

    await attachProductMultimedia(
      this.multimediaService,
      enriched,
      productIds,
    );

    return enriched;
  }
}
