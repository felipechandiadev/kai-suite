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
  filename: string | null;
  installHint: string;
  version?: string;
  href: string;
};

const OFFER_META: Array<
  Pick<KaiPrintersDownloadOffer, "platform" | "title" | "description" | "installHint">
> = [
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

/** Override por plataforma (URL directa al binario, sin manifest). */
const URL_OVERRIDE_ENV: Record<KaiPrintersPlatform, string> = {
  android: "NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL",
  windows: "NEXT_PUBLIC_KAI_PRINTERS_WINDOWS_URL",
  macos: "NEXT_PUBLIC_KAI_PRINTERS_MACOS_URL",
};

export const KAI_PRINTERS_MANIFEST_FILENAMES: Record<KaiPrintersPlatform, string> = {
  android: "kai-printers-android.manifest.json",
  windows: "kai-printers-windows.manifest.json",
  macos: "kai-printers-macos.manifest.json",
};

/** `KAI_DOWNLOADS_URL` (runtime) tiene prioridad sobre el nombre legacy. */
const DOWNLOADS_BASE_ENV_KEYS = [
  "KAI_DOWNLOADS_URL",
  "NEXT_PUBLIC_KAI_PRINTERS_DOWNLOADS_BASE",
] as const;

const MANIFEST_REVALIDATE_SECONDS = 300;

function readEnv(key: string): string | undefined {
  const value = typeof process !== "undefined" ? process.env?.[key]?.trim() : undefined;
  return value || undefined;
}

/** Carpeta pública con manifests + binarios (sin `/` final). Solo servidor. */
export function resolveKaiDownloadsBaseUrl(): string | null {
  for (const key of DOWNLOADS_BASE_ENV_KEYS) {
    const value = readEnv(key);
    if (value) return value.replace(/\/+$/, "");
  }
  return null;
}

async function fetchManifest<T extends { filename?: string; version?: string }>(
  url: string,
): Promise<T | undefined> {
  if (typeof fetch === "undefined") return undefined;
  try {
    const res = await fetch(url, {
      next: { revalidate: MANIFEST_REVALIDATE_SECONDS },
    } as RequestInit);
    if (!res.ok) return undefined;
    const data = (await res.json()) as T;
    if (!data?.filename || !data?.version) return undefined;
    return data;
  } catch {
    return undefined;
  }
}

/** Lee los manifests desde `KAI_DOWNLOADS_URL`. Sin env → `{}`. Solo servidor. */
export async function loadKaiPrintersDownloadsManifests(
  baseUrl: string | null = resolveKaiDownloadsBaseUrl(),
): Promise<KaiPrintersDownloadsManifests> {
  if (!baseUrl) return {};
  const [android, windows, macos] = await Promise.all([
    fetchManifest<KaiPrintersAndroidManifest>(
      `${baseUrl}/${KAI_PRINTERS_MANIFEST_FILENAMES.android}`,
    ),
    fetchManifest<KaiPrintersDesktopManifest>(
      `${baseUrl}/${KAI_PRINTERS_MANIFEST_FILENAMES.windows}`,
    ),
    fetchManifest<KaiPrintersDesktopManifest>(
      `${baseUrl}/${KAI_PRINTERS_MANIFEST_FILENAMES.macos}`,
    ),
  ]);
  return { android, windows, macos };
}

export function resolveKaiPrintersDownloadUrl(
  platform: KaiPrintersPlatform,
  manifests: KaiPrintersDownloadsManifests,
  baseUrl: string | null = resolveKaiDownloadsBaseUrl(),
): string | null {
  const override = readEnv(URL_OVERRIDE_ENV[platform]);
  if (override) return override;
  const filename = manifests[platform]?.filename;
  if (!baseUrl || !filename) return null;
  return `${baseUrl}/${encodeURIComponent(filename)}`;
}

/** Solo plataformas con URL resoluble. */
export function listKaiPrintersDownloadOffers(
  manifests: KaiPrintersDownloadsManifests,
  baseUrl: string | null = resolveKaiDownloadsBaseUrl(),
): KaiPrintersDownloadOffer[] {
  const offers: KaiPrintersDownloadOffer[] = [];
  for (const meta of OFFER_META) {
    const href = resolveKaiPrintersDownloadUrl(meta.platform, manifests, baseUrl);
    if (!href) continue;
    const manifest = manifests[meta.platform];
    const note = manifest && "note" in manifest ? manifest.note?.trim() : undefined;
    offers.push({
      ...meta,
      filename: manifest?.filename ?? null,
      version: manifest?.version,
      installHint: note || meta.installHint,
      href,
    });
  }
  return offers;
}

/** Manifests remotos + ofertas listas para el componente. Solo servidor. */
export async function loadKaiPrintersDownloadOffers(): Promise<KaiPrintersDownloadOffer[]> {
  const baseUrl = resolveKaiDownloadsBaseUrl();
  const manifests = await loadKaiPrintersDownloadsManifests(baseUrl);
  return listKaiPrintersDownloadOffers(manifests, baseUrl);
}
