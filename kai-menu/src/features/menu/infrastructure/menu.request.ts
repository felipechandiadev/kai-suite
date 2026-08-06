const base = () =>
  (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(
    /\/$/,
    "",
  );

const slug = () =>
  (process.env.NEXT_PUBLIC_MENU_STORE_SLUG || process.env.MENU_STORE_SLUG || "kai-food").trim();

export type MenuStorefront = {
  companyName: string;
  companyLogoUrl: string | null;
  topBar: {
    showLogo: boolean;
    showCompanyName: boolean;
    navLinks: Array<{ label: string; href: string; enabled: boolean }>;
  };
  about: { title: string; body: string };
  findUs: {
    title: string;
    address: string;
    phone: string;
    hours: string;
  };
  heroSlides: Array<{
    id: string;
    title: string | null;
    subtitle: string | null;
    imageUrl?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
    textColor?: string | null;
    overlayOpacity?: number | null;
  }>;
  heroSliderAutoplaySeconds?: number;
};

export type MenuCatalogItem = {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string | null;
  categoryName: string | null;
  imageUrl?: string | null;
  attributeValues?: Record<string, string>;
};

export type MenuCategory = { id: string; name: string };

export type MenuProductDetail = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  multimedia: Array<{
    id: string;
    publicUrl: string | null;
    isPrimary: boolean;
    mimeType: string | null;
  }>;
  variants: Array<{
    id: string;
    sku: string;
    basePrice: number;
    attributeValues: Record<string, string>;
  }>;
};

async function menuFetch<T>(path: string): Promise<T | null> {
  const api = base();
  if (!api) return null;
  try {
    const res = await fetch(`${api}/api/menu/${path}`, {
      headers: { "X-Menu-Store-Slug": slug() },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchMenuStorefront(): Promise<MenuStorefront | null> {
  return menuFetch<MenuStorefront>("storefront");
}

export async function fetchMenuCatalog(
  search?: string,
  categoryIds?: string[],
) {
  const qs = new URLSearchParams();
  if (search?.trim()) qs.set("search", search.trim());
  const ids = (categoryIds ?? []).map((id) => id.trim()).filter(Boolean);
  if (ids.length === 1) {
    qs.set("categoryId", ids[0]!);
  } else if (ids.length > 1) {
    qs.set("categoryIds", ids.join(","));
  }
  qs.set("limit", "96");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return menuFetch<{ items: MenuCatalogItem[]; total: number }>(`catalog${suffix}`);
}

export async function fetchMenuCategories(): Promise<MenuCategory[]> {
  const data = await menuFetch<MenuCategory[]>("categories");
  return Array.isArray(data) ? data : [];
}

export async function fetchMenuProduct(
  productId: string,
): Promise<MenuProductDetail | null> {
  if (!productId.trim()) return null;
  return menuFetch<MenuProductDetail>(`products/${encodeURIComponent(productId)}`);
}
