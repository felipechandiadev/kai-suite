import { cookies } from "next/headers";

const COOKIE_NAME = "eshop_customer_session";

export async function getCustomerSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

export async function setCustomerSessionToken(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCustomerSessionToken(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
