import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CreateMultimediaAssetPayload,
  CreateMultimediaLinkPayload,
  CreateMultimediaVariantPayload,
  MultimediaRepositoryPort,
} from '../../application/ports/multimedia.repository.port';
import { MultimediaAsset } from '../../domain/multimedia-asset.entity';
import { MultimediaLink } from '../../domain/multimedia-link.entity';
import { MultimediaVariant } from '../../domain/multimedia-variant.entity';
import {
  applyMultimediaLinkAttributeScope,
  normalizeMultimediaLinkAttributeId,
} from '../../application/helpers/multimedia-link-attribute-scope';

@Injectable()
export class TypeOrmMultimediaRepository implements MultimediaRepositoryPort {
  constructor(
    @InjectRepository(MultimediaAsset)
    private readonly assetRepository: Repository<MultimediaAsset>,
    @InjectRepository(MultimediaLink)
    private readonly linkRepository: Repository<MultimediaLink>,
    @InjectRepository(MultimediaVariant)
    private readonly variantRepository: Repository<MultimediaVariant>,
  ) {}

  async createAsset(
    payload: CreateMultimediaAssetPayload,
  ): Promise<MultimediaAsset> {
    const entity = this.assetRepository.create({
      ...payload,
      status: 'active',
      optimizationStatus: payload.optimizationStatus ?? 'skipped',
    });

    return this.assetRepository.save(entity);
  }

  async updateAsset(
    id: string,
    patch: Partial<
      Pick<
        MultimediaAsset,
        'publicUrl' | 'optimizationStatus' | 'metadata' | 'width' | 'height'
      >
    >,
  ): Promise<void> {
    await this.assetRepository.update(
      { id },
      patch as Parameters<Repository<MultimediaAsset>['update']>[1],
    );
  }

  async createVariants(
    assetId: string,
    variants: CreateMultimediaVariantPayload[],
  ): Promise<MultimediaVariant[]> {
    if (variants.length === 0) return [];
    const entities = variants.map((v) =>
      this.variantRepository.create({
        assetId,
        ...v,
      }),
    );
    return this.variantRepository.save(entities);
  }

  listVariantsByAssetId(assetId: string): Promise<MultimediaVariant[]> {
    return this.variantRepository.find({ where: { assetId } });
  }

  private async attachVariants(
    assets: MultimediaAsset[],
  ): Promise<MultimediaAsset[]> {
    if (assets.length === 0) return assets;
    const ids = assets.map((a) => a.id);
    const variants = await this.variantRepository.find({
      where: { assetId: In(ids) },
    });
    const byAsset = new Map<string, MultimediaVariant[]>();
    for (const v of variants) {
      const list = byAsset.get(v.assetId) ?? [];
      list.push(v);
      byAsset.set(v.assetId, list);
    }
    for (const asset of assets) {
      asset.variants = byAsset.get(asset.id) ?? [];
    }
    return assets;
  }

