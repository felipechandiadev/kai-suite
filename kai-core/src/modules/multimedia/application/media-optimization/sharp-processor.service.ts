import { Injectable, Logger } from '@nestjs/common';
import type {
  ImageEncodeFormat,
  ImageVariantSpec,
} from './image-optimization.strategy';

// sharp is CJS; typings for 0.35+ are awkward with Nest/tsc — cast at boundary.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as (input?: Buffer | string | object) => import('sharp').Sharp;

export type ProcessedVariantResult = {
  variantType: string;
  format: ImageEncodeFormat;
  buffer: Buffer;
  width: number;
  height: number;
  quality: number;
  mimeType: string;
};

const MIME_BY_FORMAT: Record<ImageEncodeFormat, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

@Injectable()
export class SharpProcessorService {
  private readonly logger = new Logger(SharpProcessorService.name);

  async readMetadata(
    buffer: Buffer,
  ): Promise<{ width: number | null; height: number | null }> {
    const meta = await sharp(buffer).metadata();
    return {
      width: meta.width ?? null,
      height: meta.height ?? null,
    };
  }

  /**
   * Downscale input if either edge exceeds maxInputPx (inside, no enlarge).
   */
  async prepareInput(
    buffer: Buffer,
    maxInputPx: number,
  ): Promise<Buffer> {
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h || (w <= maxInputPx && h <= maxInputPx)) {
      return buffer;
    }
    return sharp(buffer)
      .resize({
        width: maxInputPx,
        height: maxInputPx,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
  }

  async processVariant(
    input: Buffer,
    spec: ImageVariantSpec,
    format: ImageEncodeFormat,
    baseQuality: number,
  ): Promise<ProcessedVariantResult> {
    let quality = baseQuality;
    let effort = 4;
    if (input.length > 1_000_000) {
      quality = Math.max(40, quality - 5);
      effort = 3;
    }

    let pipeline = sharp(input).resize({
      width: spec.width,
      height: spec.height,
      fit: spec.fit,
      position: 'centre',
      withoutEnlargement: spec.withoutEnlargement ?? false,
    });

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality, effort });
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      variantType: spec.variantType,
      format,
      buffer: data,
      width: info.width,
      height: info.height,
      quality,
      mimeType: MIME_BY_FORMAT[format],
    };
  }

  async processAll(
    input: Buffer,
    specs: ImageVariantSpec[],
  ): Promise<ProcessedVariantResult[]> {
    const out: ProcessedVariantResult[] = [];
    for (const spec of specs) {
      for (const fmt of spec.formats) {
        try {
          out.push(
            await this.processVariant(input, spec, fmt.format, fmt.quality),
          );
        } catch (err) {
          this.logger.warn(
            `Sharp variant ${spec.variantType}/${fmt.format} failed: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    }
    return out;
  }
}
