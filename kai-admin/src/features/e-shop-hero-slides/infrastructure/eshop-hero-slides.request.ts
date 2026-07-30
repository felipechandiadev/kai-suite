import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveMultimediaPublicUrl } from "@/features/multimedia/utils/resolve-multimedia-public-url";
import type { EShopHeroSlideRow } from "../types/hero-slide.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    const msg = data.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string" && msg.trim()) return msg;
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`;
}

export class EShopHeroSlidesRequest {
  static async list(): Promise<EShopHeroSlideRow[]> {
    const res = await fetch(apiUrl("/e-shop/admin/hero-slides"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = (await res.json()) as EShopHeroSlideRow[];
    return rows.map((row) => ({
      ...row,
      imageUrl: row.imageUrl ? resolveMultimediaPublicUrl(row.imageUrl) : null,
    }));
  }

  static async create(
    body: Omit<EShopHeroSlideRow, "id" | "imageUrl" | "sortOrder"> & {
      sortOrder?: number;
      textColor?: string | null;
    },
  ) {
    const res = await fetch(apiUrl("/e-shop/admin/hero-slides"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { success: false as const, error: await parseError(res) };
    }
    const slide = (await res.json()) as EShopHeroSlideRow;
    return { success: true as const, slide };
  }

  static async update(id: string, body: Partial<Omit<EShopHeroSlideRow, "id" | "imageUrl">>) {
    const res = await fetch(apiUrl(`/e-shop/admin/hero-slides/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { success: false as const, error: await parseError(res) };
    }
    const slide = (await res.json()) as EShopHeroSlideRow;
    return { success: true as const, slide };
  }

  static async remove(id: string) {
    const res = await fetch(apiUrl(`/e-shop/admin/hero-slides/${id}`), {
      method: "DELETE",
      headers: await authHeaders(),
    });
    if (!res.ok) {
      return { success: false as const, error: await parseError(res) };
    }
    return { success: true as const };
  }

  static async getSliderSettings() {
    const res = await fetch(apiUrl("/e-shop/admin/hero-slider-settings"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return { success: false as const, error: await parseError(res) };
    }
    const data = (await res.json()) as { autoplaySeconds: number };
    return { success: true as const, autoplaySeconds: data.autoplaySeconds };
  }

  static async updateSliderSettings(body: { autoplaySeconds: number }) {
    const res = await fetch(apiUrl("/e-shop/admin/hero-slider-settings"), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { success: false as const, error: await parseError(res) };
    }
    const data = (await res.json()) as { autoplaySeconds: number };
    return { success: true as const, autoplaySeconds: data.autoplaySeconds };
  }

  static async reorderOrder(orderedIds: string[]) {
    const res = await fetch(apiUrl("/e-shop/admin/hero-slides/order"), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) {
      return { success: false as const, error: await parseError(res) };
    }
    const slides = (await res.json()) as EShopHeroSlideRow[];
    return {
      success: true as const,
      slides: slides.map((row) => ({
        ...row,
        imageUrl: row.imageUrl ? resolveMultimediaPublicUrl(row.imageUrl) : null,
      })),
    };
  }
}
