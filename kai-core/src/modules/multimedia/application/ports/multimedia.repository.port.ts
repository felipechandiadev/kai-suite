import { MultimediaAsset } from '../../domain/multimedia-asset.entity';
import { MultimediaLink } from '../../domain/multimedia-link.entity';
import { MultimediaVariant } from '../../domain/multimedia-variant.entity';

export interface CreateMultimediaAssetPayload {
  id?: string;
  companyId?: string;
  originalName: string;
  storedName: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  kind: 'image' | 'document' | 'other';
  storageProvider: 'local' | 'cloudflare';
  size: number;
  checksum?: string;
  metadata?: Record<string, unknown> | null;
  optimizationStatus?: 'skipped' | 'ready' | 'failed';
  width?: number | null;
  height?: number | null;
}

export interface CreateMultimediaVariantPayload {
  variantType: string;
  format: 'webp' | 'jpeg' | 'png';
  width: number;
  height: number;
  size: number;
  storageKey: string;
  publicUrl: string;
  quality?: number | null;
}

export interface CreateMultimediaLinkPayload {
  assetId: string;
  entityType: string;
  entityId: string;
  usageType: string;
  attributeId?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface MultimediaRepositoryPort {
  createAsset(payload: CreateMultimediaAssetPayload): Promise<MultimediaAsset>;
  updateAsset(
    id: string,
    patch: Partial<
      Pick<
        MultimediaAsset,
        'publicUrl' | 'optimizationStatus' | 'metadata' | 'width' | 'height'
      >
    >,
  ): Promise<void>;
  createVariants(
    assetId: string,
    variants: CreateMultimediaVariantPayload[],
  ): Promise<MultimediaVariant[]>;
  listVariantsByAssetId(assetId: string): Promise<MultimediaVariant[]>;
  findAssetById(id: string): Promise<MultimediaAsset | null>;
  findAssetByStorageKey(storageKey: string): Promise<MultimediaAsset | null>;
  deleteAsset(id: string): Promise<void>;
  createLink(payload: CreateMultimediaLinkPayload): Promise<MultimediaLink>;
  removeLink(params: {
    assetId: string;
    entityType: string;
    entityId: string;
    usageType?: string;
    attributeId?: string | null;
  }): Promise<void>;
  listAssetsByEntity(params: {
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
  >;
  reorderLinksForEntity(params: {
    entityType: string;
    entityId: string;
    assetIds: string[];
    usageType?: string;
    attributeId?: string | null;
  }): Promise<void>;
  setPrimaryAssetForEntity(params: {
    assetId: string;
    entityType: string;
    entityId: string;
    attributeId?: string | null;
  }): Promise<void>;
  listAssetsByEntityIds(params: {
    entityType: string;
    entityIds: string[];
    usageType?: string;
    attributeId?: string | null;
    attributeScope?: 'general' | 'all';
  }): Promise<Record<string, MultimediaAsset[]>>;
  countLinksForAsset(assetId: string): Promise<number>;
  removeAllLinksForAsset(assetId: string): Promise<void>;
}

export const MULTIMEDIA_REPOSITORY = 'MultimediaRepositoryPort';
