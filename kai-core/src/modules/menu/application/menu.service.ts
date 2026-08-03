import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { MenuHeroSlide } from '../domain/menu-hero-slide.entity';
import { MENU_HERO_SLIDE_MULTIMEDIA_ENTITY } from '../domain/menu-hero-slide.constants';
import type { MenuStoreContext } from './menu-store.context';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { AppConfigService } from '../../../config/config.service';
import { resolveMultimediaPublicUrl } from '@modules/multimedia/application/utils/resolve-multimedia-public-url.util';
import { resolvePrimaryMultimediaAsset } from '@modules/multimedia/application/utils/resolve-primary-multimedia.util';
import { resolveVariantAttributeLabels } from '@modules/e-shop/application/helpers/eshop-catalog-product.helpers';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
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

  private resolveAssetUrl(
    assets: ReadonlyArray<{ publicUrl: string; isPrimary?: boolean }>,
  ): string | null {
    const primary = resolvePrimaryMultimediaAsset(assets);
    const raw = primary?.publicUrl ?? assets[0]?.publicUrl ?? null;
    return resolveMultimediaPublicUrl(raw, this.config) ?? raw;
  }

  private async loadAttributeNameById(
    companyId: string,
    attributeIds: string[] = [],
  ): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(attributeIds.filter(Boolean))];
    const rows = (await this.attributeRepo.manager.query(
      `SELECT id, name
       FROM attributes
       WHERE "deletedAt" IS NULL
         AND (
           company_id = $1
           OR (cardinality($2::uuid[]) > 0 AND id = ANY($2::uuid[]))
         )`,
      [companyId, uniqueIds],
    )) as Array<{ id: string; name: string }>;
    return new Map(rows.map((a) => [a.id, a.name]));
  }

  private collectAttributeIdsFromRaw(
    rows: Array<{ attributeValues?: unknown }>,
  ): string[] {
    const ids: string[] = [];
    for (const row of rows) {
      const parsed = this.parseAttributeValues(row.attributeValues);
      if (!parsed) continue;
      for (const key of Object.keys(parsed)) {
        if (key.trim()) ids.push(key.trim());
      }
    }
    return ids;
  }

  private formatVariantDisplayName(
    productName: string,
    attributeValues: Record<string, string>,
  ): string {
    const values = Object.values(attributeValues)
      .map((v) => String(v).trim())
      .filter(Boolean);
    if (!values.length) return productName;
    return `${productName} · ${values.join(' · ')}`;
  }

  private parseAttributeValues(
    raw: unknown,
  ): Record<string, string> | null {
    if (raw == null) return null;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, string>;
        }
      } catch {
        return null;
      }
      return null;
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, string>;
    }
    return null;
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
        `(LOWER(p.name) LIKE LOWER(:q)
          OR LOWER(COALESCE(cat.name, '')) LIKE LOWER(:q)
          OR LOWER(COALESCE(v."attributeValues"::text, '')) LIKE LOWER(:q))`,
        { q },
      );
    }

    const countRow = await qb
      .clone()
      .select('COUNT(v.id)', 'cnt')
      .getRawOne<{ cnt: string }>();
    const total = Number(countRow?.cnt ?? 0);

    const selectQb = qb
      .clone()
      .select('v.id', 'id')
      .addSelect('p.id', 'productId')
      .addSelect('p.name', 'productName')
      .addSelect('p.description', 'description')
      .addSelect('p.categoryId', 'categoryId')
      .addSelect('cat.name', 'categoryName')
      .addSelect('v.attributeValues', 'attributeValues')
      .addSelect('v.basePrice', 'basePrice')
      .orderBy('cat.name', 'ASC', 'NULLS LAST')
      .addOrderBy('p.name', 'ASC')
      .addOrderBy('v.sku', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit);

    if (priceListId) {
      selectQb.addSelect('pli.grossPrice', 'listPrice');
    }

    const rows = await selectQb.getRawMany<{
      id: string;
      productId: string;
      productName: string;
      description: string | null;
      categoryId: string | null;
      categoryName: string | null;
      attributeValues: unknown;
      basePrice: string;
      listPrice?: string;
    }>();

    const attributeNameById = await this.loadAttributeNameById(
      companyId,
      this.collectAttributeIdsFromRaw(rows),
    );
    const variantIds = rows.map((r) => r.id);
    const productIds = [...new Set(rows.map((r) => r.productId))];

    const [variantAssetsMap, productAssetsMap] = await Promise.all([
      variantIds.length
        ? this.multimediaService.listByEntityIds('product-variant', variantIds)
        : Promise.resolve({} as Record<string, never>),
      productIds.length
        ? this.multimediaService.listByEntityIds('product', productIds)
        : Promise.resolve({} as Record<string, never>),
    ]);

    const items = rows.map((row) => {
      const labels = resolveVariantAttributeLabels(
        this.parseAttributeValues(row.attributeValues),
        attributeNameById,
      );
      const variantUrl = this.resolveAssetUrl(variantAssetsMap[row.id] ?? []);
      const productUrl = this.resolveAssetUrl(productAssetsMap[row.productId] ?? []);
      const price = Number(row.listPrice ?? row.basePrice) || 0;
      return {
        id: row.id,
        productId: row.productId,
        name: this.formatVariantDisplayName(row.productName, labels),
        description: row.description,
        price,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        imageUrl: variantUrl ?? productUrl,
        attributeValues: labels,
      };
    });

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

    let variantRows: Array<{
      id: string;
      sku: string;
      basePrice: string;
      listPrice?: string;
      attributeValues: unknown;
    }>;

    if (priceListId) {
      variantRows = await this.variantRepo
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
        .getRawMany();
    } else {
      const found = await this.variantRepo.find({
        where: {
          productId,
          companyId,
          isActive: true,
        },
        order: { sku: 'ASC' },
      });
      variantRows = found.map((v) => ({
        id: v.id,
        sku: v.sku,
        basePrice: String(v.basePrice ?? 0),
        attributeValues: v.attributeValues ?? null,
      }));
    }

    if (!variantRows.length) {
      throw new NotFoundException('Producto sin variantes en la carta');
    }

    const attributeNameById = await this.loadAttributeNameById(
      companyId,
      this.collectAttributeIdsFromRaw(variantRows),
    );

    const variants = variantRows.map((v) => ({
      id: v.id,
      sku: v.sku,
      basePrice: Number(v.listPrice ?? v.basePrice) || 0,
      attributeValues: resolveVariantAttributeLabels(
        this.parseAttributeValues(v.attributeValues),
        attributeNameById,
      ),
    }));

    const productAssets = await this.multimediaService.listByEntity(
      'product',
      product.id,
    );
    const imageUrl = this.resolveAssetUrl(productAssets);
    const multimedia = productAssets.map((asset) => ({
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
      imageUrl,
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
