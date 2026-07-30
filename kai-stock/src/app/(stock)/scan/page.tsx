import { Suspense } from "react";
import ScanPage from "@/features/variant/components/ScanPage";
import PageLoading from "@/shared/components/PageLoading";

export const dynamic = "force-dynamic";

export default function ScanRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ScanPage />
    </Suspense>
  );
}
