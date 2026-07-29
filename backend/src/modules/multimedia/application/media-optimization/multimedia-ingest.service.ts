import { Injectable, Logger, Inject } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import * as path from 'path';
import { TenantContext } from '@common/tenant';
import { AppConfigService } from '../../../../config/config.service';
import { MultimediaAsset } from '../../domain/multimedia-asset.entity';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../ports/multimedia.repository.port';
import {
  STORAGE_PROVIDER,
  StorageProviderPort,
} from '../ports/storage-provider.port';
import { ImageStrategyRegistry } from './image-strategy.registry';
import { SharpProcessorService } from './sharp-processor.service';
import { resolveDisplayPublicUrl } from '../utils/resolve-multimedia-urls.util';

export type MultimediaIngestFile = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
};

export type MultimediaIngestParams = {
  file: MultimediaIngestFile;
  entityType?: string;
  entityId?: string;
  usageType?: string;
  isPrimary?: boolean;
  metadata?: Record<string, unknown> | null;
  attributeId?: string | null;
  /** Override tenant when ALS is unavailable (rare). */
  companyId?: string | null;
};

const OPTIMIZABLE_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class MultimediaIngestService {
  private readonly logger = new Logger(MultimediaIngestService.name);

  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProviderPort,
    private readonly configService: AppConfigService,
    private readonly strategyRegistry: ImageStrategyRegistry,
    private readonly sharpProcessor: SharpProcessorService,
  ) {}

  async ingest(params: MultimediaIngestParams): Promise<MultimediaAsset> {
    const { file } = params;
    const { maxFileSize, allowedMimeTypes, strategy, optimizeEnabled, optimizeMaxInputPx } =
      this.configService.storage;

    if (file.size > maxFileSize) {
      throw new Error('File exceeds maximum allowed size');
    }
    if (!allowedMimeTypes.includes(file.mimeType)) {
      throw new Error('File MIME type is not allowed');
    }

    const companyId =
      params.companyId?.trim() ||
      TenantContext.getCompanyId() ||
      '00000000-0000-0000-0000-000000000000';
    const assetId = randomUUID();
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const isImage = file.mimeType.startsWith('image/');
    const strategyDef = this.strategyRegistry.resolve(params.entityType);
    const shouldOptimize =
      optimizeEnabled &&
      isImage &&
      OPTIMIZABLE_IMAGE_MIME.has(file.mimeType.toLowerCase()) &&
      Boolean(strategyDef);

    if (!shouldOptimize || !strategyDef) {
      return this.ingestPlain({
        params,
        assetId,
        companyId,
        checksum,
        storageStrategy: strategy,
        optimizationStatus: 'skipped',
        width: null,
        height: null,
        metadataExtra: {
          strategy: strategyDef?.name ?? null,
          optimizeSkippedReason: !optimizeEnabled
            ? 'disabled'
            : !isImage
              ? 'not-image'
              : !OPTIMIZABLE_IMAGE_MIME.has(file.mimeType.toLowerCase())
                ? 'unsupported-mime'
                : 'no-strategy',
        },
      });
    }

    const uploadedKeys: string[] = [];
    try {
      const meta = await this.sharpProcessor.readMetadata(file.buffer);
      const prepared = await this.sharpProcessor.prepareInput(
        file.buffer,
        optimizeMaxInputPx,
      );
      const ext = path.extname(file.originalName) || this.extFromMime(file.mimeType);
      const originalKey = `${companyId}/${assetId}/original${ext}`;
      const originalStored = await this.storageProvider.upload({
        buffer: file.buffer,
        originalName: file.originalName,
        mimeType: file.mimeType,
        storageKey: originalKey,
        metadata: params.metadata ?? undefined,
      });
      uploadedKeys.push(originalStored.storageKey);

      const processed = await this.sharpProcessor.processAll(
        prepared,
        strategyDef.variants,
      );
      if (processed.length === 0) {
        throw new Error('No variants produced');
      }

      const variantRows: Array<{
        variantType: string;
        format: 'webp' | 'jpeg' | 'png';
        width: number;
        height: number;
        size: number;
        storageKey: string;
        publicUrl: string;
        quality: number;
      }> = [];

      for (const item of processed) {
        const variantKey = `${companyId}/${assetId}/v/${item.variantType}.${item.format}`;
        const stored = await this.storageProvider.upload({
          buffer: item.buffer,
          originalName: `${item.variantType}.${item.format}`,
          mimeType: item.mimeType,
          storageKey: variantKey,
        });
        uploadedKeys.push(stored.storageKey);
        variantRows.push({
          variantType: item.variantType,
          format: item.format,
          width: item.width,
          height: item.height,
          size: item.buffer.length,
          storageKey: stored.storageKey,
          publicUrl: stored.publicUrl,
          quality: item.quality,
        });
      }

      const displaySize =
        variantRows.find(
          (v) =>
            v.variantType === strategyDef.displayVariantType && v.format === 'webp',
        )?.size ??
        variantRows.find((v) => v.variantType === strategyDef.displayVariantType)
          ?.size ??
        variantRows[0]?.size ??
        file.size;

      const asset = await this.repository.createAsset({
        id: assetId,
        companyId,
        originalName: file.originalName,
        storedName: originalStored.storedName,
        storageKey: originalStored.storageKey,
        publicUrl: originalStored.publicUrl,
        mimeType: file.mimeType,
        kind: 'image',
        storageProvider: strategy,
        size: file.size,
        checksum,
        optimizationStatus: 'ready',
        width: meta.width,
        height: meta.height,
        metadata: {
          ...(params.metadata ?? {}),
          originalSize: file.size,
          displaySize,
          compressionRatio:
            file.size > 0 ? Number((displaySize / file.size).toFixed(4)) : null,
          strategy: strategyDef.name,
        },
      });

      const variants = await this.repository.createVariants(
        asset.id,
        variantRows,
      );
      asset.variants = variants;
      asset.publicUrl = resolveDisplayPublicUrl(
        asset,
        strategyDef.displayVariantType,
      );
      await this.repository.updateAsset(asset.id, {
        publicUrl: asset.publicUrl,
      });

      await this.maybeCreateLink(asset.id, params);
      return asset;
    } catch (err) {
      this.logger.warn(
        `Optimization failed for ${file.originalName}; falling back to plain upload: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      await this.compensateDeletes(uploadedKeys);
      return this.ingestPlain({
        params,
        assetId: randomUUID(),
        companyId,
        checksum,
        storageStrategy: strategy,
        optimizationStatus: 'failed',
        width: null,
        height: null,
        metadataExtra: {
          strategy: strategyDef.name,
          error: err instanceof Error ? err.message : String(err),
          originalSize: file.size,
        },
      });
    }
  }

  private async ingestPlain(args: {
    params: MultimediaIngestParams;
    assetId: string;
    companyId: string;
    checksum: string;
    storageStrategy: 'local' | 'cloudflare';
    optimizationStatus: 'skipped' | 'failed';
    width: number | null;
    height: number | null;
    metadataExtra: Record<string, unknown>;
  }): Promise<MultimediaAsset> {
    const { file } = args.params;
    const ext = path.extname(file.originalName) || this.extFromMime(file.mimeType);
    const storageKey = `${args.companyId}/${args.assetId}/original${ext}`;
    const uploadResult = await this.storageProvider.upload({
      buffer: file.buffer,
      originalName: file.originalName,
      mimeType: file.mimeType,
      storageKey,
      metadata: args.params.metadata ?? undefined,
    });

    const asset = await this.repository.createAsset({
      id: args.assetId,
      companyId: args.companyId,
      originalName: file.originalName,
      storedName: uploadResult.storedName,
      storageKey: uploadResult.storageKey,
      publicUrl: uploadResult.publicUrl,
      mimeType: file.mimeType,
      kind: file.mimeType.startsWith('image/') ? 'image' : 'document',
      storageProvider: args.storageStrategy,
      size: file.size,
      checksum: uploadResult.checksum ?? args.checksum,
      optimizationStatus: args.optimizationStatus,
      width: args.width,
      height: args.height,
      metadata: {
        ...(args.params.metadata ?? {}),
        ...args.metadataExtra,
      },
    });

    await this.maybeCreateLink(asset.id, args.params);
    return asset;
  }

  private async maybeCreateLink(
    assetId: string,
    params: MultimediaIngestParams,
  ): Promise<void> {
    if (!params.entityType || !params.entityId) return;
    await this.repository.createLink({
      assetId,
      entityType: params.entityType,
      entityId: params.entityId,
      usageType: params.usageType ?? 'default',
      isPrimary: params.isPrimary,
      metadata: params.metadata ?? null,
      attributeId: params.attributeId,
    });
  }

  private async compensateDeletes(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.storageProvider.delete(key);
      } catch (err) {
        this.logger.warn(
          `Compensate delete failed for ${key}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  private extFromMime(mime: string): string {
    switch (mime.toLowerCase()) {
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'application/pdf':
        return '.pdf';
      default:
        return '';
    }
  }
}
