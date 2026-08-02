import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { MenuHeroSlide } from '../domain/menu-hero-slide.entity';
import { MENU_HERO_SLIDE_MULTIMEDIA_ENTITY } from '../domain/menu-hero-slide.constants';
import type { MenuStoreContext } from './menu-store.context';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { AppConfigService } from '../../../config/config.service';
import { resolveMultimediaPublicUrl } from '@modules/multimedia/application/utils/resolve-multimedia-public-url.util';
import { resolvePrimaryMultimediaAsset } from '@modules/multimedia/application/utils/resolve-primary-multimedia.util';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(MenuHeroSlide)
    private readonly heroSlideRepo: Repository<MenuHeroSlide>,
    private readonly multimediaService: MultimediaServiceAdapter,
    private readonly config: AppConfigService,
  ) {}

  async getStorefront(store: MenuStoreContext) {
    const companyAssets = await this.multimediaService.listByEntity(
      'company',
      store.companyId,
    );
    const companyLogo = resolvePrimaryMultimediaAsset(companyAssets);
    const companyLogoUrl =
      resolveMultimediaPublicUrl(companyLogo?.publicUrl, this.config) ??
      companyLogo?.publicUrl ??
      null;

    const heroRows = await this.heroSlideRepo.find({
      where: { companyId: store.companyId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const heroSlides = await this.attachHeroSlideImages(heroRows);

    return {
      companyName: store.companyName,
      companyLogoUrl,
      slug: store.slug,
      menuEnabled: store.menuEnabled,
      topBar: store.topBar,
      about: store.about,
      findUs: store.findUs,
      theme: store.theme,
      heroSlides,
    };
  }

  private async attachHeroSlideImages(
    rows: MenuHeroSlide[],
  ): Promise<
    Array<
      MenuHeroSlide & {
        imageUrl: string | null;
      }
    >
  > {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const assetsMap = await this.multimediaService.listByEntityIds(
      MENU_HERO_SLIDE_MULTIMEDIA_ENTITY,
      ids,
      'default',
    );
    return rows.map((row) => {
      const list = assetsMap[row.id] ?? [];
      const primary = resolvePrimaryMultimediaAsset(list);
      const imageUrl =
        resolveMultimediaPublicUrl(primary?.publicUrl ?? list[0]?.publicUrl, this.config) ??
        primary?.publicUrl ??
        list[0]?.publicUrl ??
        null;
      return { ...row, imageUrl };
    });
  }

  private async attachProductImages<T extends { id: string }>(
    rows: T[],
  ): Promise<Array<T & { imageUrl: string | null }>> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const assetsMap = await this.multimediaService.listByEntityIds(
      'product',
      ids,
    );
    return rows.map((row) => {
      const list = assetsMap[row.id] ?? [];
      const primary = resolvePrimaryMultimediaAsset(list);
      const raw = primary?.publicUrl ?? list[0]?.publicUrl ?? null;
      const imageUrl = resolveMultimediaPublicUrl(raw, this.config) ?? raw;
      return { ...row, imageUrl };
    });
  }

  async listCatalog(
    store: MenuStoreContext,
    opts: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      categoryIds?: string[];
    },
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(96, Math.max(1, opts.limit ?? 48));
    const companyId = store.companyId;
    const priceListId = store.menuDefaultPriceListId;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .innerJoin(
        ProductVariant,
        'v',
        `v.productId = p.id
          AND v.companyId = :companyId
          AND v.isActive = true
          AND v.deletedAt IS NULL`,
        { companyId },
      )
      .leftJoin(
        Category,
        'cat',
        'cat.id = p.categoryId AND cat.companyId = :companyId AND cat.deletedAt IS NULL',
        { companyId },
      )
      .where('p.companyId = :companyId', { companyId })
      .andWhere('p.isActive = true')
      .andWhere('p.onMenu = true')
      .andWhere('p.productType != :insumoType', { insumoType: ProductType.INSUMO })
      .andWhere('p.deletedAt IS NULL');

    if (priceListId) {
      qb.innerJoin(
        PriceListItem,
        'pli',
        `pli.productVariantId = v.id
          AND pli.priceListId = :priceListId
          AND pli.deletedAt IS NULL`,
        { priceListId },
      );
    }

    const categoryIds = [
      ...(opts.categoryIds ?? []),
      ...(opts.categoryId?.trim() ? [opts.categoryId.trim()] : []),
    ]
      .map((id) => id.trim())
      .filter(Boolean);
    const uniqueCategoryIds = [...new Set(categoryIds)];
    if (uniqueCategoryIds.length === 1) {
      qb.andWhere('p.categoryId = :categoryId', {
        categoryId: uniqueCategoryIds[0],
      });
    } else if (uniqueCategoryIds.length > 1) {
      qb.andWhere('p.categoryId IN (:...categoryIds)', {
        categoryIds: uniqueCategoryIds,
      });
    }

    if (opts.search?.trim()) {
      const q = `%${opts.search.trim()}%`;
      qb.andWhere(
        `(LOWER(p.name) LIKE LOWER(:q) OR LOWER(COALESCE(cat.name, '')) LIKE LOWER(:q))`,
        { q },
      );
    }

    const countRow = await qb
      .clone()
      .select('COUNT(DISTINCT p.id)', 'cnt')
      .getRawOne<{ cnt: string }>();
    const total = Number(countRow?.cnt ?? 0);

    const rows = await qb
      .select('p.id', 'id')
      .addSelect('p.name', 'name')
      .addSelect('p.description', 'description')
      .addSelect('p.categoryId', 'categoryId')
      .addSelect('cat.name', 'categoryName')
      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('p.description')
      .addGroupBy('p.categoryId')
      .addGroupBy('cat.name')
      .orderBy('cat.name', 'ASC', 'NULLS LAST')
      .addOrderBy('p.name', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{
        id: string;
        name: string;
        description: string | null;
        categoryId: string | null;
        categoryName: string | null;
      }>();

    const items = await this.attachProductImages(rows);
    return { items, total, page, limit };
  }

  async getProduct(store: MenuStoreContext, productId: string) {
    const companyId = store.companyId;
    const priceListId = store.menuDefaultPriceListId;

    const product = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin(
        Category,
        'cat',
        'cat.id = p.categoryId AND cat.companyId = :companyId AND cat.deletedAt IS NULL',
        { companyId },
      )
      .where('p.id = :productId', { productId })
      .andWhere('p.companyId = :companyId', { companyId })
      .andWhere('p.isActive = true')
      .andWhere('p.onMenu = true')
      .andWhere('p.productType != :insumoType', { insumoType: ProductType.INSUMO })
      .andWhere('p.deletedAt IS NULL')
      .select('p.id', 'id')
      .addSelect('p.name', 'name')
      .addSelect('p.description', 'description')
      .addSelect('p.categoryId', 'categoryId')
      .addSelect('cat.name', 'categoryName')
      .getRawOne<{
        id: string;
        name: string;
        description: string | null;
        categoryId: string | null;
        categoryName: string | null;
      }>();

    if (!product) {
      throw new NotFoundException('Producto no encontrado en la carta');
    }

    let variants: Array<{
      id: string;
      sku: string;
      basePrice: number;
      attributeValues: Record<string, string>;
    }>;

    if (priceListId) {
      const rows = await this.variantRepo
        .createQueryBuilder('v')
        .innerJoin(
          PriceListItem,
          'pli',
          `pli.productVariantId = v.id
            AND pli.priceListId = :priceListId
            AND pli.deletedAt IS NULL`,
          { priceListId },
        )
        .where('v.productId = :productId', { productId })
        .andWhere('v.companyId = :companyId', { companyId })
        .andWhere('v.isActive = true')
        .andWhere('v.deletedAt IS NULL')
        .select('v.id', 'id')
        .addSelect('v.sku', 'sku')
        .addSelect('v.basePrice', 'basePrice')
        .addSelect('v.attributeValues', 'attributeValues')
        .addSelect('pli.grossPrice', 'listPrice')
        .orderBy('v.sku', 'ASC')
        .getRawMany<{
          id: string;
          sku: string;
          basePrice: string;
          listPrice: string;
          attributeValues: Record<string, string> | null;
        }>();
      variants = rows.map((v) => ({
        id: v.id,
        sku: v.sku,
        basePrice: Number(v.listPrice ?? v.basePrice) || 0,
        attributeValues: v.attributeValues ?? {},
      }));
    } else {
      const rows = await this.variantRepo.find({
        where: {
          productId,
          companyId,
          isActive: true,
        },
        order: { sku: 'ASC' },
      });
      variants = rows.map((v) => ({
        id: v.id,
        sku: v.sku,
        basePrice: Number(v.basePrice) || 0,
        attributeValues: (v.attributeValues as Record<string, string>) ?? {},
      }));
    }

    if (!variants.length) {
      throw new NotFoundException('Producto sin variantes en la carta');
    }

    const [withImage] = await this.attachProductImages([product]);
    const assets = await this.multimediaService.listByEntity('product', product.id);
    const multimedia = assets.map((asset) => ({
      id: asset.id,
      publicUrl:
        resolveMultimediaPublicUrl(asset.publicUrl, this.config) ?? asset.publicUrl,
      isPrimary: asset.isPrimary === true,
      mimeType: asset.mimeType ?? null,
    }));

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      imageUrl: withImage?.imageUrl ?? null,
      multimedia,
      variants,
    };
  }

  async listCategories(store: MenuStoreContext) {
    const companyId = store.companyId;
    const rows = await this.productRepo
      .createQueryBuilder('p')
      .innerJoin(
        ProductVariant,
        'v',
        `v.productId = p.id AND v.companyId = :companyId AND v.isActive = true AND v.deletedAt IS NULL`,
        { companyId },
      )
      .innerJoin(
        Category,
        'cat',
        'cat.id = p.categoryId AND cat.companyId = :companyId AND cat.deletedAt IS NULL',
        { companyId },
      )
      .where('p.companyId = :companyId', { companyId })
      .andWhere('p.isActive = true')
      .andWhere('p.onMenu = true')
      .andWhere('p.deletedAt IS NULL')
      .select('cat.id', 'id')
      .addSelect('cat.name', 'name')
      .groupBy('cat.id')
      .addGroupBy('cat.name')
      .orderBy('cat.name', 'ASC')
      .getRawMany<{ id: string; name: string }>();

    return rows;
  }
}
