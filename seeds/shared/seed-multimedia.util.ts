import { createHash } from 'crypto';
import { access } from 'fs/promises';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { MultimediaAsset } from '@modules/multimedia/domain/multimedia-asset.entity';
import { MultimediaLink } from '@modules/multimedia/domain/multimedia-link.entity';
import { EShopHeroSlide } from '@modules/e-shop/domain/e-shop-hero-slide.entity';
import { EShopTestimonial } from '@modules/e-shop/domain/e-shop-testimonial.entity';
import { ESHOP_HERO_SLIDE_MULTIMEDIA_ENTITY } from '@modules/e-shop/domain/e-shop-hero-slide.constants';
import { ESHOP_TESTIMONIAL_MULTIMEDIA_ENTITY } from '@modules/e-shop/domain/e-shop-testimonial.constants';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { IsNull } from 'typeorm';
import {
  SEED_DEV_PRODUCT_IMAGES,
  SEED_DEV_VARIANT_IMAGES,
} from '../demo/catalog-images';
import {
  SEED_DEV_ESHOP_HERO_SLIDES,
  type SeedDevEshopHeroSlideDef,
} from '../demo/eshop-hero-slides';
import {
  SEED_DEV_ESHOP_TESTIMONIALS,
  type SeedDevEshopTestimonialDef,
} from '../demo/eshop-testimonials';
import type { StorageProviderPort } from '@modules/multimedia/application/ports/storage-provider.port';
import type { INestApplicationContext } from '@nestjs/common';
import { AppConfigService } from '../../backend/src/config/config.service';
import { CloudflareR2Adapter } from '@modules/multimedia/infrastructure/adapters/cloudflare-r2.adapter';
import { LocalStorageAdapter } from '@modules/multimedia/infrastructure/adapters/local-storage.adapter';
import { MultimediaIngestService } from '@modules/multimedia/application/media-optimization/multimedia-ingest.service';

export type SeedMultimediaStorageParams = {
  storage: StorageProviderPort;
  storageProvider: 'local' | 'cloudflare';
  seedImages: boolean;
  ingest?: MultimediaIngestService;
};

/** `SEED_SKIP_IMAGES=true` omite logo, catálogo, hero y testimonials. */
export function shouldSeedImages(): boolean {
  return process.env.SEED_SKIP_IMAGES !== 'true';
}

/**
 * Wipe R2 solo con `SEED_WIPE_R2=true` y bucket en allowlist
 * (default `kai-demo` / `*-demo` / `demo-*`, más `SEED_R2_WIPE_ALLOWLIST`).
 */
export function shouldWipeR2Bucket(): boolean {
  return process.env.SEED_WIPE_R2 === 'true';
}

export function isR2WipeBucketAllowed(bucketName: string): boolean {
  const fromEnv = (process.env.SEED_R2_WIPE_ALLOWLIST ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set(['kai-demo', ...fromEnv]);
  if (allowed.has(bucketName)) {
    return true;
  }
  return /(-demo$|^demo-)/i.test(bucketName);
}

export function resolveSeedMultimediaStorage(
  app: INestApplicationContext,
  configService: AppConfigService,
): SeedMultimediaStorageParams {
  const storageProvider = configService.storage.strategy as 'local' | 'cloudflare';
  const storage =
    storageProvider === 'cloudflare'
      ? app.get(CloudflareR2Adapter)
      : app.get(LocalStorageAdapter);

  let ingest: MultimediaIngestService | undefined;
  try {
    ingest = app.get(MultimediaIngestService);
  } catch {
    ingest = undefined;
  }

  return {
    storage,
    storageProvider,
    seedImages: shouldSeedImages(),
    ingest,
  };
}

/**
 * Limpia storage antes del seed:
 * - local: siempre vacía `backend/public` (como antes).
 * - cloudflare: vacía el bucket solo si `SEED_WIPE_R2=true` y el nombre está allowlisted.
 */
export async function cleanSeedMultimediaStorage(params: {
  app: INestApplicationContext;
  configService: AppConfigService;
}): Promise<void> {
  const { configService, app } = params;
  const strategy = configService.storage.strategy;

  if (strategy === 'local') {
    await cleanBackendPublicFolder(configService.storage.local.path);
    console.log(
      `✅ Carpeta public del backend limpiada (${path.dirname(path.resolve(configService.storage.local.path))})`,
    );
    return;
  }

  const bucketName = configService.storage.r2.bucketName;
  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME no configurado (STORAGE_STRATEGY=cloudflare)');
  }

  if (!shouldWipeR2Bucket()) {
    console.log(
      `ℹ️  Multimedia seed R2 (${bucketName}): sin wipe (SEED_WIPE_R2≠true). Objetos huérfanos pueden acumularse.`,
    );
    return;
  }

  if (!isR2WipeBucketAllowed(bucketName)) {
    throw new Error(
      `SEED_WIPE_R2=true rechazado: bucket «${bucketName}» no está en allowlist ` +
        `(kai-demo / *-demo / demo-* o SEED_R2_WIPE_ALLOWLIST).`,
    );
  }

  const r2 = app.get(CloudflareR2Adapter);
  const { deleted } = await r2.emptyBucket();
  console.log(`✅ Bucket R2 vaciado (${bucketName}): ${deleted} objeto(s) eliminado(s)`);
}

