export type CartIssueCode =
  | "PRICE_CHANGED"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK"
  | "VARIANT_UNAVAILABLE"
  | "QTY_ADJUSTED"
  | "PRODUCT_HIDDEN";

export type CartIssue = {
  code: CartIssueCode;
  productVariantId: string;
  message: string;
  previousUnitPrice?: number;
  currentUnitPrice?: number;
  requestedQty?: number;
  availableQty?: number;
};

export type EShopCartItemDto = {
  id: string;
  productId: string;
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  availableStock: number | null;
  trackInventory: boolean;
};

export type EShopCartDto = {
  id: string;
  cartToken: string;
  companyId: string;
  items: EShopCartItemDto[];
  subtotal: number;
  itemCount: number;
  issues?: CartIssue[];
  version: number;
  expiresAt: string;
  status: "active" | "checkout_locked" | "converted" | "abandoned";
  lockedAt: string | null;
  lockedReason: string | null;
};

export type EShopCartLine = {
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  name: string;
  imageUrl: string | null;
};

export type EShopCartState = {
  lines: EShopCartLine[];
};

export type CartAccessMode = "browsing" | "checkout_locked";

export type EShopCartUpdatedPayload = {
  cart: EShopCartDto;
  issues: CartIssue[];
};
