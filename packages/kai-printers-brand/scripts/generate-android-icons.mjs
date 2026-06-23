/**
 * Genera iconos Android para Kai Printers desde sources/kai-printers.png
 *
 * Uso: npm run generate
 * Salida: output/android/ (copiar a kai-printers-android/app/src/main/res/)
 *
 * Matriz API → asset:
 * - ic_launcher.png / ic_launcher_round.png — API 24–25 (legacy launcher, fondo blanco)
 * - ic_launcher_foreground.png + adaptive XML — API 26+ (safe zone ~66 %)
 * - ic_launcher_monochrome.png — API 33+ themed icon
 * - ic_notification.png — todas las eras (notificación FGS)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(root, "sources", "kai-printers.png");
const outAndroid = path.join(root, "output", "android");
const outPlay = path.join(root, "output", "play-store");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const SQUARE = 1024;
/** ~18 % padding dentro de la safe zone del adaptive icon (66 % del canvas). */
const FOREGROUND_INNER_RATIO = 0.66;

const LAUNCHER_SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const FOREGROUND_SIZES = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
};

const NOTIFICATION_SIZES = {
  "drawable-mdpi": 24,
  "drawable-hdpi": 36,
  "drawable-xhdpi": 48,
  "drawable-xxhdpi": 72,
  "drawable-xxxhdpi": 96,
};

async function squareBuffer() {
  return sharp(source)
    .resize(SQUARE, SQUARE, { fit: "contain", position: "center", background: WHITE })
    .png()
    .toBuffer();
}

async function paddedForegroundBuffer() {
  const inner = Math.round(SQUARE * FOREGROUND_INNER_RATIO);
  const logo = await sharp(source)
    .resize(inner, inner, { fit: "contain", position: "center", background: TRANSPARENT })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: SQUARE,
      height: SQUARE,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

async function writePng(buf, size, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await sharp(buf).resize(size, size).png().toFile(filePath);
}

/** White silhouette on transparent (Material monochrome / themed icon). */
async function writeMonochromeIcon(buf, size, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const { data, info } = await sharp(buf)
    .resize(size, size)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + 3] ?? 255;
    const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const on = lum < 240 && a > 32;
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = on ? 255 : 0;
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(filePath);
}

async function writeAdaptiveXml() {
  const dir = path.join(outAndroid, "mipmap-anydpi-v26");
  fs.mkdirSync(dir, { recursive: true });
  const adaptiveBody = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
  <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(dir, "ic_launcher.xml"), adaptiveBody);
  fs.writeFileSync(path.join(dir, "ic_launcher_round.xml"), adaptiveBody);

  const valuesDir = path.join(outAndroid, "values");
  fs.mkdirSync(valuesDir, { recursive: true });
  fs.writeFileSync(
    path.join(valuesDir, "ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">#FFFFFF</color>
</resources>
`,
  );
}

async function main() {
  if (!fs.existsSync(source)) {
    console.error(`Missing source: ${source}`);
    process.exit(1);
  }

  const legacyBuf = await squareBuffer();
  const foregroundBuf = await paddedForegroundBuffer();

  for (const [folder, size] of Object.entries(LAUNCHER_SIZES)) {
    const base = path.join(outAndroid, folder);
    await writePng(legacyBuf, size, path.join(base, "ic_launcher.png"));
    await writePng(legacyBuf, size, path.join(base, "ic_launcher_round.png"));
  }

  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    await writePng(foregroundBuf, size, path.join(outAndroid, folder, "ic_launcher_foreground.png"));
  }

  for (const [folder, size] of Object.entries(NOTIFICATION_SIZES)) {
    await writeMonochromeIcon(legacyBuf, size, path.join(outAndroid, folder, "ic_notification.png"));
    await writeMonochromeIcon(legacyBuf, size, path.join(outAndroid, folder, "ic_launcher_monochrome.png"));
  }

  await writeAdaptiveXml();

  fs.mkdirSync(outPlay, { recursive: true });
  await writePng(legacyBuf, 512, path.join(outPlay, "icon-512.png"));

  console.log(`Android icons → ${path.relative(root, outAndroid)}/`);
  console.log(`Play Store 512 → ${path.relative(root, outPlay)}/icon-512.png`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
