import { Suspense } from "react";
import CreateProductPage from "@/features/product/components/CreateProductPage";
import { parseCreateProductSearchParams } from "@/features/product/lib/product-routes";
import PageLoading from "@/shared/components/PageLoading";

export const dynamic = "force-dynamic";

export default async function CreateProductRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const parsed = parseCreateProductSearchParams(sp);

  return (
    <Suspense fallback={<PageLoading />}>
      <CreateProductPage scannedCode={parsed?.code ?? ""} mode={parsed?.mode ?? "barcode"} />
    </Suspense>
  );
}
