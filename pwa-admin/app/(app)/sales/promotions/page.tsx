import { Suspense } from "react";
import { listPromotionsAction } from "@/features/promotions/actions/promotions.action";
import PromotionsDataGrid from "./ui/PromotionsDataGrid";
import { LoadingState } from "@kai/ui";

export const dynamic = "force-dynamic";

function parseStr(value: unknown): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const filters = {
    page: parseStr(sp.page),
    limit: parseStr(sp.limit),
    search: parseStr(sp.search),
    isActive: parseStr(sp.isActive),
    type: parseStr(sp.type),
    activation: parseStr(sp.activation),
    sortField: parseStr(sp.sortField),
    sort: parseStr(sp.sort),
  };

  const res = await listPromotionsAction(filters);

  return (
    <div className="min-h-0 p-0" data-test-id="promotions-page-root">
      <Suspense
        fallback={
          <LoadingState
            className="flex items-center justify-center py-4"
            data-test-id="promotions-page-skeleton"
          />
        }
      >
        <PromotionsDataGrid
          rows={res.success ? res.items : []}
          total={res.success ? res.total : 0}
          loadError={res.success ? null : res.error}
        />
      </Suspense>
    </div>
  );
}