/** Raíz de archivos estáticos versionados para el seed demo (`seeds/demo/assets`). */
export const SEED_ASSETS_ROOT = path.join(__dirname, '../demo/assets');

/** Logo de empresa demo (copiado desde `pwa-admin/public/logo.png`). */
export const SEED_COMPANY_LOGO_FILE = 'company/logo.png';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/**
 * Vacía `backend/public` y recrea el directorio de uploads (`LOCAL_STORAGE_PATH`).
 * Se ejecuta en cada corrida del seed para evitar archivos huérfanos.
 */
export async function cleanBackendPublicFolder(localStoragePath: string): Promise<void> {
  const uploadsDir = path.resolve(localStoragePath);
  const publicDir = path.dirname(uploadsDir);
  await fs.rm(publicDir, { recursive: true, force: true });
  await fs.mkdir(uploadsDir, { recursive: true });
}

export async function seedMultimediaFileLink(params: {
  assetRepo: Repository<MultimediaAsset>;
  linkRepo: Repository<MultimediaLink>;
  storage: StorageProviderPort;
  storageProvider: 'local' | 'cloudflare';
  sourceRelativePath: string;
  entityType: string;
  entityId: string;
  usageType?: string;
  isPrimary?: boolean;
  attributeId?: string | null;
  assetsRoot?: string;
  /** Prefer shared ingest (Sharp + variants). Required for compression. */
  ingest?: MultimediaIngestService;
}): Promise<MultimediaAsset> {
  const root = params.assetsRoot ?? SEED_ASSETS_ROOT;
  const sourcePath = path.join(root, params.sourceRelativePath);
  const buffer = await fs.readFile(sourcePath);
  const ext = path.extname(sourcePath).toLowerCase();
  const mimeType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const originalName = path.basename(sourcePath);

  if (params.ingest) {
    const asset = await params.ingest.ingest({
      file: {
        buffer,
        originalName,
        mimeType,
        size: buffer.length,
      },
      entityType: params.entityType,
      entityId: params.entityId,
      usageType: params.usageType ?? 'default',
      isPrimary: params.isPrimary ?? true,
      attributeId: params.attributeId,
    });
    const meta = (asset.metadata ?? {}) as Record<string, unknown>;
    const originalSize = Number(meta.originalSize ?? asset.size) || buffer.length;
    const displaySize = Number(meta.displaySize ?? asset.size) || asset.size;
    if (asset.optimizationStatus === 'ready') {
      console.log(
        `   ↳ ${originalName}: ${asset.optimizationStatus} ` +
          `${originalSize} → display ~${displaySize} B` +
          (meta.compressionRatio != null ? ` (ratio ${meta.compressionRatio})` : ''),
      );
    }
    return asset;
  }

  const stored = await params.storage.upload({
    buffer,
    originalName,
    mimeType,
  });
  const checksum = createHash('sha256').update(buffer).digest('hex');

  const asset = await params.assetRepo.save(
    params.assetRepo.create({
      originalName,
      storedName: stored.storedName,
      storageKey: stored.storageKey,
      publicUrl: stored.publicUrl,
      mimeType,
      kind: mimeType.startsWith('image/') ? 'image' : 'document',
      storageProvider: params.storageProvider,
      size: buffer.length,
      checksum,
      status: 'active',
      optimizationStatus: 'skipped',
    }),
  );

  await params.linkRepo.save(
    params.linkRepo.create({
      assetId: asset.id,
      entityType: params.entityType,
      entityId: params.entityId,
      usageType: params.usageType ?? 'default',
      sortOrder: 0,
      isPrimary: params.isPrimary ?? true,
      attributeId: params.attributeId ?? null,
    }),
  );

  return asset;
}

