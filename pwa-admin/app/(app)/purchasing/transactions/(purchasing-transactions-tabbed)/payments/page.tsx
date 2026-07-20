import { Suspense } from "react";
import { listSupplierPaymentsAction } from "@/features/purchasing-supplier-payments/actions/supplier-payments.action";
import SupplierPaymentsDataGrid from "./ui/SupplierPaymentsDataGrid";
import { LoadingState } from "@kai/ui";

export const dynamic = "force-dynamic";

function parseSp(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function SupplierPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(parseSp(sp, "page") || "1", 10) || 1);
  const limit = Math.min(
    200,
    Math.max(1, parseInt(parseSp(sp, "limit") || "25", 10) || 25),
  );
  const search = parseSp(sp, "search");

  const res = await listSupplierPaymentsAction({
    page,
    limit,
    search: search || undefined,
  });

  const rows = res.success ? res.data.rows : [];
  const total = res.success ? res.data.total : 0;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col p-0"
      data-test-id="purchasing-transactions-payments-page-root"
    >
      <Suspense
        fallback={
          <LoadingState
            className="flex items-center justify-center py-4"
            data-test-id="purchasing-transactions-payments-skeleton"
          />
        }
      >
        <SupplierPaymentsDataGrid rows={rows} total={total} />
      </Suspense>
      {!res.success ? (
        <p
          className="p-4 text-sm text-error"
          data-test-id="purchasing-transactions-payments-page-error"
        >
          {res.error}
        </p>
      ) : null}
    </div>
  );
}
