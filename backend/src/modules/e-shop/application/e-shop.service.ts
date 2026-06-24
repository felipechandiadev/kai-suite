import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Product } from '@modules/products/domain/product.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import {
  buildAttributeOptions,
  pickDefaultVariantId,
  resolveVariantAttributeLabels,
} from './helpers/eshop-catalog-product.helpers';
import {
  applyEShopCatalogTextSearch,
  applyEShopProductListTextSearch,
} from './helpers/eshop-catalog-text-search.util';
import type { EShopCatalogProductDetail } from './types/eshop-catalog-product.types';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { User } from '@modules/users/domain/user.entity';
import { EShopTestimonial } from '../domain/e-shop-testimonial.entity';
import { EShopHeroSlide, type EShopHeroSlideCtaStyle, type EShopHeroSlideTextAlign } from '../domain/e-shop-hero-slide.entity';
import { ESHOP_TESTIMONIAL_MULTIMEDIA_ENTITY } from '../domain/e-shop-testimonial.constants';
import { ESHOP_HERO_SLIDE_MULTIMEDIA_ENTITY } from '../domain/e-shop-hero-slide.constants';
import { resolveEShopTheme } from '@modules/companies/domain/company-eshop-theme.types';
import { resolveEShopTopBar } from '@modules/companies/domain/company-eshop-topbar.types';
import { resolveEShopFooter } from '@modules/companies/domain/company-eshop-footer.types';
import type { EShopStoreContext } from './eshop-store.context';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { CompaniesService } from '@modules/companies/application/companies.service';
import {
  ESHOP_HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS,
  ESHOP_HERO_SLIDER_AUTOPLAY_MIN_SECONDS,
} from '@modules/companies/domain/company-eshop-flat.types';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { AppConfigService } from '../../../config/config.service';
import { resolveMultimediaPublicUrl } from '@modules/multimedia/application/utils/resolve-multimedia-public-url.util';
import {
  resolvePrimaryMultimediaAsset,
  resolvePrimaryMultimediaPublicUrl,
} from '@modules/multimedia/application/utils/resolve-primary-multimedia.util';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { resolveEShopOperationalContext } from './helpers/eshop-operational-context.util';
import { Category } from '@modules/categories/domain/category.entity';
import { Brand } from '@modules/brands/domain/brand.entity';

export type EShopProductCard = {
  /** ID del producto (catálogo). */
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  inStock: boolean;
  /** Variante por defecto para agregar al carrito (con stock preferido). */
  defaultVariantId: string | null;
};

export type EShopCatalogCategoryOption = {
  id: string;
  name: string;
};

export type EShopCatalogListResult = {
  items: EShopProductCard[];
  total: number;
  totalGeneral: number;
  page: number;
  limit: number;
  categories: EShopCatalogCategoryOption[];
};

export type EShopFeaturedProductAdminItem = {
  id: string;
  name: string;
  brand: string | null;
  categoryName: string | null;
  visibleInEShop: boolean;
  isActive: boolean;
  variantCount: number;
  imageUrl: string | null;
};

