import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { MultimediaAsset } from '../../domain/multimedia-asset.entity';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../ports/multimedia.repository.port';
import { MultimediaStorageRegistry } from './multimedia-storage.registry';

@Injectable()
export class MultimediaAssetPurgeService {
  private readonly logger = new Logger(MultimediaAssetPurgeService.name);

  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
    private readonly storageRegistry: MultimediaStorageRegistry,
  ) {}

  /**
   * Elimina binarios (original + variantes) en local/R2 y soft-delete del asset.
   */
  async purgeAsset(asset: MultimediaAsset): Promise<void> {
    const storage = this.storageRegistry.forProvider(asset.storageProvider);
    const variants =
      asset.variants ?? (await this.repository.listVariantsByAssetId(asset.id));
    const keys = [
      asset.storageKey,
      ...variants.map((v) => v.storageKey),
    ].filter(Boolean);

    for (const key of keys) {
      try {
        await storage.delete(key);
      } catch (err) {
        this.logger.warn(
          `No se pudo borrar el archivo «${key}» (${asset.storageProvider}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    await this.repository.deleteAsset(asset.id);
    this.logger.debug(`Multimedia asset purged: id=${asset.id} keys=${keys.length}`);
  }

  async purgeAssetById(assetId: string): Promise<void> {
    const asset = await this.repository.findAssetById(assetId);
    if (!asset) {
      throw new NotFoundException('Multimedia asset not found');
    }
    await this.purgeAsset(asset);
  }
}
