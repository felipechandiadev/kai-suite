"use server";

import { getEShopStoreSlug } from "@/lib/eshop-store-config";
import { getCustomerSessionToken } from "@/lib/eshop-customer-session";
import { getCartToken, setCartToken, clearCartToken } from "@/lib/eshop-cart-session";
import { EShopApiError } from "@/features/e-shop-storefront/infrastructure/eshop-api-error";
import { EShopCartRequest } from "../infrastructure/cart.request";
import type { EShopCartDto } from "../types/cart.types";

async function persistToken(token: string | undefined) {
  if (token?.trim()) {
    await setCartToken(token.trim());
  }
}

export async function fetchCartAction(): Promise<EShopCartDto> {
  const slug = getEShopStoreSlug();
  const session = await getCustomerSessionToken();
  const cartToken = await getCartToken();
  const res = await EShopCartRequest.get(slug, session, cartToken);
  await persistToken(res.cartToken);
  return res.cart;
}

export async function revalidateCartAction(): Promise<EShopCartDto> {
  const slug = getEShopStoreSlug();
  const session = await getCustomerSessionToken();
  const cartToken = await getCartToken();
  const res = await EShopCartRequest.revalidate(slug, session, cartToken);
  await persistToken(res.cartToken);
  return res.cart;
}

export async function addCartItemAction(input: {
  productVariantId: string;
  quantity?: number;
  imageUrl?: string | null;
  name?: string;
  unitPrice?: number;
}): Promise<EShopCartDto> {
  const slug = getEShopStoreSlug();
  const session = await getCustomerSessionToken();
  const body = {
    productVariantId: input.productVariantId,
    quantity: input.quantity ?? 1,
    imageUrl: input.imageUrl,
  };

  const attempt = async (cartToken: string | null) => {
    const res = await EShopCartRequest.addItem(slug, body, session, cartToken);
    await persistToken(res.cartToken);
    return res.cart;
  };

  try {
    return await attempt(await getCartToken());
  } catch (err) {
    if (
      err instanceof EShopApiError &&
      /convertido/i.test(err.message)
    ) {
      await clearCartToken();
      return attempt(null);
    }
    throw err;
  }
}

export async function updateCartQtyAction(
  productVariantId: string,
  quantity: number,
): Promise<EShopCartDto> {
  const slug = getEShopStoreSlug();
  const session = await getCustomerSessionToken();
  const cartToken = await getCartToken();
  const res = await EShopCartRequest.updateQty(
    slug,
    productVariantId,
    quantity,
    session,
    cartToken,
  );
  await persistToken(res.cartToken);
  return res.cart;
}

export async function removeCartItemAction(productVariantId: string): Promise<EShopCartDto> {
  const slug = getEShopStoreSlug();
  const session = await getCustomerSessionToken();
  const cartToken = await getCartToken();
  const res = await EShopCartRequest.removeItem(
    slug,
    productVariantId,
    session,
    cartToken,
  );
  await persistToken(res.cartToken);
  return res.cart;
}

export async function clearCartAction(): Promise<EShopCartDto> {
  const slug = getEShopStoreSlug();
  const session = await getCustomerSessionToken();
  const cartToken = await getCartToken();
  try {
    const res = await EShopCartRequest.clear(slug, session, cartToken);
    await persistToken(res.cartToken);
    return res.cart;
  } catch (err) {
    // Carrito convertido / bloqueado: abrir sesión nueva.
    if (
      err instanceof EShopApiError &&
      /convertido|bloqueado/i.test(err.message)
    ) {
      await clearCartToken();
      const res = await EShopCartRequest.get(slug, session, null);
      await persistToken(res.cartToken);
      return res.cart;
    }
    throw err;
  }
}

/**
 * Descarta el token de carrito (p. ej. tras pedido pagado) y abre uno vacío nuevo.
 */
export async function startFreshCartAfterOrderAction(): Promise<EShopCartDto> {
  await clearCartToken();
  const slug = getEShopStoreSlug();
  const session = await getCustomerSessionToken();
  const res = await EShopCartRequest.get(slug, session, null);
  await persistToken(res.cartToken);
  return res.cart;
}

export async function mergeGuestCartAction(): Promise<EShopCartDto | null> {
  const session = await getCustomerSessionToken();
  if (!session) return null;
  const slug = getEShopStoreSlug();
  const cartToken = await getCartToken();
  const res = await EShopCartRequest.merge(slug, session, cartToken);
  await persistToken(res.cartToken);
  return res.cart;
}

export async function lockCartForCheckoutAction(): Promise<EShopCartDto> {
  const slug = getEShopStoreSlug();
  const session = await getCustomerSessionToken();
  const cartToken = await getCartToken();
  const res = await EShopCartRequest.lock(slug, session, cartToken);
  await persistToken(res.cartToken);
  return res.cart;
}

export async function unlockCartAction(): Promise<EShopCartDto> {
  const slug = getEShopStoreSlug();
  const session = await getCustomerSessionToken();
  const cartToken = await getCartToken();
  const res = await EShopCartRequest.unlock(slug, session, cartToken);
  await persistToken(res.cartToken);
  return res.cart;
}

export async function resetCartSessionAction(): Promise<void> {
  await clearCartToken();
}
