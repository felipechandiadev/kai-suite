import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ProductAddon } from '../domain/product-addon.entity';
import { Product } from '../domain/product.entity';
import { ProductType } from '../domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { isAgregadoProductType } from './helpers/product-type-policy.util';

export type HostAddonVariantDto = {
  id: string;
  sku: string | null;
};

/** JSON plano para POS/waiter/admin (no esparcir la entidad TypeORM). */
export type HostAddonListItemDto = {
  id: string;
  hostProductId: string;
  addonProductId: string;
  sortOrder: number;
  name: string;
  addonProduct: { id: string; name: string; productType: string | null } | null;
  addonVariants: HostAddonVariantDto[];
};

@Injectable()
export class ProductAddonsService {
  constructor(
    @InjectRepository(ProductAddon)
    private readonly addonRepo: Repository<ProductAddon>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
  ) {}

  async listByHostProduct(
    companyId: string,
    hostProductId: string,
  ): Promise<HostAddonListItemDto[]> {
    const rows = await this.addonRepo.find({
      where: { companyId, hostProductId },
      relations: ['addonProduct'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const productIds = [...new Set(rows.map((r) => r.addonProductId))];
    const variants =
      productIds.length === 0
        ? []
        : await this.variantRepo.find({
            where: {
              companyId,
              productId: In(productIds),
              deletedAt: IsNull(),
            },
          });
    const byProduct = new Map<string, HostAddonVariantDto[]>();
    for (const v of variants) {
      const pid = v.productId ?? '';
      if (!pid) continue;
      const list = byProduct.get(pid) ?? [];
      list.push({ id: v.id, sku: v.sku ?? null });
      byProduct.set(pid, list);
    }
    return rows.map((row) => ({
      id: row.id,
      hostProductId: row.hostProductId,
      addonProductId: row.addonProductId,
      sortOrder: row.sortOrder,
      name: row.addonProduct?.name?.trim() || 'Extra',
      addonProduct: row.addonProduct
        ? {
            id: row.addonProduct.id,
            name: row.addonProduct.name,
            productType: row.addonProduct.productType
              ? String(row.addonProduct.productType)
              : null,
          }
        : null,
      addonVariants: byProduct.get(row.addonProductId) ?? [],
    }));
  }

  async addAddon(
    companyId: string,
    hostProductId: string,
    addonProductId: string,
    sortOrder?: number,
  ): Promise<ProductAddon> {
    if (hostProductId === addonProductId) {
      throw new BadRequestException('Un producto no puede ser agregado de sí mismo.');
    }
    const [host, addon] = await Promise.all([
      this.productRepo.findOne({ where: { id: hostProductId, companyId } }),
      this.productRepo.findOne({ where: { id: addonProductId, companyId } }),
    ]);
    if (!host) {
      throw new NotFoundException('Producto host no encontrado.');
    }
    if (!addon) {
      throw new NotFoundException('Producto agregado no encontrado.');
    }
    if (!isAgregadoProductType(addon.productType)) {
      throw new BadRequestException(
        'Solo productos tipo AGREGADO pueden asociarse como extra.',
      );
    }
    if (host.productType === ProductType.PACK) {
      throw new BadRequestException('Los packs no admiten agregados.');
    }

    const existing = await this.addonRepo.findOne({
      where: { hostProductId, addonProductId },
    });
    if (existing) {
      return existing;
    }

    const maxSort = await this.addonRepo
      .createQueryBuilder('a')
      .select('MAX(a.sortOrder)', 'max')
      .where('a.hostProductId = :hostProductId', { hostProductId })
      .getRawOne<{ max: string | null }>();

    return this.addonRepo.save(
      this.addonRepo.create({
        companyId,
        hostProductId,
        addonProductId,
        sortOrder:
          sortOrder ??
          (maxSort?.max != null ? Number(maxSort.max) + 1 : 1),
      }),
    );
  }

  async removeAddon(
    companyId: string,
    hostProductId: string,
    addonProductId: string,
  ): Promise<void> {
    const row = await this.addonRepo.findOne({
      where: { companyId, hostProductId, addonProductId },
    });
    if (!row) {
      throw new NotFoundException('Asociación agregado no encontrada.');
    }
    await this.addonRepo.remove(row);
  }

  async reorderAddons(
    companyId: string,
    hostProductId: string,
    orderedAddonProductIds: string[],
  ): Promise<HostAddonListItemDto[]> {
    const rows = await this.addonRepo.find({
      where: { companyId, hostProductId },
    });
    const byAddonId = new Map(rows.map((r) => [r.addonProductId, r]));
    let order = 1;
    for (const id of orderedAddonProductIds) {
      const row = byAddonId.get(id);
      if (!row) continue;
      row.sortOrder = order++;
      await this.addonRepo.save(row);
    }
    return this.listByHostProduct(companyId, hostProductId);
  }

  async isAddonAllowedForHostVariant(
    companyId: string,
    hostProductId: string,
    addonVariantId: string,
    addonProductId: string,
  ): Promise<boolean> {
    const link = await this.addonRepo.findOne({
      where: { companyId, hostProductId, addonProductId },
    });
    return Boolean(link);
  }

  async searchAgregadoProducts(
    companyId: string,
    options?: { categoryId?: string; query?: string; limit?: number },
  ): Promise<Product[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.companyId = :companyId', { companyId })
      .andWhere('p.productType = :pt', { pt: ProductType.AGREGADO })
      .orderBy('p.name', 'ASC');

    if (options?.categoryId?.trim()) {
      qb.andWhere('p.categoryId = :categoryId', {
        categoryId: options.categoryId.trim(),
      });
    }
    if (options?.query?.trim()) {
      qb.andWhere('p.name ILIKE :q', { q: `%${options.query.trim()}%` });
    }
    qb.take(Math.min(options?.limit ?? 50, 100));
    return qb.getMany();
  }
}
