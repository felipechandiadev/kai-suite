export type KaiPrintersPlatform = "android" | "windows" | "macos";

export type KaiPrintersAndroidManifest = {
  version: string;
  versionCode: number;
  filename: string;
  builtAt: string;
};

export type KaiPrintersDesktopManifest = {
  version: string;
  filename: string;
  builtAt: string;
  format?: string;
  arch?: string;
  note?: string;
};

export type KaiPrintersDownloadsManifests = {
  android?: KaiPrintersAndroidManifest;
  windows?: KaiPrintersDesktopManifest;
  macos?: KaiPrintersDesktopManifest;
};

export type KaiPrintersDownloadOffer = {
  platform: KaiPrintersPlatform;
  title: string;
  description: string;
  filename: string;
  installHint: string;
  version?: string;
};

/** Fallback si falta manifest en public/downloads (SSR / build). */
export const KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT: KaiPrintersAndroidManifest = {
  version: "1.1.14",
  versionCode: 24,
  filename: "kai-printers-android-1.1.14.apk",
  builtAt: "2026-07-29T23:45:00Z",
};

export const KAI_PRINTERS_WINDOWS_MANIFEST_DEFAULT: KaiPrintersDesktopManifest = {
  version: "1.0.7",
  filename: "kai-printers-windows-1.0.7-x64-portable.zip",
  builtAt: "2026-07-29T20:39:31.895Z",
  format: "zip-portable",
  note: "ZIP portable (KaiPrinters.exe + SumatraPDF.exe).",
};

export const KAI_PRINTERS_MACOS_MANIFEST_DEFAULT: KaiPrintersDesktopManifest = {
  version: "1.0.7",
  filename: "kai-printers-macos-1.0.7-aarch64.dmg",
  builtAt: "2026-07-29T20:37:00.286Z",
  format: "dmg",
  arch: "aarch64",
  note: "Abrir el .dmg y arrastrar Kai Printers a Aplicaciones.",
};

const OFFER_META: Omit<KaiPrintersDownloadOffer, "filename" | "version">[] = [
  {
    platform: "android",
    title: "Kai Printers para Android",
    description:
      "Tablet o PC en la red local. Mismo dispositivo que el POS → host 127.0.0.1; otro equipo → IP LAN.",
    installHint:
      "Tras descargar, abrí el APK, permití «instalar apps desconocidas» si el sistema lo pide y completá permisos en Kai Printers.",
  },
  {
    platform: "windows",
    title: "Kai Printers para Windows",
    description: "PC de caja con el POS en el navegador (ZIP portable x64).",
    installHint:
      "Descargá el ZIP, extraé la carpeta y ejecutá KaiPrinters.exe (debe quedar junto a SumatraPDF.exe).",
  },
  {
    platform: "macos",
    title: "Kai Printers para macOS",
    description: "Mac de caja con el POS en el navegador.",
    installHint:
      "Abrí el .dmg, arrastrá Kai Printers a Aplicaciones y permití el arranque al iniciar sesión.",
  },
];

const ENV_BY_PLATFORM: Record<KaiPrintersPlatform, string> = {
  android: "NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL",
  windows: "NEXT_PUBLIC_KAI_PRINTERS_WINDOWS_URL",
  macos: "NEXT_PUBLIC_KAI_PRINTERS_MACOS_URL",
};

const MANIFEST_PATHS = {
  android: "/downloads/kai-printers-android.manifest.json",
  windows: "/downloads/kai-printers-windows.manifest.json",
  macos: "/downloads/kai-printers-macos.manifest.json",
} as const;

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]?.trim()) {
    return process.env[key]!.trim();
  }
  return undefined;
}

export function androidManifestFilename(
  manifest: KaiPrintersAndroidManifest = KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
): string {
  return manifest.filename;
}

async function fetchManifest<T>(path: string, fallback: T): Promise<T> {
  if (typeof fetch === "undefined") return fallback;
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return fallback;
    const data = (await res.json()) as T;
    const row = data as { filename?: string; version?: string };
    if (!row?.filename || !row?.version) return fallback;
    return data;
  } catch {
    return fallback;
  }
}

/** Carga el manifest Android publicado (cliente / SSR fetch). */
export async function fetchKaiPrintersAndroidManifest(
  baseUrl = "",
): Promise<KaiPrintersAndroidManifest> {
  return fetchManifest(
    `${baseUrl}${MANIFEST_PATHS.android}`,
    KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
  );
}

export async function fetchKaiPrintersWindowsManifest(
  baseUrl = "",
): Promise<KaiPrintersDesktopManifest> {
  return fetchManifest(
    `${baseUrl}${MANIFEST_PATHS.windows}`,
    KAI_PRINTERS_WINDOWS_MANIFEST_DEFAULT,
  );
}

export async function fetchKaiPrintersMacosManifest(
  baseUrl = "",
): Promise<KaiPrintersDesktopManifest> {
  return fetchManifest(
    `${baseUrl}${MANIFEST_PATHS.macos}`,
    KAI_PRINTERS_MACOS_MANIFEST_DEFAULT,
  );
}

export async function fetchKaiPrintersDownloadsManifests(
  baseUrl = "",
): Promise<KaiPrintersDownloadsManifests> {
  const [android, windows, macos] = await Promise.all([
    fetchKaiPrintersAndroidManifest(baseUrl),
    fetchKaiPrintersWindowsManifest(baseUrl),
    fetchKaiPrintersMacosManifest(baseUrl),
  ]);
  return { android, windows, macos };
}

function manifestForPlatform(
  platform: KaiPrintersPlatform,
  manifests: KaiPrintersDownloadsManifests,
): KaiPrintersAndroidManifest | KaiPrintersDesktopManifest {
  if (platform === "android") {
    return manifests.android ?? KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT;
  }
  if (platform === "windows") {
    return manifests.windows ?? KAI_PRINTERS_WINDOWS_MANIFEST_DEFAULT;
  }
  return manifests.macos ?? KAI_PRINTERS_MACOS_MANIFEST_DEFAULT;
}

/** URL absoluta o ruta bajo el origen de la PWA (p. ej. `/downloads/...`). */
export function resolveKaiPrintersDownloadUrl(
  platform: KaiPrintersPlatform,
  manifests: KaiPrintersDownloadsManifests = {},
): string | null {
  const fromEnv = readEnv(ENV_BY_PLATFORM[platform]);
  if (fromEnv) return fromEnv;

  const manifest = manifestForPlatform(platform, manifests);
  if (!manifest?.filename) return null;
  return `/downloads/${manifest.filename}`;
}

export function listKaiPrintersDownloadOffers(
  manifests: KaiPrintersDownloadsManifests = {},
): Array<KaiPrintersDownloadOffer & { href: string | null }> {
  return OFFER_META.map((meta) => {
    const manifest = manifestForPlatform(meta.platform, manifests);
    return {
      ...meta,
      filename: manifest.filename,
      version: manifest.version,
      installHint:
        "note" in manifest && typeof manifest.note === "string" && manifest.note.trim()
          ? manifest.note
          : meta.installHint,
      href: resolveKaiPrintersDownloadUrl(meta.platform, manifests),
    };
  });
}
