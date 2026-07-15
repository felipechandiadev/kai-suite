export type CustomerListPage = {
  page: number;
  pageSize: number;
  skip: number;
};

/** Default limit 5; clamp page ≥ 1, pageSize 1–100. */
export function normalizeCustomerListPage(input?: {
  page?: number | string | null;
  pageSize?: number | string | null;
  limit?: number | string | null;
}): CustomerListPage {
  const rawPage = Number(input?.page);
  const rawSize = Number(input?.pageSize ?? input?.limit);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize >= 1
      ? Math.min(100, Math.floor(rawSize))
      : 5;
  return { page, pageSize, skip: (page - 1) * pageSize };
}
