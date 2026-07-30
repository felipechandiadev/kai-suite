import { Suspense } from "react";
import { listSupplierReceiptsForPage } from "@/features/purchasing-supplier-receipts/actions/supplier-receipt.action";
import DteReceiptsDataGrid from "./ui/DteReceiptsDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function DteReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(parseSp(sp, "page") || "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(parseSp(sp, "limit") || "25", 10) || 25));
  const search = parseSp(sp, "search");

  const res = await listSupplierReceiptsForPage({ page, limit, search: search || undefined });

  return (
    <div className="min-h-0 min-w-0 p-0" data-test-id="dte-receipts-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="dte-receipts-skeleton" />
        }
      >
        <DteReceiptsDataGrid rows={res.data} total={res.total} />
      </Suspense>
    </div>
  );
}