  async findAssetById(id: string): Promise<MultimediaAsset | null> {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset) return null;
    await this.attachVariants([asset]);
    return asset;
  }

  findAssetByStorageKey(storageKey: string): Promise<MultimediaAsset | null> {
    return this.assetRepository.findOne({ where: { storageKey } });
  }

  async deleteAsset(id: string): Promise<void> {
    await this.variantRepository.delete({ assetId: id });
    await this.assetRepository.softDelete(id);
  }

  async createLink(
    payload: CreateMultimediaLinkPayload,
  ): Promise<MultimediaLink> {
    const entity = this.linkRepository.create({
      ...payload,
      attributeId: normalizeMultimediaLinkAttributeId(payload.attributeId),
      sortOrder: payload.sortOrder ?? 0,
      isPrimary: payload.isPrimary ?? false,
    });

    return this.linkRepository.save(entity);
  }

  async removeLink(params: {
    assetId: string;
    entityType: string;
    entityId: string;
    usageType?: string;
    attributeId?: string | null;
  }): Promise<void> {
    const qb = this.linkRepository
      .createQueryBuilder('link')
      .where('link.assetId = :assetId', { assetId: params.assetId })
      .andWhere('link.entityType = :entityType', { entityType: params.entityType })
      .andWhere('link.entityId = :entityId', { entityId: params.entityId });

    if (params.usageType) {
      qb.andWhere('link.usageType = :usageType', { usageType: params.usageType });
    }
    applyMultimediaLinkAttributeScope(qb, params.attributeId);

    const links = await qb.getMany();
    if (links.length === 0) {
      return;
    }
    await this.linkRepository.delete(links.map((l) => l.id));
  }

  async listAssetsByEntity(params: {
    entityType: string;
    entityId: string;
    usageType?: string;
    attributeId?: string | null;
  }): Promise<
    Array<
      MultimediaAsset & {
        isPrimary: boolean;
        sortOrder: number;
        linkId: string;
      }
    >
  > {
    const qb = this.linkRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.asset', 'asset')
      .where('link.entityType = :entityType', { entityType: params.entityType })
      .andWhere('link.entityId = :entityId', { entityId: params.entityId })
      .andWhere('asset.deletedAt IS NULL')
      .orderBy('link.isPrimary', 'DESC')
      .addOrderBy('link.sortOrder', 'ASC')
      .addOrderBy('asset.createdAt', 'DESC');

    if (params.usageType) {
      qb.andWhere('link.usageType = :usageType', {
        usageType: params.usageType,
      });
    }
    applyMultimediaLinkAttributeScope(qb, params.attributeId);

    const links = await qb.getMany();

    const assets = links.map((link) => {
      const asset = link.asset;
      return Object.assign(asset, {
        isPrimary: link.isPrimary,
        sortOrder: link.sortOrder,
        linkId: link.id,
      }) as MultimediaAsset & {
        isPrimary: boolean;
        sortOrder: number;
        linkId: string;
      };
    });
    await this.attachVariants(assets);
    return assets;
  }

  async reorderLinksForEntity(params: {
    entityType: string;
    entityId: string;
    assetIds: string[];
    usageType?: string;
    attributeId?: string | null;
  }): Promise<void> {
    const usageType = params.usageType ?? 'default';
    const qb = this.linkRepository
      .createQueryBuilder('link')
      .where('link.entityType = :entityType', { entityType: params.entityType })
      .andWhere('link.entityId = :entityId', { entityId: params.entityId })
      .andWhere('link.usageType = :usageType', { usageType });
    applyMultimediaLinkAttributeScope(qb, params.attributeId);

    const links = await qb.getMany();
    const linkByAssetId = new Map(links.map((l) => [l.assetId, l]));

    if (params.assetIds.length !== links.length) {
      throw new BadRequestException(
        'La lista de assets debe incluir exactamente los archivos vinculados a la entidad',
      );
    }

    for (const assetId of params.assetIds) {
      if (!linkByAssetId.has(assetId)) {
        throw new BadRequestException(
          `El asset ${assetId} no está vinculado a esta entidad`,
        );
      }
    }

    await this.linkRepository.manager.transaction(async (em) => {
      for (let i = 0; i < params.assetIds.length; i++) {
        const link = linkByAssetId.get(params.assetIds[i]);
        if (!link) {
          continue;
        }
        await em.update(MultimediaLink, { id: link.id }, { sortOrder: i });
      }
    });
  }

  async setPrimaryAssetForEntity(params: {
    assetId: string;
    entityType: string;
    entityId: string;
    attributeId?: string | null;
  }): Promise<void> {
    const scopeQb = this.linkRepository
      .createQueryBuilder('link')
      .where('link.assetId = :assetId', { assetId: params.assetId })
      .andWhere('link.entityType = :entityType', { entityType: params.entityType })
      .andWhere('link.entityId = :entityId', { entityId: params.entityId });
    applyMultimediaLinkAttributeScope(scopeQb, params.attributeId);

    const link = await scopeQb.getOne();

    if (!link) {
      throw new NotFoundException('Enlace de multimedia no encontrado');
    }

    const { usageType } = link;
    const attributeId = link.attributeId ?? null;

    await this.linkRepository.manager.transaction(async (em) => {
      const clearQb = em
        .createQueryBuilder()
        .update(MultimediaLink)
        .set({ isPrimary: false })
        .where('entityType = :et', { et: params.entityType })
        .andWhere('entityId = :eid', { eid: params.entityId })
        .andWhere('usageType = :ut', { ut: usageType });
      if (attributeId) {
        clearQb.andWhere('attribute_id = :aid', { aid: attributeId });
      } else {
        clearQb.andWhere('attribute_id IS NULL');
      }
      await clearQb.execute();

      await em
        .createQueryBuilder()
        .update(MultimediaLink)
        .set({ isPrimary: true })
        .where('id = :id', { id: link.id })
        .execute();
    });
  }

  async listAssetsByEntityIds(params: {
    entityType: string;
    entityIds: string[];
    usageType?: string;
    attributeId?: string | null;
    attributeScope?: 'general' | 'all';
  }): Promise<Record<string, MultimediaAsset[]>> {
    const unique = [...new Set(params.entityIds.filter((id) => Boolean(id?.trim())))];
    if (unique.length === 0) {
      return {};
    }
    const qb = this.linkRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.asset', 'asset')
      .where('link.entityType = :entityType', { entityType: params.entityType })
      .andWhere('link.entityId IN (:...entityIds)', { entityIds: unique })
      .andWhere('asset.deletedAt IS NULL')
      .orderBy('link.entityId', 'ASC')
      .addOrderBy(
        'CASE WHEN link.attributeId IS NULL THEN 0 ELSE 1 END',
        'ASC',
      )
      .addOrderBy('link.isPrimary', 'DESC')
      .addOrderBy('link.sortOrder', 'ASC')
      .addOrderBy('asset.createdAt', 'DESC');
    if (params.usageType) {
      qb.andWhere('link.usageType = :usageType', {
        usageType: params.usageType,
      });
    }
    applyMultimediaLinkAttributeScope(
      qb,
      params.attributeId,
      'link',
      params.attributeScope ?? 'general',
    );

    const links = await qb.getMany();
    const byEntity: Record<string, MultimediaAsset[]> = {};
    const allAssets: MultimediaAsset[] = [];
    for (const link of links) {
      const eid = link.entityId;
      const asset = link.asset;
      if (!asset) {
        continue;
      }
      if (!byEntity[eid]) {
        byEntity[eid] = [];
      }
      const seen = byEntity[eid].some((a) => a.id === asset.id);
      if (!seen) {
        byEntity[eid].push(asset);
        allAssets.push(asset);
      }
    }
    await this.attachVariants(allAssets);
    return byEntity;
  }

  countLinksForAsset(assetId: string): Promise<number> {
    return this.linkRepository.count({ where: { assetId } });
  }

  async removeAllLinksForAsset(assetId: string): Promise<void> {
    await this.linkRepository.delete({ assetId });
  }
}