export const APP_CONFIG = {
  productName: "KaiStore Lite",
  version: "0.1.0",
  edition: "lite" as const,
  bundleId: "com.kaistore.lite",
  coreDefaultUrl: "http://127.0.0.1:4100/api",
  trialDays: 10,
} as const;

export function coreBaseUrl(): string {
  return import.meta.env.VITE_CORE_URL?.trim() || APP_CONFIG.coreDefaultUrl;
}
