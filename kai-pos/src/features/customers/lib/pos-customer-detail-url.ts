/**
 * Query keys for paginated detail sections on /customers.
 * Prefixed to avoid clashing with customer search (`customerPage`, etc.).
 */
export const POS_CUSTOMER_DETAIL_LIST_URL_KEYS = {
  purchasesPage: "purchasesPage",
  purchasesLimit: "purchasesLimit",
  paymentsPage: "paymentsPage",
  paymentsLimit: "paymentsLimit",
  backordersPage: "backordersPage",
  backordersLimit: "backordersLimit",
  returnsPage: "returnsPage",
  returnsLimit: "returnsLimit",
  creditNotesPage: "creditNotesPage",
  creditNotesLimit: "creditNotesLimit",
} as const;

export const POS_CUSTOMER_DETAIL_LIST_DEFAULT_LIMIT = 5;
export const POS_CUSTOMER_DETAIL_LIST_LIMIT_OPTIONS = [5, 10, 25, 50, 100] as const;
export const POS_CUSTOMER_DETAIL_LIST_MAX_LIMIT = 100;

export type PosCustomerDetailListPaging = {
  page: number;
  pageSize: number;
};

export type PosCustomerDetailBundlePaging = {
  purchases: PosCustomerDetailListPaging;
  payments: PosCustomerDetailListPaging;
  backorders: PosCustomerDetailListPaging;
  returns: PosCustomerDetailListPaging;
  creditNotes: PosCustomerDetailListPaging;
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function parsePosCustomerDetailListPaging(
  pageRaw: string | null | undefined,
  limitRaw: string | null | undefined,
): PosCustomerDetailListPaging {
  const page = clamp(parseInt(pageRaw || "1", 10), 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clamp(
    parseInt(limitRaw || String(POS_CUSTOMER_DETAIL_LIST_DEFAULT_LIMIT), 10),
    1,
    POS_CUSTOMER_DETAIL_LIST_MAX_LIMIT,
  );
  return { page, pageSize };
}

export function parsePosCustomerDetailBundlePaging(get: (key: string) => string): PosCustomerDetailBundlePaging {
  const K = POS_CUSTOMER_DETAIL_LIST_URL_KEYS;
  return {
    purchases: parsePosCustomerDetailListPaging(get(K.purchasesPage), get(K.purchasesLimit)),
    payments: parsePosCustomerDetailListPaging(get(K.paymentsPage), get(K.paymentsLimit)),
    backorders: parsePosCustomerDetailListPaging(get(K.backordersPage), get(K.backordersLimit)),
    returns: parsePosCustomerDetailListPaging(get(K.returnsPage), get(K.returnsLimit)),
    creditNotes: parsePosCustomerDetailListPaging(get(K.creditNotesPage), get(K.creditNotesLimit)),
  };
}

export function emptyPosCustomerDetailBundlePaging(): PosCustomerDetailBundlePaging {
  const one = {
    page: 1,
    pageSize: POS_CUSTOMER_DETAIL_LIST_DEFAULT_LIMIT,
  };
  return {
    purchases: { ...one },
    payments: { ...one },
    backorders: { ...one },
    returns: { ...one },
    creditNotes: { ...one },
  };
}

export function posCustomerDetailPagingFingerprint(
  paging: PosCustomerDetailBundlePaging,
): string {
  return [
    paging.purchases.page,
    paging.purchases.pageSize,
    paging.payments.page,
    paging.payments.pageSize,
    paging.backorders.page,
    paging.backorders.pageSize,
    paging.returns.page,
    paging.returns.pageSize,
    paging.creditNotes.page,
    paging.creditNotes.pageSize,
  ].join("|");
}
