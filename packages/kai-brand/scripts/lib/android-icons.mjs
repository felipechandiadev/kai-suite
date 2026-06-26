/**
 * Iconos launcher Android (adaptive + legacy + notification).
 * Basado en packages/kai-printers-brand/scripts/generate-android-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const SQUARE = 1024;
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

async function squareBuffer(source) {
  return sharp(source)
    .resize(SQUARE, SQUARE, { fit: "contain", position: "center", background: WHITE })
    .png()
    .toBuffer();
}

async function paddedForegroundBuffer(source) {
  const inner = Math.round(SQUARE * FOREGROUND_INNER_RATIO);
  const logo = await sharp(source)
    .resize(inner, inner, { fit: "contain", position: "center", background: TRANSPARENT })
    .png()
    .toBuffer();
  return sharp({
    create: { width: SQUARE, height: SQUARE, channels: 4, background: TRANSPARENT },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

async function writeWebp(buf, size, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await sharp(buf).resize(size, size).webp({ quality: 92 }).toFile(filePath);
}

async function writePng(buf, size, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await sharp(buf).resize(size, size).png().toFile(filePath);
}

async function writeMonochromeIcon(buf, size, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const { data, info } = await sharp(buf).resize(size, size).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(filePath);
}

function writeAdaptiveXml(resDir) {
  const dir = path.join(resDir, "mipmap-anydpi-v26");
  fs.mkdirSync(dir, { recursive: true });
  const body = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@mipmap/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
  <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(dir, "ic_launcher.xml"), body);
  fs.writeFileSync(path.join(dir, "ic_launcher_round.xml"), body);
  const valuesDir = path.join(resDir, "values");
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

function removeLegacyLauncherFiles(resDir) {
  const names = [
    "ic_launcher.png",
    "ic_launcher.webp",
    "ic_launcher_round.png",
    "ic_launcher_round.webp",
    "ic_launcher_foreground.png",
    "ic_launcher_foreground.webp",
    "ic_launcher_background.png",
    "ic_launcher_background.webp",
  ];
  for (const folder of [...Object.keys(LAUNCHER_SIZES), ...Object.keys(FOREGROUND_SIZES)]) {
    const dir = path.join(resDir, folder);
    if (!fs.existsSync(dir)) continue;
    for (const name of names) {
      const file = path.join(dir, name);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
}

/** @param {string} source — kai-logo-ANDROID.png */
export async function generateAndroidRes(source, targetResDir) {
  removeLegacyLauncherFiles(targetResDir);
  const legacyBuf = await squareBuffer(source);
  const foregroundBuf = await paddedForegroundBuffer(source);
  const whiteBuf = await sharp({
    create: { width: SQUARE, height: SQUARE, channels: 3, background: WHITE },
  })
    .png()
    .toBuffer();

  for (const [folder, size] of Object.entries(LAUNCHER_SIZES)) {
    const base = path.join(targetResDir, folder);
    await writeWebp(legacyBuf, size, path.join(base, "ic_launcher.webp"));
    await writeWebp(legacyBuf, size, path.join(base, "ic_launcher_round.webp"));
  }

  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    await writeWebp(foregroundBuf, size, path.join(targetResDir, folder, "ic_launcher_foreground.webp"));
    await writeWebp(whiteBuf, size, path.join(targetResDir, folder, "ic_launcher_background.webp"));
  }

  for (const [folder, size] of Object.entries(NOTIFICATION_SIZES)) {
    await writeMonochromeIcon(legacyBuf, size, path.join(targetResDir, folder, "ic_notification.png"));
    await writeMonochromeIcon(legacyBuf, size, path.join(targetResDir, folder, "ic_launcher_monochrome.png"));
  }

  writeAdaptiveXml(targetResDir);
}
