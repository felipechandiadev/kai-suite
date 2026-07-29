import { SharpProcessorService } from '../../application/media-optimization/sharp-processor.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as (input?: Buffer | string | object) => import('sharp').Sharp;

describe('SharpProcessorService', () => {
  const processor = new SharpProcessorService();

  async function tinyPng(): Promise<Buffer> {
    return sharp({
      create: {
        width: 32,
        height: 24,
        channels: 3,
        background: { r: 20, g: 40, b: 60 },
      },
    })
      .png()
      .toBuffer();
  }

  it('reads metadata', async () => {
    const buf = await tinyPng();
    const meta = await processor.readMetadata(buf);
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(24);
  });

  it('processes cover webp variant', async () => {
    const buf = await tinyPng();
    const out = await processor.processVariant(
      buf,
      {
        variantType: 'thumb',
        width: 16,
        height: 12,
        fit: 'cover',
        formats: [{ format: 'webp', quality: 80 }],
      },
      'webp',
      80,
    );
    expect(out.format).toBe('webp');
    expect(out.width).toBe(16);
    expect(out.height).toBe(12);
    expect(out.buffer.length).toBeGreaterThan(0);
  });
});
