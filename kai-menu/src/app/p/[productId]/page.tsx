import { MenuProductDetailClient } from "@/features/menu/ui/MenuProductDetailClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
};

export default async function MenuProductPage({ params, searchParams }: PageProps) {
  const { productId } = await params;
  const sp = await searchParams;
  const raw = sp.variant;
  const initialVariantId = Array.isArray(raw) ? raw[0] ?? null : raw?.trim() || null;
  return (
    <MenuProductDetailClient productId={productId} initialVariantId={initialVariantId} />
  );
}
