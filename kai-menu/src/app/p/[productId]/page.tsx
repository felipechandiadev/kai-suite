import { MenuProductDetailClient } from "@/features/menu/ui/MenuProductDetailClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ productId: string }>;
};

export default async function MenuProductPage({ params }: PageProps) {
  const { productId } = await params;
  return <MenuProductDetailClient productId={productId} />;
}
