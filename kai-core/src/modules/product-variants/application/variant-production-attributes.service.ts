import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '../domain/product-variant.entity';
import { ProductVariantProductionAttribute } from '../domain/product-variant-production-attribute.entity';
import { ProductVariantProductionAttributeOption } from '../domain/product-variant-production-attribute-option.entity';
import {
  assertManufacturadoForProductionAttributes,
  sanitizeProductionAttributesPayload,
  type ProductionAttributeInput,
} from './helpers/variant-production-attributes.util';

export type ProductionAttributeDto = {
  id: string;
  name: string;
  description: string | null;
  tagKey: string | null;
  tagLabel: string | null;
  displayOrder: number;
  options: Array<{ id: string; label: string; displayOrder: number }>;
};

@Injectable()
export class VariantProductionAttributesService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantOrm: Repository<ProductVariant>,
    @InjectRepository(ProductVariantProductionAttribute)
    private readonly attrOrm: Repository<ProductVariantProductionAttribute>,
    @InjectRepository(ProductVariantProductionAttributeOption)
    private readonly optOrm: Repository<ProductVariantProductionAttributeOption>,
  ) {}

  private requireCompanyId(): string {
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new NotFoundException('Empresa activa requerida');
    }
    return companyId;
  }

  private async requireManufacturadoVariant(
    variantId: string,
    companyId: string,
  ): Promise<ProductVariant> {
    const variant = await this.variantOrm.findOne({
      where: { id: variantId, companyId },
      select: ['id', 'productId', 'companyId'],
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
    const product = await this.variantOrm.manager.getRepository(Product).findOne({
      where: { id: variant.productId!, companyId },
      select: ['id', 'productType'],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    assertManufacturadoForProductionAttributes(product.productType);
    return variant;
  }

  async list(variantId: string): Promise<ProductionAttributeDto[]> {
    const companyId = this.requireCompanyId();
    await this.requireManufacturadoVariant(variantId, companyId);

    const attrs = await this.attrOrm.find({
      where: {
        companyId,
        productVariantId: variantId,
      },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    if (attrs.length === 0) return [];

    const options = await this.optOrm.find({
      where: {
        companyId,
        attributeId: In(attrs.map((a) => a.id)),
      },
      order: { displayOrder: 'ASC', label: 'ASC' },
    });
    const byAttr = new Map<string, typeof options>();
    for (const o of options) {
      const list = byAttr.get(o.attributeId) ?? [];
      list.push(o);
      byAttr.set(o.attributeId, list);
    }

    return attrs.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description ?? null,
      tagKey: a.tagKey ?? null,
      tagLabel: a.tagLabel ?? null,
      displayOrder: a.displayOrder,
      options: (byAttr.get(a.id) ?? []).map((o) => ({
        id: o.id,
        label: o.label,
        displayOrder: o.displayOrder,
      })),
    }));
  }

  async replace(
    variantId: string,
    rawItems: unknown,
  ): Promise<ProductionAttributeDto[]> {
    const companyId = this.requireCompanyId();
    await this.requireManufacturadoVariant(variantId, companyId);

    let items: ProductionAttributeInput[];
    try {
      items = sanitizeProductionAttributesPayload(rawItems);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Payload inválido',
      );
    }

    const existingAttrs = await this.attrOrm.find({
      where: { companyId, productVariantId: variantId },
      withDeleted: true,
    });
    const existingById = new Map(existingAttrs.map((a) => [a.id, a]));
    const keepAttrIds = new Set(items.map((i) => i.id));

    const existingOpts =
      existingAttrs.length === 0
        ? []
        : await this.optOrm.find({
            where: {
              companyId,
              attributeId: In(existingAttrs.map((a) => a.id)),
            },
            withDeleted: true,
          });
    const existingOptById = new Map(existingOpts.map((o) => [o.id, o]));

    await this.attrOrm.manager.transaction(async (em) => {
      const attrRepo = em.getRepository(ProductVariantProductionAttribute);
      const optRepo = em.getRepository(ProductVariantProductionAttributeOption);

      for (const item of items) {
        let attr = existingById.get(item.id);
        if (attr) {
          if (attr.productVariantId !== variantId || attr.companyId !== companyId) {
            throw new BadRequestException(
              `Atributo ${item.id} no pertenece a esta variante`,
            );
          }
          attr.name = item.name;
          attr.description = item.description ?? null;
          attr.tagKey = item.tagKey ?? null;
          attr.tagLabel = item.tagLabel ?? null;
          attr.displayOrder = item.displayOrder;
          attr.deletedAt = null;
          await attrRepo.save(attr);
        } else {
          attr = attrRepo.create({
            id: item.id,
            companyId,
            productVariantId: variantId,
            name: item.name,
            description: item.description ?? null,
            tagKey: item.tagKey ?? null,
            tagLabel: item.tagLabel ?? null,
            displayOrder: item.displayOrder,
            deletedAt: null,
          });
          await attrRepo.save(attr);
          existingById.set(attr.id, attr);
        }

        const keepOptIds = new Set(item.options.map((o) => o.id));
        for (const opt of existingOpts.filter((o) => o.attributeId === item.id)) {
          if (!keepOptIds.has(opt.id) && !opt.deletedAt) {
            await optRepo.softDelete(opt.id);
          }
        }

        for (const o of item.options) {
          const existing = existingOptById.get(o.id);
          if (existing) {
            if (existing.attributeId !== item.id && !existing.deletedAt) {
              throw new BadRequestException(
                `Opción ${o.id} ya pertenece a otro atributo`,
              );
            }
            existing.attributeId = item.id;
            existing.label = o.label;
            existing.displayOrder = o.displayOrder;
            existing.deletedAt = null;
            existing.companyId = companyId;
            await optRepo.save(existing);
          } else {
            const created = optRepo.create({
              id: o.id,
              companyId,
              attributeId: item.id,
              label: o.label,
              displayOrder: o.displayOrder,
              deletedAt: null,
            });
            await optRepo.save(created);
            existingOptById.set(created.id, created);
          }
        }
      }

      for (const attr of existingAttrs) {
        if (!keepAttrIds.has(attr.id) && !attr.deletedAt) {
          await optRepo
            .createQueryBuilder()
            .softDelete()
            .where('attribute_id = :aid AND deleted_at IS NULL', {
              aid: attr.id,
            })
            .execute();
          await attrRepo.softDelete(attr.id);
        }
      }
    });

    return this.list(variantId);
  }
}
