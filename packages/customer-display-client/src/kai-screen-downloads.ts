export type KaiScreenAndroidManifest = {
  version: string;
  versionCode: number;
  filename: string;
  builtAt: string;
};

export type KaiScreenDownloadOffer = {
  title: string;
  description: string;
  filename: string;
  installHint: string;
  version?: string;
};

/** Debe coincidir con pwa-pos/public/downloads/kai-screen-android.manifest.json */
export const KAI_SCREEN_ANDROID_MANIFEST_DEFAULT: KaiScreenAndroidManifest = {
  version: "1.0.1",
  versionCode: 3,
  filename: "kai-screen-android-1.0.1.apk",
  builtAt: "2026-06-24T13:15:34Z",
};

const OFFER: KaiScreenDownloadOffer = {
  title: "Kai Screen para Android",
  description:
    "Pantalla cliente en la segunda pantalla de la tablet. Instalá el agente en el mismo dispositivo donde corre el POS.",
  filename: KAI_SCREEN_ANDROID_MANIFEST_DEFAULT.filename,
  version: KAI_SCREEN_ANDROID_MANIFEST_DEFAULT.version,
  installHint:
    "Tras descargar, abrí el APK, permití «instalar apps desconocidas» si el sistema lo pide y activá el servicio en Kai Screen.",
};

const ENV_KEY = "NEXT_PUBLIC_KAI_SCREEN_ANDROID_URL";
const MANIFEST_PATH = "/downloads/kai-screen-android.manifest.json";

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]?.trim()) {
    return process.env[key]!.trim();
  }
  return undefined;
}

export function androidManifestFilename(
  manifest: KaiScreenAndroidManifest = KAI_SCREEN_ANDROID_MANIFEST_DEFAULT,
): string {
  return manifest.filename;
}

/** Carga el manifest publicado por el script de release (cliente / SSR fetch). */
export async function fetchKaiScreenAndroidManifest(
  baseUrl = "",
): Promise<KaiScreenAndroidManifest> {
  if (typeof fetch === "undefined") {
    return KAI_SCREEN_ANDROID_MANIFEST_DEFAULT;
  }
  try {
    const res = await fetch(`${baseUrl}${MANIFEST_PATH}`, { cache: "no-store" });
    if (!res.ok) return KAI_SCREEN_ANDROID_MANIFEST_DEFAULT;
    const data = (await res.json()) as KaiScreenAndroidManifest;
    if (!data?.filename || !data?.version) return KAI_SCREEN_ANDROID_MANIFEST_DEFAULT;
    return data;
  } catch {
    return KAI_SCREEN_ANDROID_MANIFEST_DEFAULT;
  }
}

/** URL absoluta o ruta bajo el origen de la PWA (p. ej. `/downloads/kai-screen-android-1.0.0.apk`). */
export function resolveKaiScreenDownloadUrl(
  manifest: KaiScreenAndroidManifest = KAI_SCREEN_ANDROID_MANIFEST_DEFAULT,
): string | null {
  const fromEnv = readEnv(ENV_KEY);
  if (fromEnv) return fromEnv;
  return `/downloads/${manifest.filename}`;
}

export function listKaiScreenDownloadOffers(
  manifest: KaiScreenAndroidManifest = KAI_SCREEN_ANDROID_MANIFEST_DEFAULT,
): Array<KaiScreenDownloadOffer & { href: string | null }> {
  return [
    {
      ...OFFER,
      filename: manifest.filename,
      version: manifest.version,
      href: resolveKaiScreenDownloadUrl(manifest),
    },
  ];
}
