import {
  getCustomerPosDetailBundleAction,
  searchPosCustomersAction,
} from "@/features/customers/actions/customers-pos.action";
import {
  POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE,
  POS_CUSTOMER_SEARCH_MAX,
  POS_CUSTOMER_SEARCH_MIN,
} from "@/features/customers/lib/posCustomerSearchStorage";
import type { PosCustomerSearchInitial } from "@/features/customers/ui/PosCustomerSearchPanel";
import { POS_CUSTOMER_URL_KEYS } from "@/features/customers/ui/PosCustomerSearchPanel";
import type { PosCustomerDetailBundle } from "@/features/customers/types/pos-customer-detail.types";
import { parsePosCustomerDetailBundlePaging } from "@/features/customers/lib/pos-customer-detail-url";
import { getInternalCustomerCreditEnabledAction } from "@/features/company/actions/company-internal-customer-credit.action";
import { Suspense } from "react";
import { isPosCustomerUuid } from "@/features/customers/lib/pos-customer-url";
import CustomersPageClient from "./ui/CustomersPageClient";

export const dynamic = "force-dynamic";

function parseSp(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const v = sp[key];
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const customerQuery = parseSp(sp, POS_CUSTOMER_URL_KEYS.query).trim();
  const customerPage = clamp(
    parseInt(parseSp(sp, POS_CUSTOMER_URL_KEYS.page) || "1", 10),
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const customerPageSize = clamp(
    parseInt(
      parseSp(sp, POS_CUSTOMER_URL_KEYS.pageSize) || String(POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE),
      10,
    ),
    POS_CUSTOMER_SEARCH_MIN,
    POS_CUSTOMER_SEARCH_MAX,
  );

  const res = await searchPosCustomersAction({
    query: customerQuery,
    page: customerPage,
    pageSize: customerPageSize,
  });

  const initialCustomerSearch: PosCustomerSearchInitial = res.success
    ? {
        query: customerQuery,
        page: res.page || customerPage,
        pageSize: res.pageSize || customerPageSize,
        items: res.customers,
        total: res.total,
        error: null,
      }
    : {
        query: customerQuery,
        page: customerPage,
        pageSize: customerPageSize,
        items: [],
        total: 0,
        error: res.message,
      };

  const customerIdParam = parseSp(sp, POS_CUSTOMER_URL_KEYS.selectedId).trim();
  const customerIdValid = !customerIdParam || isPosCustomerUuid(customerIdParam);

  const detailPaging = parsePosCustomerDetailBundlePaging((key) => parseSp(sp, key));

  let detailBundle: PosCustomerDetailBundle | null = null;
  if (customerIdParam && customerIdValid) {
    detailBundle = await getCustomerPosDetailBundleAction(customerIdParam, detailPaging);
  }

  const internalCreditEnabled = await getInternalCustomerCreditEnabledAction();

  return (
    <div className="h-full min-h-0">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Cargando clientes…</p>
        }
      >
        <CustomersPageClient
          initialCustomerSearch={initialCustomerSearch}
          customerIdParam={customerIdParam}
          detailBundle={detailBundle}
          internalCreditEnabled={internalCreditEnabled}
        />
      </Suspense>
    </div>
  );
}
