import { notFound } from "next/navigation";
import { getProductVariantDetailForPage } from "@/features/inventory-products/actions/product.action";
import ProductVariantDetailPage from "./ui/ProductVariantDetailPage";

export const dynamic = "force-dynamic";

export default async function ProductVariantRoutePage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = await params;
  const res = await getProductVariantDetailForPage(variantId);
  if (!res.ok) {
    notFound();
  }
  return <ProductVariantDetailPage product={res.product} variant={res.variant} />;
}
