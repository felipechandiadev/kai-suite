import { redirect } from "next/navigation";
import { getProductAction } from "@/features/e-shop-storefront/actions/storefront.action";

export default async function LegacyVariantProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductAction(id);
  const productId = product.productId != null ? String(product.productId) : "";
  if (!productId) {
    redirect("/productos");
  }
  redirect(`/productos/p/${productId}?variant=${id}`);
}
