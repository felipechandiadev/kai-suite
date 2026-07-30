import { getServerBackendApiBase } from "@/lib/backend-api-url";
import { parseEshopErrorResponse } from "./eshop-api-error";

const slugHeader = (slug: string) => ({ "X-EShop-Store-Slug": slug });

function apiUrl(path: string): string {
  const base = getServerBackendApiBase();
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

export class EShopRequest {
  static async get<T>(slug: string, path: string, sessionToken?: string | null): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...slugHeader(slug),
    };
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
    const res = await fetch(apiUrl(path), {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw await parseEshopErrorResponse(res);
    }
    return res.json() as Promise<T>;
  }

  static async post<T>(
    slug: string,
    path: string,
    body: unknown,
    sessionToken?: string | null,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...slugHeader(slug),
    };
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      throw await parseEshopErrorResponse(res);
    }
    return res.json() as Promise<T>;
  }
}
