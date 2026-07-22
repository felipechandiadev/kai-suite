/** ROI horizontal centrado (~70% × ~35% del frame). */
export function computeBarcodeRoi(
  videoWidth: number,
  videoHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const sw = Math.max(32, Math.round(videoWidth * 0.7));
  const sh = Math.max(24, Math.round(videoHeight * 0.35));
  const sx = Math.max(0, Math.round((videoWidth - sw) / 2));
  const sy = Math.max(0, Math.round((videoHeight - sh) / 2));
  return { sx, sy, sw, sh };
}

function clampByte(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n | 0;
}

/** Grayscale + contraste + unsharp ligero in-place sobre ImageData. */
export function preprocessBarcodeImageData(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const gray = new Uint8ClampedArray(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
    // contraste alrededor de 128
    gray[p] = clampByte((g - 128) * 1.35 + 128);
  }

  const out = new ImageData(width, height);
  const od = out.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const c = gray[i]!;
      let sharp = c;
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const blur =
          (gray[i - width - 1]! +
            gray[i - width]! +
            gray[i - width + 1]! +
            gray[i - 1]! +
            c +
            gray[i + 1]! +
            gray[i + width - 1]! +
            gray[i + width]! +
            gray[i + width + 1]!) /
          9;
        sharp = clampByte(c + (c - blur) * 1.2);
      }
      const o = i * 4;
      od[o] = sharp;
      od[o + 1] = sharp;
      od[o + 2] = sharp;
      od[o + 3] = 255;
    }
  }
  return out;
}

const SCALES = [0.85, 1, 1.2] as const;

/**
 * Extrae ROI del video, aplica preprocess y genera variantes a distintas escalas.
 * Retorna ImageData listos para decoders.
 */
export function extractBarcodeVariants(
  video: HTMLVideoElement,
  workCanvas: HTMLCanvasElement,
): ImageData[] {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return [];

  const { sx, sy, sw, sh } = computeBarcodeRoi(vw, vh);
  const ctx = workCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  const variants: ImageData[] = [];

  for (const scale of SCALES) {
    const tw = Math.max(32, Math.round(sw * scale));
    const th = Math.max(24, Math.round(sh * scale));
    workCanvas.width = tw;
    workCanvas.height = th;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, tw, th);
    const raw = ctx.getImageData(0, 0, tw, th);
    variants.push(preprocessBarcodeImageData(raw));
  }

  return variants;
}
