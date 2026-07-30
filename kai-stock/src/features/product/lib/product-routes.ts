import type { ScanMode } from "@/features/variant/domain/scan-mode.entity";

export const CREATE_PRODUCT_PATH = "/product/create";

export function createProductPagePath(): string {
  return CREATE_PRODUCT_PATH;
}

export function isCreateProductPath(pathname: string): boolean {
  return pathname === CREATE_PRODUCT_PATH || pathname.startsWith(`${CREATE_PRODUCT_PATH}/`);
}

export function createProductPath(params: { code: string; mode: ScanMode }): string {
  const q = new URLSearchParams();
  q.set("code", params.code.trim());
  q.set("mode", params.mode);
  return `${CREATE_PRODUCT_PATH}?${q.toString()}`;
}

export function parseCreateProductSearchParams(
  sp: Record<string, string | string[] | undefined>,
): { code: string; mode: ScanMode } | null {
  const rawCode = sp.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  if (typeof code !== "string" || !code.trim()) {
    return null;
  }
  const rawMode = sp.mode;
  const modeRaw = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  const mode: ScanMode = modeRaw === "sku" ? "sku" : "barcode";
  return { code: code.trim(), mode };
}
