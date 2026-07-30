import type { EShopCartLine } from "../types/cart.types";
import { loadCart } from "../cart-storage";

export async function migrateLegacyCartLines(): Promise<EShopCartLine[]> {
  const legacy = loadCart().lines;
  return legacy.filter((l) => l.productVariantId && l.quantity > 0);
}
