export type KaiPrintersPlatform = "android" | "windows" | "macos";

export type KaiPrintersAndroidManifest = {
  version: string;
  versionCode: number;
  filename: string;
  builtAt: string;
};

export type KaiPrintersDownloadOffer = {
  platform: KaiPrintersPlatform;
  title: string;
  description: string;
  filename: string;
  installHint: string;
  version?: string;
};

/** Debe coincidir con pwa-pos/public/downloads/kai-printers-android.manifest.json */
export const KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT: KaiPrintersAndroidManifest = {
  version: "1.1.4",
  versionCode: 8,
  filename: "kai-printers-android-1.1.4.apk",
  builtAt: "2026-06-24T12:48:57Z",
};

const OFFERS: KaiPrintersDownloadOffer[] = [
  {
    platform: "android",
    title: "Kai Printers para Android",
    description: "Tablet o PC en la red local. Mismo dispositivo que el POS → host 127.0.0.1; otro equipo → IP LAN.",
    filename: KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT.filename,
    version: KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT.version,
    installHint:
      "Tras descargar, abrí el APK, permití «instalar apps desconocidas» si el sistema lo pide y completá permisos en Kai Printers.",
  },
  {
    platform: "windows",
    title: "Kai Printers para Windows",
    description: "PC de caja con el POS en el navegador.",
    filename: "kai-printers-windows.exe",
    installHint: "Ejecutá el instalador y dejá Kai Printers activo en la bandeja del sistema.",
  },
  {
    platform: "macos",
    title: "Kai Printers para macOS",
    description: "Mac de caja con el POS en el navegador.",
    filename: "kai-printers-macos.dmg",
    installHint: "Abrí el .dmg, arrastrá Kai Printers a Aplicaciones y permití el arranque al iniciar sesión.",
  },
];

const ENV_BY_PLATFORM: Record<KaiPrintersPlatform, string> = {
  android: "NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL",
  windows: "NEXT_PUBLIC_KAI_PRINTERS_WINDOWS_URL",
  macos: "NEXT_PUBLIC_KAI_PRINTERS_MACOS_URL",
};

const MANIFEST_PATH = "/downloads/kai-printers-android.manifest.json";

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

/** Carga el manifest publicado por el script de release (cliente / SSR fetch). */
export async function fetchKaiPrintersAndroidManifest(
  baseUrl = "",
): Promise<KaiPrintersAndroidManifest> {
  if (typeof fetch === "undefined") {
    return KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT;
  }
  try {
    const res = await fetch(`${baseUrl}${MANIFEST_PATH}`, { cache: "no-store" });
    if (!res.ok) return KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT;
    const data = (await res.json()) as KaiPrintersAndroidManifest;
    if (!data?.filename || !data?.version) return KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT;
    return data;
  } catch {
    return KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT;
  }
}

/** URL absoluta o ruta bajo el origen de la PWA (p. ej. `/downloads/kai-printers-android-1.1.0.apk`). */
export function resolveKaiPrintersDownloadUrl(
  platform: KaiPrintersPlatform,
  manifest: KaiPrintersAndroidManifest = KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
): string | null {
  const offer = OFFERS.find((o) => o.platform === platform);
  if (!offer) return null;

  const fromEnv = readEnv(ENV_BY_PLATFORM[platform]);
  if (fromEnv) return fromEnv;

  if (platform === "android") {
    return `/downloads/${manifest.filename}`;
  }

  return null;
}

export function listKaiPrintersDownloadOffers(
  manifest: KaiPrintersAndroidManifest = KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
): Array<KaiPrintersDownloadOffer & { href: string | null }> {
  return OFFERS.map((offer) => ({
    ...offer,
    filename: offer.platform === "android" ? manifest.filename : offer.filename,
    version: offer.platform === "android" ? manifest.version : offer.version,
    href: resolveKaiPrintersDownloadUrl(offer.platform, manifest),
  }));
}
