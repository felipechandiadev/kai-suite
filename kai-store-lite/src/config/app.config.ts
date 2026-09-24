export const APP_CONFIG = {
  productName: "KaiStore Lite",
  /** Synced from package.json via Vite `define` — do not hardcode. */
  version: __APP_VERSION__,
  edition: "lite" as const,
  bundleId: "com.kaistore.lite",
  trialDays: 10,
} as const;
