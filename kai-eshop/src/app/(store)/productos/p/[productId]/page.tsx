import type { Metadata } from "next";
import { getCatalogProductAction } from "@/features/e-shop-storefront/actions/storefront.action";
import {
  buildProductDetailSeo,
  productDetailMetadata,
} from "@/features/e-shop-storefront/utils/product-detail-seo";
import { StorePageShell } from "@/shared/components/StorePageShell";
import { EShopProductDetailView } from "@/shared/components/EShopProductDetailView";

type PageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ variant?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const { variant } = await searchParams;

  try {
    const detail = await getCatalogProductAction(productId);
    const seo = buildProductDetailSeo(detail, variant ?? null);
    return productDetailMetadata(seo);
  } catch {
    return {
      title: "Producto",
      description: "Tienda en línea",
    };
  }
}

export default async function CatalogProductDetailPage({ params, searchParams }: PageProps) {
  const { productId } = await params;
  const { variant } = await searchParams;
  const detail = await getCatalogProductAction(productId);
  const seo = buildProductDetailSeo(detail, variant ?? null);

  return (
    <StorePageShell>
      <EShopProductDetailView detail={detail} initialVariantId={variant ?? null} />
    </StorePageShell>
  );
}
