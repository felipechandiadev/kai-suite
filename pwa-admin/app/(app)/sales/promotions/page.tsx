import { Suspense } from "react";
import { listPromotionsAction } from "@/features/promotions/actions/promotions.action";
import { PromotionsPageContent } from "./PromotionsPageContent";
import { LoadingState } from '@kai/ui';

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
    search: parseStr(sp.search),
    isActive: parseStr(sp.isActive),
    type: parseStr(sp.type),
    activation: parseStr(sp.activation),
  };

  const res = await listPromotionsAction(filters);

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" />
      }
    >
      <PromotionsPageContent
        initialItems={res.success ? res.items : []}
        initialTotal={res.success ? res.total : 0}
        loadError={res.success ? null : res.error}
        initialFilters={filters}
      />
    </Suspense>
  );
}
