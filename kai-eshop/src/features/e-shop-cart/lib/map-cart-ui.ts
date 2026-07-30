import type { EShopCartDto } from "../types/cart.types";

export function mapDtoToLines(cart: EShopCartDto) {
  return cart.items.map((i) => ({
    productVariantId: i.productVariantId,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    name: i.productName,
    imageUrl: i.imageUrl,
  }));
}
