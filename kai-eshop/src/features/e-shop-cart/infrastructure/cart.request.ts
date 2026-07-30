import { getServerBackendApiBase } from "@/lib/backend-api-url";
import { parseEshopErrorResponse } from "@/features/e-shop-storefront/infrastructure/eshop-api-error";
import type { EShopCartDto } from "../types/cart.types";

const slugHeader = (slug: string) => ({ "X-EShop-Store-Slug": slug });

function apiUrl(path: string): string {
  const base = getServerBackendApiBase();
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

type CartResponse = { cart: EShopCartDto; cartToken: string; created?: boolean };

async function parseCartResponse(
  res: Response,
): Promise<{ data: CartResponse; cartToken: string | null }> {
  if (!res.ok) {
    throw await parseEshopErrorResponse(res);
  }
  const cartToken = res.headers.get("x-cart-token");
  const data = (await res.json()) as CartResponse;
  return { data, cartToken: cartToken ?? data.cartToken ?? null };
}

function buildHeaders(
  slug: string,
  sessionToken?: string | null,
  cartToken?: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...slugHeader(slug),
  };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  if (cartToken) headers["x-cart-token"] = cartToken;
  return headers;
}

export class EShopCartRequest {
  static async get(
    slug: string,
    sessionToken?: string | null,
    cartToken?: string | null,
  ): Promise<CartResponse> {
    const res = await fetch(apiUrl("/e-shop/cart"), {
      headers: buildHeaders(slug, sessionToken, cartToken),
      cache: "no-store",
    });
    const { data } = await parseCartResponse(res);
    return data;
  }

  static async revalidate(
    slug: string,
    sessionToken?: string | null,
    cartToken?: string | null,
  ): Promise<CartResponse> {
    const res = await fetch(apiUrl("/e-shop/cart/revalidate"), {
      method: "POST",
      headers: buildHeaders(slug, sessionToken, cartToken),
      cache: "no-store",
    });
    const { data } = await parseCartResponse(res);
    return data;
  }

  static async addItem(
    slug: string,
    body: { productVariantId: string; quantity: number; imageUrl?: string | null },
    sessionToken?: string | null,
    cartToken?: string | null,
  ): Promise<CartResponse> {
    const res = await fetch(apiUrl("/e-shop/cart/items"), {
      method: "POST",
      headers: buildHeaders(slug, sessionToken, cartToken),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const { data } = await parseCartResponse(res);
    return data;
  }

  static async updateQty(
    slug: string,
    productVariantId: string,
    quantity: number,
    sessionToken?: string | null,
    cartToken?: string | null,
  ): Promise<CartResponse> {
    const res = await fetch(apiUrl(`/e-shop/cart/items/${encodeURIComponent(productVariantId)}`), {
      method: "PATCH",
      headers: buildHeaders(slug, sessionToken, cartToken),
      body: JSON.stringify({ quantity }),
      cache: "no-store",
    });
    const { data } = await parseCartResponse(res);
    return data;
  }

  static async removeItem(
    slug: string,
    productVariantId: string,
    sessionToken?: string | null,
    cartToken?: string | null,
  ): Promise<CartResponse> {
    const res = await fetch(
      apiUrl(`/e-shop/cart/items/${encodeURIComponent(productVariantId)}`),
      {
        method: "DELETE",
        headers: buildHeaders(slug, sessionToken, cartToken),
        cache: "no-store",
      },
    );
    const { data } = await parseCartResponse(res);
    return data;
  }

  static async clear(
    slug: string,
    sessionToken?: string | null,
    cartToken?: string | null,
  ): Promise<CartResponse> {
    const res = await fetch(apiUrl("/e-shop/cart"), {
      method: "DELETE",
      headers: buildHeaders(slug, sessionToken, cartToken),
      cache: "no-store",
    });
    const { data } = await parseCartResponse(res);
    return data;
  }

  static async merge(
    slug: string,
    sessionToken: string,
    cartToken?: string | null,
  ): Promise<CartResponse> {
    const res = await fetch(apiUrl("/e-shop/cart/merge"), {
      method: "POST",
      headers: buildHeaders(slug, sessionToken, cartToken),
      cache: "no-store",
    });
    const { data } = await parseCartResponse(res);
    return data;
  }

  static async lock(
    slug: string,
    sessionToken?: string | null,
    cartToken?: string | null,
    reason = "checkout",
  ): Promise<CartResponse> {
    const res = await fetch(apiUrl("/e-shop/cart/lock"), {
      method: "POST",
      headers: buildHeaders(slug, sessionToken, cartToken),
      body: JSON.stringify({ reason }),
      cache: "no-store",
    });
    const { data } = await parseCartResponse(res);
    return data;
  }

  static async unlock(
    slug: string,
    sessionToken?: string | null,
    cartToken?: string | null,
  ): Promise<CartResponse> {
    const res = await fetch(apiUrl("/e-shop/cart/unlock"), {
      method: "POST",
      headers: buildHeaders(slug, sessionToken, cartToken),
      cache: "no-store",
    });
    const { data } = await parseCartResponse(res);
    return data;
  }
}
