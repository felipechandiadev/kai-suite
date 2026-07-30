import { Suspense } from "react";
import VariantDetailPage from "@/features/variant/components/VariantDetailPage";
import PageLoading from "@/shared/components/PageLoading";

export const dynamic = "force-dynamic";

export default function VariantDetailRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VariantDetailPage />
    </Suspense>
  );
}
