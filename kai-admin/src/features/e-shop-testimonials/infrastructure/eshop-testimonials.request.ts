import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

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

export type EShopTestimonialRow = {
  id: string;
  clientName: string;
  rating: number;
  message: string;
  isActive: boolean;
  sortOrder: number;
  avatarUrl?: string | null;
};

export class EShopTestimonialsRequest {
  static async list(): Promise<EShopTestimonialRow[]> {
    const res = await fetch(apiUrl("/e-shop/admin/testimonials"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async create(body: Omit<EShopTestimonialRow, "id">) {
    const res = await fetch(apiUrl("/e-shop/admin/testimonials"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async remove(id: string) {
    const res = await fetch(apiUrl(`/e-shop/admin/testimonials/${id}`), {
      method: "DELETE",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }
}
