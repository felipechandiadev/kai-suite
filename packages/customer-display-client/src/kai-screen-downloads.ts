export type KaiScreenAndroidManifest = {
  version: string;
  versionCode: number;
  filename: string;
  builtAt: string;
};

export type KaiScreenDownloadOffer = {
  title: string;
  description: string;
  filename: string | null;
  installHint: string;
  version?: string;
  href: string;
};

const OFFER_META: Pick<KaiScreenDownloadOffer, "title" | "description" | "installHint"> = {
  title: "Kai CFD para Android",
  description:
    "Pantalla cliente en la segunda pantalla de la tablet. Instalá el agente en el mismo dispositivo donde corre el POS.",
  installHint:
    "Tras descargar, abrí el APK, permití «instalar apps desconocidas» si el sistema lo pide y activá el servicio en Kai CFD.",
};

export const KAI_SCREEN_ANDROID_MANIFEST_FILENAME = "kai-screen-android.manifest.json";

/** Override: URL directa al APK (sin manifest). */
const URL_OVERRIDE_ENV = "NEXT_PUBLIC_KAI_SCREEN_ANDROID_URL";

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
export function resolveKaiScreenDownloadsBaseUrl(): string | null {
  for (const key of DOWNLOADS_BASE_ENV_KEYS) {
    const value = readEnv(key);
    if (value) return value.replace(/\/+$/, "");
  }
  return null;
}

/** Lee el manifest desde `KAI_DOWNLOADS_URL`. Solo servidor. */
export async function loadKaiScreenAndroidManifest(
  baseUrl: string | null = resolveKaiScreenDownloadsBaseUrl(),
): Promise<KaiScreenAndroidManifest | undefined> {
  if (!baseUrl || typeof fetch === "undefined") return undefined;
  try {
    const res = await fetch(`${baseUrl}/${KAI_SCREEN_ANDROID_MANIFEST_FILENAME}`, {
      next: { revalidate: MANIFEST_REVALIDATE_SECONDS },
    } as RequestInit);
    if (!res.ok) return undefined;
    const data = (await res.json()) as KaiScreenAndroidManifest;
    if (!data?.filename || !data?.version) return undefined;
    return data;
  } catch {
    return undefined;
  }
}

export function resolveKaiScreenDownloadUrl(
  manifest: KaiScreenAndroidManifest | undefined,
  baseUrl: string | null = resolveKaiScreenDownloadsBaseUrl(),
): string | null {
  const override = readEnv(URL_OVERRIDE_ENV);
  if (override) return override;
  if (!baseUrl || !manifest?.filename) return null;
  return `${baseUrl}/${encodeURIComponent(manifest.filename)}`;
}

export function buildKaiScreenDownloadOffer(
  manifest: KaiScreenAndroidManifest | undefined,
  baseUrl: string | null = resolveKaiScreenDownloadsBaseUrl(),
): KaiScreenDownloadOffer | null {
  const href = resolveKaiScreenDownloadUrl(manifest, baseUrl);
  if (!href) return null;
  return {
    ...OFFER_META,
    filename: manifest?.filename ?? null,
    version: manifest?.version,
    href,
  };
}

/** Manifest remoto + oferta lista para el componente. Solo servidor. */
export async function loadKaiScreenDownloadOffer(): Promise<KaiScreenDownloadOffer | null> {
  const baseUrl = resolveKaiScreenDownloadsBaseUrl();
  const manifest = await loadKaiScreenAndroidManifest(baseUrl);
  return buildKaiScreenDownloadOffer(manifest, baseUrl);
}
