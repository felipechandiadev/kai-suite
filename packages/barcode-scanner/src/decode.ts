import {
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  BarcodeFormat,
  RGBLuminanceSource,
} from "@zxing/library";
import type { BarcodeFormatId } from "./types";

type BarcodeDetectorFormat =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128"
  | "code_39";

const FORMAT_TO_BARCODE_DETECTOR: Record<BarcodeFormatId, BarcodeDetectorFormat> = {
  ean_13: "ean_13",
  ean_8: "ean_8",
  upc_a: "upc_a",
  upc_e: "upc_e",
  code_128: "code_128",
  code_39: "code_39",
};

const FORMAT_TO_ZXING: Partial<Record<BarcodeFormatId, BarcodeFormat>> = {
  ean_13: BarcodeFormat.EAN_13,
  ean_8: BarcodeFormat.EAN_8,
  upc_a: BarcodeFormat.UPC_A,
  upc_e: BarcodeFormat.UPC_E,
  code_128: BarcodeFormat.CODE_128,
  code_39: BarcodeFormat.CODE_39,
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type ZbarModule = typeof import("@undecaf/zbar-wasm");
type ZbarScanner = Awaited<ReturnType<ZbarModule["ZBarScanner"]["create"]>>;

let barcodeDetector: BarcodeDetectorLike | null | undefined;
let zxingReader: MultiFormatReader | null = null;
let zbarModule: ZbarModule | null = null;
let zbarScanner: ZbarScanner | null = null;
let decodeCanvas: HTMLCanvasElement | null = null;

function getDecodeCanvas(width: number, height: number): HTMLCanvasElement {
  if (!decodeCanvas) decodeCanvas = document.createElement("canvas");
  decodeCanvas.width = width;
  decodeCanvas.height = height;
  return decodeCanvas;
}

function getBarcodeDetector(
  formats: BarcodeFormatId[],
): BarcodeDetectorLike | null {
  if (barcodeDetector !== undefined) return barcodeDetector;
  const BD = (
    globalThis as {
      BarcodeDetector?: new (opts?: { formats: string[] }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;
  if (!BD) {
    barcodeDetector = null;
    return null;
  }
  try {
    barcodeDetector = new BD({
      formats: formats.map((f) => FORMAT_TO_BARCODE_DETECTOR[f]),
    });
  } catch {
    barcodeDetector = null;
  }
  return barcodeDetector;
}

function getZxingReader(formats: BarcodeFormatId[]): MultiFormatReader {
  if (zxingReader) return zxingReader;
  const reader = new MultiFormatReader();
  const hints = new Map();
  const zxFormats = formats
    .map((f) => FORMAT_TO_ZXING[f])
    .filter((f): f is BarcodeFormat => f != null);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, zxFormats);
  hints.set(DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);
  zxingReader = reader;
  return reader;
}

function imageDataToLuminances(imageData: ImageData): Uint8ClampedArray {
  const { data, width, height } = imageData;
  const luminances = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    luminances[p] = data[i]!;
  }
  return luminances;
}

async function decodeWithBarcodeDetector(
  imageData: ImageData,
  formats: BarcodeFormatId[],
): Promise<string | null> {
  const detector = getBarcodeDetector(formats);
  if (!detector) return null;
  try {
    const canvas = getDecodeCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(imageData, 0, 0);
    const codes = await detector.detect(canvas);
    const raw = codes[0]?.rawValue?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

function decodeWithZxing(
  imageData: ImageData,
  formats: BarcodeFormatId[],
): string | null {
  const reader = getZxingReader(formats);
  try {
    const luminances = imageDataToLuminances(imageData);
    const source = new RGBLuminanceSource(
      luminances,
      imageData.width,
      imageData.height,
    );
    const binary = new BinaryBitmap(new HybridBinarizer(source));
    const result = reader.decode(binary);
    const text = result?.getText()?.trim();
    reader.reset();
    return text || null;
  } catch {
    try {
      reader.reset();
    } catch {
      // ignore
    }
    return null;
  }
}

async function loadZbarModule(): Promise<ZbarModule | null> {
  if (zbarModule) return zbarModule;
  try {
    // Apps alias this to the browser inlined build (no Node `module` import).
    zbarModule = await import("@undecaf/zbar-wasm");
    return zbarModule;
  } catch {
    return null;
  }
}

async function getZbarScanner(): Promise<{
  scanImageData: ZbarModule["scanImageData"];
  scanner: ZbarScanner;
} | null> {
  try {
    const mod = await loadZbarModule();
    if (!mod) return null;
    if (!zbarScanner) {
      const scanner = await mod.ZBarScanner.create();
      scanner.setConfig(
        mod.ZBarSymbolType.ZBAR_QRCODE,
        mod.ZBarConfigType.ZBAR_CFG_ENABLE,
        0,
      );
      scanner.setConfig(
        mod.ZBarSymbolType.ZBAR_SQCODE,
        mod.ZBarConfigType.ZBAR_CFG_ENABLE,
        0,
      );
      scanner.setConfig(
        mod.ZBarSymbolType.ZBAR_PDF417,
        mod.ZBarConfigType.ZBAR_CFG_ENABLE,
        0,
      );
      zbarScanner = scanner;
    }
    return { scanImageData: mod.scanImageData, scanner: zbarScanner };
  } catch {
    return null;
  }
}

async function decodeWithZbar(imageData: ImageData): Promise<string | null> {
  try {
    const zbar = await getZbarScanner();
    if (!zbar) return null;
    const results = await zbar.scanImageData(imageData, zbar.scanner);
    if (!results?.length) return null;
    for (const r of results) {
      if (String(r.typeName ?? "").toUpperCase().includes("QR")) continue;
      const text = r.decode().trim();
      if (text) return text;
    }
    return null;
  } catch {
    return null;
  }
}

/** Cascada: BarcodeDetector → ZXing → ZBar. */
export async function decodeBarcodeImageData(
  imageData: ImageData,
  formats: BarcodeFormatId[],
): Promise<string | null> {
  const a = await decodeWithBarcodeDetector(imageData, formats);
  if (a) return a;
  const b = decodeWithZxing(imageData, formats);
  if (b) return b;
  return decodeWithZbar(imageData);
}

/** Prueba varias variantes ImageData hasta el primer hit. */
export async function decodeBarcodeVariants(
  variants: ImageData[],
  formats: BarcodeFormatId[],
): Promise<string | null> {
  for (const variant of variants) {
    const code = await decodeBarcodeImageData(variant, formats);
    if (code) return code;
  }
  return null;
}
