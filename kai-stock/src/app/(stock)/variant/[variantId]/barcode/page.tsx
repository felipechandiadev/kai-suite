import { Suspense } from "react";
import UpdateBarcodePage from "@/features/variant/components/UpdateBarcodePage";
import PageLoading from "@/shared/components/PageLoading";

export const dynamic = "force-dynamic";

export default function VariantBarcodeRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <UpdateBarcodePage />
    </Suspense>
  );
}