async function seedAssetFileExists(
  relativePath: string,
  assetsRoot: string = SEED_ASSETS_ROOT,
): Promise<boolean> {
  try {
    await access(path.join(assetsRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function seedDevEshopHeroSlides(params: {
  heroSlideRepo: Repository<EShopHeroSlide>;
  assetRepo: Repository<MultimediaAsset>;
  linkRepo: Repository<MultimediaLink>;
  companyId: string;
} & SeedMultimediaStorageParams): Promise<void> {
  await params.heroSlideRepo.delete({ companyId: params.companyId });

  let linkedImages = 0;
  for (const def of SEED_DEV_ESHOP_HERO_SLIDES) {
    const slide = await params.heroSlideRepo.save(
      params.heroSlideRepo.create(mapHeroSlideDef(params.companyId, def)),
    );

    if (!params.seedImages || !def.imageFile) {
      continue;
    }
    if (!(await seedAssetFileExists(def.imageFile))) {
      console.warn(
        `⚠️ Seed dev: imagen hero «${def.key}» no encontrada (${def.imageFile}); slide sin imagen`,
      );
      continue;
    }

    await seedMultimediaFileLink({
      assetRepo: params.assetRepo,
      linkRepo: params.linkRepo,
      storage: params.storage,
      storageProvider: params.storageProvider,
      ingest: params.ingest,
      sourceRelativePath: def.imageFile,
      entityType: ESHOP_HERO_SLIDE_MULTIMEDIA_ENTITY,
      entityId: slide.id,
      usageType: 'default',
      isPrimary: true,
    });
    linkedImages += 1;
  }

  console.log(
    `✅ Hero slides KaiStore: ${SEED_DEV_ESHOP_HERO_SLIDES.length} slide(s), ${linkedImages} con imagen`,
  );
}

function mapTestimonialDef(companyId: string, def: SeedDevEshopTestimonialDef) {
  return {
    companyId,
    clientName: def.clientName,
    rating: def.rating,
    message: def.message,
    isActive: true,
    sortOrder: def.sortOrder,
  };
}

export async function seedDevEshopTestimonials(params: {
  testimonialRepo: Repository<EShopTestimonial>;
  assetRepo: Repository<MultimediaAsset>;
  linkRepo: Repository<MultimediaLink>;
  companyId: string;
} & SeedMultimediaStorageParams): Promise<void> {
  await params.testimonialRepo.delete({ companyId: params.companyId });

  let linkedImages = 0;
  for (const def of SEED_DEV_ESHOP_TESTIMONIALS) {
    const row = await params.testimonialRepo.save(
      params.testimonialRepo.create(mapTestimonialDef(params.companyId, def)),
    );

    if (!params.seedImages || !def.imageFile) {
      continue;
    }
    if (!(await seedAssetFileExists(def.imageFile))) {
      console.warn(
        `⚠️ Seed dev: avatar testimonio «${def.key}» no encontrado (${def.imageFile}); sin imagen`,
      );
      continue;
    }

    await seedMultimediaFileLink({
      assetRepo: params.assetRepo,
      linkRepo: params.linkRepo,
      storage: params.storage,
      storageProvider: params.storageProvider,
      ingest: params.ingest,
      sourceRelativePath: def.imageFile,
      entityType: ESHOP_TESTIMONIAL_MULTIMEDIA_ENTITY,
      entityId: row.id,
      usageType: 'default',
      isPrimary: true,
    });
    linkedImages += 1;
  }

  console.log(
    `✅ Testimonios eShop: ${SEED_DEV_ESHOP_TESTIMONIALS.length} registro(s), ${linkedImages} con avatar`,
  );
}

export async function seedDevCatalogMultimedia(params: {
  productRepo: Repository<Product>;
  variantRepo: Repository<ProductVariant>;
  attributeRepo: Repository<Attribute>;
  assetRepo: Repository<MultimediaAsset>;
  linkRepo: Repository<MultimediaLink>;
  companyId: string;
} & SeedMultimediaStorageParams): Promise<void> {
  if (!params.seedImages) {
    console.log('⏭️ Imágenes catálogo seed omitidas');
    return;
  }

  let linkedProducts = 0;
  for (const def of SEED_DEV_PRODUCT_IMAGES) {
    const product = await params.productRepo.findOne({
      where: { name: def.productName, companyId: params.companyId },
    });
    if (!product) {
      console.warn(
        `⚠️ Seed dev: producto «${def.productName}» no encontrado; imagen omitida`,
      );
      continue;
    }
    if (!(await seedAssetFileExists(def.imageFile))) {
      console.warn(
        `⚠️ Seed dev: imagen producto «${def.productName}» no encontrada (${def.imageFile})`,
      );
      continue;
    }

    await params.linkRepo.delete({ entityType: 'product', entityId: product.id });
    await seedMultimediaFileLink({
      assetRepo: params.assetRepo,
      linkRepo: params.linkRepo,
      storage: params.storage,
      storageProvider: params.storageProvider,
      ingest: params.ingest,
      sourceRelativePath: def.imageFile,
      entityType: 'product',
      entityId: product.id,
      usageType: 'primary-image',
      isPrimary: true,
    });
    linkedProducts += 1;
  }

  let linkedVariants = 0;
  await params.linkRepo.delete({
    entityType: 'product-variant',
    companyId: params.companyId,
    attributeId: IsNull(),
  });

  const colorAttribute = await params.attributeRepo.findOne({
    where: { companyId: params.companyId, name: 'Color' },
  });
  if (!colorAttribute && SEED_DEV_VARIANT_IMAGES.length > 0) {
    console.warn('⚠️ Seed dev: atributo Color no encontrado; imágenes de variantes omitidas');
  }

  for (const def of SEED_DEV_VARIANT_IMAGES) {
    if (!colorAttribute) {
      break;
    }
    const variant = await params.variantRepo.findOne({
      where: { sku: def.sku, companyId: params.companyId },
    });
    if (!variant) {
      console.warn(`⚠️ Seed dev: variante SKU «${def.sku}» no encontrada; imagen omitida`);
      continue;
    }
    if (!(await seedAssetFileExists(def.imageFile))) {
      console.warn(
        `⚠️ Seed dev: imagen variante «${def.sku}» no encontrada (${def.imageFile})`,
      );
      continue;
    }

    await params.linkRepo.delete({
      entityType: 'product-variant',
      entityId: variant.id,
      attributeId: colorAttribute.id,
    });
    await seedMultimediaFileLink({
      assetRepo: params.assetRepo,
      linkRepo: params.linkRepo,
      storage: params.storage,
      storageProvider: params.storageProvider,
      ingest: params.ingest,
      sourceRelativePath: def.imageFile,
      entityType: 'product-variant',
      entityId: variant.id,
      usageType: 'default',
      isPrimary: false,
      attributeId: colorAttribute.id,
    });
    linkedVariants += 1;
  }

  console.log(
    `✅ Imágenes catálogo: ${linkedProducts}/${SEED_DEV_PRODUCT_IMAGES.length} producto(s), ${linkedVariants}/${SEED_DEV_VARIANT_IMAGES.length} variante(s)`,
  );
}

function mapHeroSlideDef(companyId: string, def: SeedDevEshopHeroSlideDef) {
  return {
    companyId,
    title: def.title,
    subtitle: def.subtitle,
    ctaLabel: def.ctaLabel,
    ctaHref: def.ctaHref,
    ctaStyle: def.ctaStyle,
    isActive: def.isActive,
    sortOrder: def.sortOrder,
    textAlign: def.textAlign,
    overlayOpacity: def.overlayOpacity,
    textColor: def.textColor,
  };
}

type GenericHeroSlideDef = {
  key: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  ctaStyle: SeedDevEshopHeroSlideDef['ctaStyle'];
  textAlign: SeedDevEshopHeroSlideDef['textAlign'];
  overlayOpacity: number;
  textColor: string | null;
  isActive: boolean;
  sortOrder: number;
  imageFile?: string;
};

type GenericTestimonialDef = {
  key: string;
  clientName: string;
  rating: number;
  message: string;
  sortOrder: number;
  imageFile?: string;
};

export async function seedEshopHeroSlidesFromDefs(params: {
  heroSlideRepo: Repository<EShopHeroSlide>;
  assetRepo: Repository<MultimediaAsset>;
  linkRepo: Repository<MultimediaLink>;
  companyId: string;
  slides: readonly GenericHeroSlideDef[];
  assetsRoot: string;
  logLabel: string;
} & SeedMultimediaStorageParams): Promise<void> {
  await params.heroSlideRepo.delete({ companyId: params.companyId });

  let linkedImages = 0;
  for (const def of params.slides) {
    const slide = await params.heroSlideRepo.save(
      params.heroSlideRepo.create(mapHeroSlideDef(params.companyId, def)),
    );

    if (!params.seedImages || !def.imageFile) {
      continue;
    }
    if (!(await seedAssetFileExists(def.imageFile, params.assetsRoot))) {
      console.warn(
        `⚠️ ${params.logLabel}: imagen hero «${def.key}» no encontrada (${def.imageFile}); slide sin imagen`,
      );
      continue;
    }

    await seedMultimediaFileLink({
      assetRepo: params.assetRepo,
      linkRepo: params.linkRepo,
      storage: params.storage,
      storageProvider: params.storageProvider,
      ingest: params.ingest,
      sourceRelativePath: def.imageFile,
      entityType: ESHOP_HERO_SLIDE_MULTIMEDIA_ENTITY,
      entityId: slide.id,
      usageType: 'default',
      isPrimary: true,
      assetsRoot: params.assetsRoot,
    });
    linkedImages += 1;
  }

  console.log(
    `✅ Hero slides ${params.logLabel}: ${params.slides.length} slide(s), ${linkedImages} con imagen`,
  );
}

export async function seedEshopTestimonialsFromDefs(params: {
  testimonialRepo: Repository<EShopTestimonial>;
  assetRepo: Repository<MultimediaAsset>;
  linkRepo: Repository<MultimediaLink>;
  companyId: string;
  testimonials: readonly GenericTestimonialDef[];
  assetsRoot: string;
  logLabel: string;
} & SeedMultimediaStorageParams): Promise<void> {
  await params.testimonialRepo.delete({ companyId: params.companyId });

  let linkedImages = 0;
  for (const def of params.testimonials) {
    const row = await params.testimonialRepo.save(
      params.testimonialRepo.create(mapTestimonialDef(params.companyId, def)),
    );

    if (!params.seedImages || !def.imageFile) {
      continue;
    }
    if (!(await seedAssetFileExists(def.imageFile, params.assetsRoot))) {
      console.warn(
        `⚠️ ${params.logLabel}: avatar testimonio «${def.key}» no encontrado (${def.imageFile}); sin imagen`,
      );
      continue;
    }

    await seedMultimediaFileLink({
      assetRepo: params.assetRepo,
      linkRepo: params.linkRepo,
      storage: params.storage,
      storageProvider: params.storageProvider,
      ingest: params.ingest,
      sourceRelativePath: def.imageFile,
      entityType: ESHOP_TESTIMONIAL_MULTIMEDIA_ENTITY,
      entityId: row.id,
      usageType: 'default',
      isPrimary: true,
      assetsRoot: params.assetsRoot,
    });
    linkedImages += 1;
  }

  console.log(
    `✅ Testimonios ${params.logLabel}: ${params.testimonials.length} registro(s), ${linkedImages} con avatar`,
  );
}

export async function seedCatalogMultimediaByProductName(params: {
  productRepo: Repository<Product>;
  assetRepo: Repository<MultimediaAsset>;
  linkRepo: Repository<MultimediaLink>;
  companyId: string;
  images: readonly { productName: string; imageFile: string }[];
  assetsRoot: string;
  logLabel: string;
} & SeedMultimediaStorageParams): Promise<void> {
  if (!params.seedImages) {
    console.log(`⏭️ Imágenes catálogo ${params.logLabel} omitidas`);
    return;
  }

  let linkedProducts = 0;
  for (const def of params.images) {
    const product = await params.productRepo.findOne({
      where: { name: def.productName, companyId: params.companyId },
    });
    if (!product) {
      console.warn(
        `⚠️ ${params.logLabel}: producto «${def.productName}» no encontrado; imagen omitida`,
      );
      continue;
    }
    if (!(await seedAssetFileExists(def.imageFile, params.assetsRoot))) {
      console.warn(
        `⚠️ ${params.logLabel}: imagen «${def.productName}» no encontrada (${def.imageFile})`,
      );
      continue;
    }

    await params.linkRepo.delete({ entityType: 'product', entityId: product.id });
    await seedMultimediaFileLink({
      assetRepo: params.assetRepo,
      linkRepo: params.linkRepo,
      storage: params.storage,
      storageProvider: params.storageProvider,
      ingest: params.ingest,
      sourceRelativePath: def.imageFile,
      entityType: 'product',
      entityId: product.id,
      usageType: 'primary-image',
      isPrimary: true,
      assetsRoot: params.assetsRoot,
    });
    linkedProducts += 1;
  }

  console.log(
    `✅ Imágenes catálogo ${params.logLabel}: ${linkedProducts}/${params.images.length} producto(s)`,
  );
}
