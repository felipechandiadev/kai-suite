export type KaiPrintersPlatform = "android" | "windows" | "macos";

export type KaiPrintersDownloadOffer = {
  platform: KaiPrintersPlatform;
  title: string;
  description: string;
  filename: string;
  installHint: string;
};

const OFFERS: KaiPrintersDownloadOffer[] = [
  {
    platform: "android",
    title: "Kai Printers para Android",
    description: "Tablet o teléfono con el POS en Chrome. Instalá el agente en el mismo dispositivo.",
    filename: "kai-printers-android.apk",
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

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]?.trim()) {
    return process.env[key]!.trim();
  }
  return undefined;
}

/** URL absoluta o ruta bajo el origen de la PWA (p. ej. `/downloads/kai-printers-android.apk`). */
export function resolveKaiPrintersDownloadUrl(platform: KaiPrintersPlatform): string | null {
  const offer = OFFERS.find((o) => o.platform === platform);
  if (!offer) return null;

  const fromEnv = readEnv(ENV_BY_PLATFORM[platform]);
  if (fromEnv) return fromEnv;

  if (platform === "android") {
    return `/downloads/${offer.filename}`;
  }

  return null;
}

export function listKaiPrintersDownloadOffers(): Array<
  KaiPrintersDownloadOffer & { href: string | null }
> {
  return OFFERS.map((offer) => ({
    ...offer,
    href: resolveKaiPrintersDownloadUrl(offer.platform),
  }));
}
