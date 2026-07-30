import { cookies } from "next/headers";

export const ESHOP_CART_TOKEN_COOKIE = "eshop_cart_token";

export async function getCartToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ESHOP_CART_TOKEN_COOKIE)?.value ?? null;
}

export async function setCartToken(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(ESHOP_CART_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCartToken(): Promise<void> {
  const jar = await cookies();
  jar.delete(ESHOP_CART_TOKEN_COOKIE);
}
