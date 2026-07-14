export type { EShopCartLine, EShopCartState } from "./types/cart.types";

import type { EShopCartState } from "./types/cart.types";

const CART_STORAGE_KEY = "kaistore-eshop-cart:v2";

/** Limpia carritos de versiones anteriores (p. ej. tras re-seed de catálogo). */
function purgeLegacyCartKeys(): void {
  if (typeof window === "undefined") return;
  for (const key of ["kaistore-eshop-cart", "kaistore-eshop-cart:v1"]) {
    localStorage.removeItem(key);
  }
}

export function loadCart(): EShopCartState {
  if (typeof window === "undefined") return { lines: [] };
  purgeLegacyCartKeys();
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { lines: [] };
    const parsed = JSON.parse(raw) as EShopCartState;
    return { lines: Array.isArray(parsed.lines) ? parsed.lines : [] };
  } catch {
    return { lines: [] };
  }
}

export function saveCart(state: EShopCartState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
}

export function clearCartStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_STORAGE_KEY);
  purgeLegacyCartKeys();
}