@Injectable()
export class EShopService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
    @InjectRepository(StockLevel)
    private readonly stockRepo: Repository<StockLevel>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(EShopTestimonial)
    private readonly testimonialRepo: Repository<EShopTestimonial>,
    @InjectRepository(EShopHeroSlide)
    private readonly heroSlideRepo: Repository<EShopHeroSlide>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PriceListItem)
    private readonly priceListItemRepo: Repository<PriceListItem>,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    private readonly multimediaAdapter: MultimediaServiceAdapter,
    private readonly companiesService: CompaniesService,
    private readonly transactionsService: TransactionsService,
    private readonly config: AppConfigService,
  ) {}

  async getStorefront(store: EShopStoreContext) {
    const companyAssets = await this.multimediaAdapter.listByEntity(
      'company',
      store.companyId,
    );
    const companyLogo = resolvePrimaryMultimediaAsset(companyAssets);
    const companyLogoUrl =
      resolveMultimediaPublicUrl(companyLogo?.publicUrl, this.config) ??
      companyLogo?.publicUrl ??
      null;

    return {
      companyName: store.companyName,
      companyLogoUrl,
      slug: store.slug,
      tagline: store.companyIdentity.tagline ?? null,
      brandManifest: store.companyIdentity.brandManifest ?? null,
      publicContact: store.publicContact,
      eShopEnabled: store.eShop.eShopEnabled,
      eShopFreeShippingThreshold: store.eShop.eShopFreeShippingThreshold,
      eShopCustomerPortalEnabled: store.eShop.eShopCustomerPortalEnabled === true,
      eShopRegistrationRequireRut: store.eShop.eShopRegistrationRequireRut === true,
      eShopFeaturedProductVariantIds: store.eShop.eShopFeaturedProductVariantIds,
      theme: resolveEShopTheme(store.companySettings),
      topBar: resolveEShopTopBar(store.companySettings),
      footer: resolveEShopFooter(store.companySettings),
    };
  }

  async listProducts(
    store: EShopStoreContext,
    opts: { page?: number; limit?: number; search?: string },
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(48, Math.max(1, opts.limit ?? 24));
    const companyId = store.companyId;

    const applyListFilters = (qb: ReturnType<typeof this.productRepo.createQueryBuilder>) => {
      qb.innerJoin(
        ProductVariant,
        'v',
        `v.productId = p.id
          AND v.companyId = :companyId
          AND v.isActive = true
          AND v.visibleInEShop = true
          AND v.deletedAt IS NULL`,
        { companyId },
      )
        .where('p.companyId = :companyId', { companyId })
        .andWhere('p.isActive = true')
        .andWhere('p.visibleInEShop = true')
        .andWhere('p.deletedAt IS NULL');

      if (opts.search?.trim()) {
        applyEShopProductListTextSearch(qb, opts.search, {
          product: 'p',
          variant: 'v',
        });
      }
      return qb;
    };

    const countRow = await applyListFilters(this.productRepo.createQueryBuilder('p'))
      .select('COUNT(DISTINCT p.id)', 'cnt')
      .getRawOne<{ cnt: string }>();
    const total = Number(countRow?.cnt ?? 0);

    const rows = await applyListFilters(this.productRepo.createQueryBuilder('p'))
      .select('p.id', 'id')
      .addSelect('p.name', 'name')
      .groupBy('p.id')
      .addGroupBy('p.name')
      .orderBy('p.name', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string; name: string }>();

    const products = rows.map((row) => ({ id: row.id, name: row.name })) as Product[];
    const cards = await this.toProductCatalogCards(companyId, products);
    return { items: cards, total, page, limit };
  }

  /** Catálogo completo eShop: paginación, filtro por categoría y búsqueda por nombre/marca/categoría. */
  async listCatalog(
    store: EShopStoreContext,
    opts: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      excludeProductIds?: string[];
    },
  ): Promise<EShopCatalogListResult> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(48, Math.max(1, opts.limit ?? 24));
    const companyId = store.companyId;

    const applyVisibleProductJoins = (
      qb: ReturnType<typeof this.productRepo.createQueryBuilder>,
    ) => {
      qb.innerJoin(
        ProductVariant,
        'v',
        `v.productId = p.id
          AND v.companyId = :companyId
          AND v.isActive = true
          AND v.visibleInEShop = true
          AND v.deletedAt IS NULL`,
        { companyId },
      )
        .leftJoin(
          Category,
          'cat',
          'cat.id = p.categoryId AND cat.companyId = :companyId AND cat.deletedAt IS NULL',
          { companyId },
        )
        .leftJoin(
          Brand,
          'brand',
          'brand.id = p.brandId AND brand.companyId = :companyId AND brand.deletedAt IS NULL',
          { companyId },
        )
        .where('p.companyId = :companyId', { companyId })
        .andWhere('p.isActive = true')
        .andWhere('p.visibleInEShop = true')
        .andWhere('p.deletedAt IS NULL');
      return qb;
    };

    const applyCatalogFilters = (
      qb: ReturnType<typeof this.productRepo.createQueryBuilder>,
    ) => {
      applyVisibleProductJoins(qb);

      if (opts.categoryId?.trim()) {
        qb.andWhere('p.categoryId = :categoryId', { categoryId: opts.categoryId.trim() });
      }

      if (opts.search?.trim()) {
        applyEShopCatalogTextSearch(qb, opts.search, {
          product: 'p',
          brand: 'brand',
          category: 'cat',
        });
      }

      const excludeIds = (opts.excludeProductIds ?? []).filter(Boolean);
      if (excludeIds.length > 0) {
        qb.andWhere('p.id NOT IN (:...excludeIds)', { excludeIds });
      }

      return qb;
    };

    const countRow = await applyCatalogFilters(this.productRepo.createQueryBuilder('p'))
      .select('COUNT(DISTINCT p.id)', 'cnt')
      .getRawOne<{ cnt: string }>();
    const total = Number(countRow?.cnt ?? 0);

    const totalGeneralQb = applyVisibleProductJoins(this.productRepo.createQueryBuilder('p'));
    const excludeIds = (opts.excludeProductIds ?? []).filter(Boolean);
    if (excludeIds.length > 0) {
      totalGeneralQb.andWhere('p.id NOT IN (:...excludeIds)', { excludeIds });
    }
    const totalGeneralRow = await totalGeneralQb
      .select('COUNT(DISTINCT p.id)', 'cnt')
      .getRawOne<{ cnt: string }>();
    const totalGeneral = Number(totalGeneralRow?.cnt ?? 0);

    const rows = await applyCatalogFilters(this.productRepo.createQueryBuilder('p'))
      .select('p.id', 'id')
      .addSelect('p.name', 'name')
      .groupBy('p.id')
      .addGroupBy('p.name')
      .orderBy('p.name', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string; name: string }>();

    const categoryRows = await applyVisibleProductJoins(
      this.productRepo.createQueryBuilder('p'),
    )
      .select('cat.id', 'id')
      .addSelect('cat.name', 'name')
      .andWhere('cat.id IS NOT NULL')
      .groupBy('cat.id')
      .addGroupBy('cat.name')
      .orderBy('cat.name', 'ASC')
      .getRawMany<{ id: string; name: string }>();

    const products = rows.map((row) => ({ id: row.id, name: row.name })) as Product[];
    const cards = await this.toProductCatalogCards(companyId, products);

    return {
      items: cards,
      total,
      totalGeneral,
      page,
      limit,
      categories: categoryRows.map((row) => ({ id: row.id, name: row.name })),
    };
  }

  async getProduct(store: EShopStoreContext, id: string) {
    const variant = await this.variantRepo.findOne({
      where: {
        id,
        companyId: store.companyId,
        isActive: true,
        visibleInEShop: true,
      },
      relations: ['product'],
    });
    if (!variant || variant.product?.visibleInEShop !== true) {
      throw new NotFoundException('Producto no encontrado');
    }

    const assets = await this.multimediaAdapter.listByEntity(
      'product',
      variant.productId ?? variant.product?.id ?? '',
    );

    const stock = await this.stockRepo
      .createQueryBuilder('sl')
      .select('COALESCE(SUM(sl.availableStock), 0)', 'sum')
      .where('sl.companyId = :companyId', { companyId: store.companyId })
      .andWhere('sl.productVariantId = :id', { id: variant.id })
      .getRawOne<{ sum: string }>();

    const available = Number(stock?.sum ?? 0) > 0;

    return {
      id: variant.id,
      sku: variant.sku,
      name: variant.product?.name ?? variant.sku,
      description: variant.product?.description ?? null,
      basePrice: Number(variant.basePrice),
      inStock: available,
      productId: variant.productId ?? variant.product?.id ?? null,
      multimedia: assets.map((asset) => ({
        ...asset,
        publicUrl: resolveMultimediaPublicUrl(asset.publicUrl, this.config) ?? asset.publicUrl,
      })),
    };
  }

  async getCatalogProduct(
    store: EShopStoreContext,
    productId: string,
  ): Promise<EShopCatalogProductDetail> {
    return this.buildCatalogProductDetail(store.companyId, productId, {});
  }

  /** Vista previa admin: stock del almacén eShop y precios de la lista eShop. */
  async getCatalogProductPreview(
    companyId: string,
    productId: string,
  ): Promise<EShopCatalogProductDetail> {
    const eShop = await this.companiesService.getEShopFlatSettings(companyId);
    const operational = await resolveEShopOperationalContext(
      companyId,
      eShop,
      this.branchRepo,
    );
    let previewStorageName: string | null = null;
    if (operational.storageId) {
      const storage = await this.storageRepo.findOne({
        where: { id: operational.storageId, companyId, deletedAt: IsNull() },
      });
      previewStorageName = storage?.name?.trim() || null;
    }
    const detail = await this.buildCatalogProductDetail(companyId, productId, {
      storageId: operational.storageId,
      priceListId: operational.priceListId,
    });
    return { ...detail, previewStorageName };
  }

  private async buildCatalogProductDetail(
    companyId: string,
    productId: string,
    opts: {
      storageId?: string | null;
      priceListId?: string | null;
    },
  ): Promise<EShopCatalogProductDetail> {
    const product = await this.productRepo.findOne({
      where: {
        id: productId,
        companyId,
        isActive: true,
        visibleInEShop: true,
        deletedAt: null as unknown as undefined,
      },
      relations: ['category', 'catalogBrand'],
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const variantRows = await this.variantRepo.find({
      where: {
        productId: product.id,
        companyId,
        isActive: true,
        visibleInEShop: true,
        deletedAt: null as unknown as undefined,
      },
      order: { sku: 'ASC' },
    });

    if (!variantRows.length) {
      throw new NotFoundException('Producto sin variantes visibles en eShop');
    }

    const attributes = await this.attributeRepo.find({
      where: { companyId, isActive: true },
    });
    const attributeNameById = new Map(attributes.map((a) => [a.id, a.name]));

    const variantIds = variantRows.map((v) => v.id);
    const variantAssetsMap = await this.multimediaAdapter.listByEntityIds(
      'product-variant',
      variantIds,
      undefined,
      'all',
    );
    const productAssets = await this.multimediaAdapter.listByEntity(
      'product',
      product.id,
    );

    const stockQb = this.stockRepo
      .createQueryBuilder('sl')
      .select('sl.productVariantId', 'variantId')
      .addSelect('COALESCE(SUM(sl.availableStock), 0)', 'sum')
      .where('sl.companyId = :companyId', { companyId })
      .andWhere('sl.productVariantId IN (:...ids)', { ids: variantIds });

    if (opts.storageId) {
      stockQb.andWhere('sl.storageId = :storageId', { storageId: opts.storageId });
    }

    const stockRows = await stockQb
      .groupBy('sl.productVariantId')
      .getRawMany<{ variantId: string; sum: string }>();

    const stockQtyMap = new Map(
      stockRows.map((r) => [r.variantId, Math.max(0, Number(r.sum) || 0)]),
    );

    let priceByVariant = new Map<string, number>();
    if (opts.priceListId) {
      const priceItems = await this.priceListItemRepo.find({
        where: {
          companyId,
          priceListId: opts.priceListId,
          productVariantId: In(variantIds),
          deletedAt: IsNull(),
        },
      });
      priceByVariant = new Map(
        priceItems.map((item) => [
          item.productVariantId!,
          Number(item.grossPrice) || 0,
        ]),
      );
    }

    const variants = variantRows.map((v) => {
      const attributeValues = resolveVariantAttributeLabels(
        v.attributeValues,
        attributeNameById,
      );
      const assets = variantAssetsMap[v.id] ?? [];
      const trackInventory = v.trackInventory === true;
      const availableStock = trackInventory ? (stockQtyMap.get(v.id) ?? 0) : null;
      const inStock = trackInventory ? (availableStock ?? 0) > 0 : true;
      const listPrice = priceByVariant.get(v.id);
      return {
        id: v.id,
        sku: v.sku,
        attributeValues,
        basePrice: listPrice != null && listPrice > 0 ? listPrice : Number(v.basePrice),
        inStock,
        availableStock,
        trackInventory,
        multimedia: this.mapCatalogMultimedia(assets),
      };
    });

    return {
      product: {
        id: product.id,
        name: product.name,
        brand: product.catalogBrand?.name ?? product.brand ?? null,
        categoryName: product.category?.name ?? null,
        description: product.description ?? null,
        productType: product.productType,
        multimedia: this.mapCatalogMultimedia(productAssets),
      },
      variants,
      attributeOptions: buildAttributeOptions(variants),
      defaultVariantId: pickDefaultVariantId(variants),
    };
  }

  private mapCatalogMultimedia(
    assets: Array<{
      id: string;
      publicUrl: string;
      mimeType: string;
      kind: string;
      isPrimary?: boolean;
    }>,
  ) {
    return assets.map((asset) => ({
      id: asset.id,
      publicUrl:
        resolveMultimediaPublicUrl(asset.publicUrl, this.config) ?? asset.publicUrl,
      mimeType: asset.mimeType,
      kind: asset.kind,
      isPrimary: asset.isPrimary === true,
    }));
  }

  async listFeatured(store: EShopStoreContext) {
    const productIds = store.eShop.eShopFeaturedProductIds ?? [];
    if (productIds.length > 0) {
      const products = await this.productRepo.find({
        where: {
          id: In(productIds),
          companyId: store.companyId,
          isActive: true,
          visibleInEShop: true,
          deletedAt: null as unknown as undefined,
        },
      });
      const byId = new Map(products.map((p) => [p.id, p]));
      const ordered = productIds
        .map((id) => byId.get(id))
        .filter((p): p is Product => p != null);
      const cards = await this.toProductCatalogCards(store.companyId, ordered);
      return { items: cards };
    }

    const ids = store.eShop.eShopFeaturedProductVariantIds;
    if (!ids.length) return { items: [] as EShopProductCard[] };
    const variants = await this.variantRepo.find({
      where: {
        id: In(ids),
        companyId: store.companyId,
        isActive: true,
        visibleInEShop: true,
      },
      relations: ['product'],
    });
    const visibleVariants = variants.filter((v) => v.product?.visibleInEShop === true);
    const productIdOrder: string[] = [];
    const seenProducts = new Set<string>();
    for (const variantId of ids) {
      const v = visibleVariants.find((row) => row.id === variantId);
      const pid = v?.productId ?? v?.product?.id;
      if (pid && !seenProducts.has(pid)) {
        seenProducts.add(pid);
        productIdOrder.push(pid);
      }
    }
    if (!productIdOrder.length) {
      return { items: [] as EShopProductCard[] };
    }
    const products = await this.productRepo.find({
      where: {
        id: In(productIdOrder),
        companyId: store.companyId,
        isActive: true,
        visibleInEShop: true,
        deletedAt: null as unknown as undefined,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const ordered = productIdOrder
      .map((id) => byId.get(id))
      .filter((p): p is Product => p != null);
    const cards = await this.toProductCatalogCards(store.companyId, ordered);
    return { items: cards };
  }

  async listFeaturedProductsAdmin(companyId: string) {
    const settings = await this.companiesService.getEShopFlatSettings(companyId);
    const productIds = settings.eShopFeaturedProductIds ?? [];
    if (!productIds.length) {
      return { productIds: [] as string[], items: [] as EShopFeaturedProductAdminItem[] };
    }

    const products = await this.productRepo.find({
      where: {
        id: In(productIds),
        companyId,
        deletedAt: null as unknown as undefined,
      },
      relations: ['category', 'catalogBrand'],
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const mediaMap = await this.multimediaAdapter.listByEntityIds(
      'product',
      productIds,
    );

    const variantCounts = await this.variantRepo
      .createQueryBuilder('v')
      .select('v.productId', 'productId')
      .addSelect('COUNT(*)', 'cnt')
      .where('v.companyId = :companyId', { companyId })
      .andWhere('v.productId IN (:...ids)', { ids: productIds })
      .andWhere('v.deletedAt IS NULL')
      .groupBy('v.productId')
      .getRawMany<{ productId: string; cnt: string }>();
    const countByProduct = new Map(
      variantCounts.map((r) => [r.productId, Number(r.cnt) || 0]),
    );

    const items: EShopFeaturedProductAdminItem[] = [];
    for (const id of productIds) {
      const p = byId.get(id);
      if (!p) {
        continue;
      }
      const assets = mediaMap[id] ?? [];
      const primary = resolvePrimaryMultimediaAsset(assets);
      const imageUrl =
        resolveMultimediaPublicUrl(primary?.publicUrl, this.config) ??
        primary?.publicUrl ??
        null;
      items.push({
        id: p.id,
        name: p.name,
        brand: p.catalogBrand?.name ?? p.brand ?? null,
        categoryName: p.category?.name ?? null,
        visibleInEShop: p.visibleInEShop === true,
        isActive: p.isActive !== false,
        variantCount: countByProduct.get(id) ?? 0,
        imageUrl,
      });
    }

    return { productIds, items };
  }

  listBranches(store: EShopStoreContext) {
    return this.branchRepo.find({
      where: { companyId: store.companyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async listHeroSlides(store: EShopStoreContext) {
    const rows = await this.heroSlideRepo.find({
      where: { companyId: store.companyId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      take: 20,
    });
    const slides = await this.attachHeroSlideImages(rows);
    return {
      slides,
      autoplaySeconds: store.eShop.eShopHeroSliderAutoplaySeconds,
    };
  }

  async getHeroSliderSettingsAdmin(companyId: string) {
    const settings = await this.companiesService.getEShopFlatSettings(companyId);
    return { autoplaySeconds: settings.eShopHeroSliderAutoplaySeconds };
  }

  async updateHeroSliderAutoplaySeconds(companyId: string, autoplaySeconds: number) {
    const normalized = Math.max(
      ESHOP_HERO_SLIDER_AUTOPLAY_MIN_SECONDS,
      Math.round(Number(autoplaySeconds) || ESHOP_HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS),
    );
    const settings = await this.companiesService.replaceEShopFlatSettings(companyId, {
      eShopHeroSliderAutoplaySeconds: normalized,
    });
    return { autoplaySeconds: settings.eShopHeroSliderAutoplaySeconds };
  }

  async listTestimonials(store: EShopStoreContext) {
    const rows = await this.testimonialRepo.find({
      where: { companyId: store.companyId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      take: 50,
    });
    return this.attachTestimonialAvatars(rows);
  }

  async createCheckoutSale(
    store: EShopStoreContext,
    body: {
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      address?: string;
      lines: Array<{ productVariantId: string; quantity: number }>;
      notes?: string;
    },
  ) {
    if (!body.lines?.length) {
      throw new BadRequestException('El carrito está vacío');
    }

    const variantIds = body.lines.map((l) => l.productVariantId);
    const variants = await this.variantRepo.find({
      where: {
        id: In(variantIds),
        companyId: store.companyId,
        isActive: true,
        visibleInEShop: true,
      },
      relations: ['product'],
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    let subtotal = 0;
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.SALE;
    dto.transactionStatus = TransactionStatus.CONFIRMED;
    dto.paymentMethod = PaymentMethod.TRANSFER;
    dto.notes = body.notes?.trim() || `Pedido eShop — ${body.customerName}`;
    dto.metadata = {
      source: 'e-shop',
      customerName: body.customerName.trim(),
      customerEmail: body.customerEmail.trim(),
      customerPhone: body.customerPhone?.trim() || null,
      shippingAddress: body.address?.trim() || null,
    };
    dto.lines = [];

    for (const line of body.lines) {
      const variant = byId.get(line.productVariantId);
      if (!variant || variant.product?.visibleInEShop !== true) {
        throw new BadRequestException(`Variante no válida: ${line.productVariantId}`);
      }
      const qty = Math.max(1, Math.floor(line.quantity));
      const unitPrice = Number(variant.basePrice);
      const lineSubtotal = unitPrice * qty;
      subtotal += lineSubtotal;
      dto.lines.push({
        productId: variant.productId!,
        productVariantId: variant.id,
        productName: variant.product?.name ?? variant.sku,
        productSku: variant.sku,
        variantName: variant.product?.name ?? variant.sku,
        unitId: variant.saleUnitId,
        quantity: qty,
        unitPrice,
        unitCost: Number(variant.baseCost) || 0,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        subtotal: lineSubtotal,
        total: lineSubtotal,
      });
    }

    dto.subtotal = subtotal;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = subtotal;
    dto.amountPaid = 0;

    const operational = await resolveEShopOperationalContext(
      store.companyId,
      store.eShop,
      this.branchRepo,
    );
    dto.branchId = operational.branchId;

    const systemUser = await this.userRepo.findOne({
      where: { companyId: store.companyId },
      order: { id: 'ASC' },
    });
    if (!systemUser) {
      throw new BadRequestException(
        'No hay usuario del sistema para registrar ventas eShop',
      );
    }
    dto.userId = systemUser.id;

    const tx = await this.transactionsService.createTransaction(dto);

    return {
      transactionId: tx.id,
      documentNumber: tx.documentNumber,
      total: Number(tx.total),
    };
  }

  // --- Admin testimonials ---

  async listTestimonialsAdmin(companyId: string) {
    const rows = await this.testimonialRepo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
    return this.attachTestimonialAvatars(rows);
  }

  async createTestimonial(
    companyId: string,
    data: {
      clientName: string;
      rating: number;
      message: string;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    const rating = Math.min(5, Math.max(1, Math.floor(data.rating)));
    const row = this.testimonialRepo.create({
      companyId,
      clientName: data.clientName.trim(),
      rating,
      message: data.message.trim(),
      isActive: data.isActive !== false,
      sortOrder: data.sortOrder ?? 0,
    });
    return this.testimonialRepo.save(row);
  }

  async updateTestimonial(
    companyId: string,
    id: string,
    data: Partial<{
      clientName: string;
      rating: number;
      message: string;
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    const row = await this.testimonialRepo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Testimonio no encontrado');
    if (data.clientName != null) row.clientName = data.clientName.trim();
    if (data.message != null) row.message = data.message.trim();
    if (data.rating != null) {
      row.rating = Math.min(5, Math.max(1, Math.floor(data.rating)));
    }
    if (data.isActive != null) row.isActive = data.isActive;
    if (data.sortOrder != null) row.sortOrder = data.sortOrder;
    return this.testimonialRepo.save(row);
  }

  async deleteTestimonial(companyId: string, id: string) {
    const row = await this.testimonialRepo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Testimonio no encontrado');
    await this.testimonialRepo.remove(row);
    return { success: true };
  }

  // --- Admin hero slides ---

  async listHeroSlidesAdmin(companyId: string) {
    const rows = await this.heroSlideRepo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
    return this.attachHeroSlideImages(rows);
  }

  private async nextHeroSlideSortOrder(companyId: string): Promise<number> {
    const result = await this.heroSlideRepo
      .createQueryBuilder('s')
      .select('MAX(s.sort_order)', 'max')
      .where('s.company_id = :companyId', { companyId })
      .getRawOne<{ max: string | null }>();
    const max = Number(result?.max ?? 0);
    return max < 1 ? 1 : max + 1;
  }

  async reorderHeroSlides(companyId: string, orderedIds: string[]) {
    const uniqueIds = [...new Set(orderedIds)];
    if (uniqueIds.length !== orderedIds.length) {
      throw new BadRequestException('IDs duplicados en el orden');
    }
    const rows = await this.heroSlideRepo.find({ where: { companyId } });
    if (uniqueIds.length !== rows.length) {
      throw new BadRequestException(
        'La lista debe incluir todos los slides de la empresa',
      );
    }
    const rowIds = new Set(rows.map((r) => r.id));
    for (const id of uniqueIds) {
      if (!rowIds.has(id)) {
        throw new BadRequestException('Slide no encontrado');
      }
    }
    await this.heroSlideRepo.manager.transaction(async (em) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await em.update(
          EShopHeroSlide,
          { id: orderedIds[i], companyId },
          { sortOrder: i + 1 },
        );
      }
    });
    return this.listHeroSlidesAdmin(companyId);
  }

  async createHeroSlide(
    companyId: string,
    data: {
      title?: string | null;
      subtitle?: string | null;
      ctaLabel?: string | null;
      ctaHref?: string | null;
      ctaStyle?: EShopHeroSlideCtaStyle;
      isActive?: boolean;
      sortOrder?: number;
      textAlign?: EShopHeroSlideTextAlign;
      overlayOpacity?: number;
      textColor?: string | null;
    },
  ) {
    const sortOrder =
      data.sortOrder != null && data.sortOrder >= 1
        ? Math.round(data.sortOrder)
        : await this.nextHeroSlideSortOrder(companyId);
    const row = this.heroSlideRepo.create({
      companyId,
      title: data.title?.trim() || null,
      subtitle: data.subtitle?.trim() || null,
      ctaLabel: data.ctaLabel?.trim() || null,
      ctaHref: data.ctaHref?.trim() || null,
      ctaStyle: this.normalizeCtaStyle(data.ctaStyle, data.ctaLabel),
      isActive: data.isActive !== false,
      sortOrder,
      textAlign: this.normalizeTextAlign(data.textAlign),
      overlayOpacity: this.normalizeOverlayOpacity(data.overlayOpacity),
      textColor: this.normalizeTextColor(data.textColor),
    });
    return this.heroSlideRepo.save(row);
  }

  async updateHeroSlide(
    companyId: string,
    id: string,
    data: Partial<{
      title: string | null;
      subtitle: string | null;
      ctaLabel: string | null;
      ctaHref: string | null;
      ctaStyle: EShopHeroSlideCtaStyle;
      isActive: boolean;
      sortOrder: number;
      textAlign: EShopHeroSlideTextAlign;
      overlayOpacity: number;
      textColor: string | null;
    }>,
  ) {
    const row = await this.heroSlideRepo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Slide no encontrado');
    if (data.title !== undefined) row.title = data.title?.trim() || null;
    if (data.subtitle !== undefined) row.subtitle = data.subtitle?.trim() || null;
    if (data.ctaLabel !== undefined) row.ctaLabel = data.ctaLabel?.trim() || null;
    if (data.ctaHref !== undefined) row.ctaHref = data.ctaHref?.trim() || null;
    if (data.ctaStyle != null) {
      row.ctaStyle = this.normalizeCtaStyle(data.ctaStyle, row.ctaLabel);
    } else if (data.ctaLabel !== undefined && !data.ctaLabel?.trim()) {
      row.ctaStyle = 'none';
    }
    if (data.isActive != null) row.isActive = data.isActive;
    if (data.sortOrder != null) {
      row.sortOrder = Math.max(1, Math.round(data.sortOrder));
    }
    if (data.textAlign != null) row.textAlign = this.normalizeTextAlign(data.textAlign);
    if (data.overlayOpacity != null) {
      row.overlayOpacity = this.normalizeOverlayOpacity(data.overlayOpacity);
    }
    if (data.textColor !== undefined) {
      row.textColor =
        data.textColor === null
          ? null
          : this.normalizeTextColor(data.textColor);
    }
    return this.heroSlideRepo.save(row);
  }

  async deleteHeroSlide(companyId: string, id: string) {
    const row = await this.heroSlideRepo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Slide no encontrado');
    await this.heroSlideRepo.remove(row);
    return { success: true };
  }

  replaceFeaturedVariantIds(companyId: string, ids: string[]) {
    return this.companiesService.replaceEShopFlatSettings(companyId, {
      eShopFeaturedProductVariantIds: ids,
    });
  }

  replaceFeaturedProductIds(companyId: string, productIds: string[]) {
    const unique = [...new Set(productIds.filter((id) => typeof id === 'string' && id.trim()))];
    return this.companiesService.replaceEShopFlatSettings(companyId, {
      eShopFeaturedProductIds: unique,
      eShopFeaturedProductVariantIds: [],
    });
  }

  private normalizeTextAlign(value?: EShopHeroSlideTextAlign): EShopHeroSlideTextAlign {
    if (value === 'center' || value === 'right') return value;
    return 'left';
  }

  private normalizeCtaStyle(
    value?: EShopHeroSlideCtaStyle,
    ctaLabel?: string | null,
  ): EShopHeroSlideCtaStyle {
    if (value === 'button' || value === 'link' || value === 'none') return value;
    return ctaLabel?.trim() ? 'button' : 'none';
  }

  private normalizeOverlayOpacity(value?: number): number {
    if (value == null || Number.isNaN(value)) return 45;
    return Math.min(90, Math.max(0, Math.floor(value)));
  }

  private normalizeTextColor(value?: string | null): string | null {
    if (value == null || !String(value).trim()) return null;
    const raw = String(value).trim();
    const hex = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex.toUpperCase();
    if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
      const h = hex.slice(1);
      return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
    }
    return null;
  }

  private async attachHeroSlideImages<T extends { id: string }>(
    rows: T[],
  ): Promise<Array<T & { imageUrl: string | null }>> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const assetsMap = await this.multimediaAdapter.listByEntityIds(
      ESHOP_HERO_SLIDE_MULTIMEDIA_ENTITY,
      ids,
      'default',
    );
    return rows.map((row) => {
      const list = assetsMap[row.id] ?? [];
      const imageUrl = resolveMultimediaPublicUrl(list[0]?.publicUrl, this.config);
      return { ...row, imageUrl };
    });
  }

  private async attachTestimonialAvatars<T extends { id: string }>(
    rows: T[],
  ): Promise<Array<T & { avatarUrl: string | null }>> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const assetsMap = await this.multimediaAdapter.listByEntityIds(
      ESHOP_TESTIMONIAL_MULTIMEDIA_ENTITY,
      ids,
      'default',
    );
    return rows.map((row) => {
      const list = assetsMap[row.id] ?? [];
      const avatarUrl = resolveMultimediaPublicUrl(list[0]?.publicUrl, this.config);
      return { ...row, avatarUrl };
    });
  }

  private async toProductCatalogCards(
    companyId: string,
    products: Product[],
  ): Promise<EShopProductCard[]> {
    if (!products.length) {
      return [];
    }
    const productIds = products.map((p) => p.id);
    const variants = await this.variantRepo.find({
      where: {
        productId: In(productIds),
        companyId,
        isActive: true,
        visibleInEShop: true,
        deletedAt: null as unknown as undefined,
      },
      order: { sku: 'ASC' },
    });
    const variantsByProduct = new Map<string, ProductVariant[]>();
    for (const v of variants) {
      const pid = v.productId;
      if (!pid) {
        continue;
      }
      if (!variantsByProduct.has(pid)) {
        variantsByProduct.set(pid, []);
      }
      variantsByProduct.get(pid)!.push(v);
    }

    const variantIds = variants.map((v) => v.id);
    const stockMap = new Map<string, boolean>();
    if (variantIds.length > 0) {
      const stockRows = await this.stockRepo
        .createQueryBuilder('sl')
        .select('sl.productVariantId', 'variantId')
        .addSelect('COALESCE(SUM(sl.availableStock), 0)', 'sum')
        .where('sl.companyId = :companyId', { companyId })
        .andWhere('sl.productVariantId IN (:...ids)', { ids: variantIds })
        .groupBy('sl.productVariantId')
        .getRawMany<{ variantId: string; sum: string }>();
      for (const r of stockRows) {
        stockMap.set(r.variantId, Number(r.sum) > 0);
      }
    }

    const productAssetsMap = await this.multimediaAdapter.listByEntityIds(
      'product',
      productIds,
    );
    const imageByProductId = new Map<string, string>();
    for (const productId of productIds) {
      const assets = productAssetsMap[productId] ?? [];
      const primary = resolvePrimaryMultimediaAsset(assets);
      const resolved = resolveMultimediaPublicUrl(primary?.publicUrl, this.config);
      if (resolved) {
        imageByProductId.set(productId, resolved);
      }
    }

    const cards: EShopProductCard[] = [];
    for (const product of products) {
      const list = variantsByProduct.get(product.id) ?? [];
      if (!list.length) {
        continue;
      }
      const withStock = list.map((v) => ({
        id: v.id,
        inStock: v.trackInventory === false ? true : (stockMap.get(v.id) ?? false),
      }));
      const defaultVariantId = pickDefaultVariantId(withStock);
      const defaultVariant =
        list.find((v) => v.id === defaultVariantId) ?? list[0] ?? null;
      const inStock = withStock.some((v) => v.inStock);
      cards.push({
        id: product.id,
        name: product.name,
        basePrice: Number(defaultVariant?.basePrice ?? 0),
        imageUrl: imageByProductId.get(product.id) ?? null,
        inStock,
        defaultVariantId: defaultVariant?.id ?? null,
      });
    }
    return cards;
  }
}
