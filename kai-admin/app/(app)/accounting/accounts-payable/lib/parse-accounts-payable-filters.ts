import type { AccountsPayableListFilters } from "@/features/accounting-accounts-payable/types/accounts-payable.types";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export function parseAccountsPayableFilters(
  sp: Record<string, string | string[] | undefined>,
): AccountsPayableListFilters {
  const filters: AccountsPayableListFilters = {};
  const sourceType = parseSp(sp, "sourceType");
  const status = parseSp(sp, "status");
  const payeeType = parseSp(sp, "payeeType");
  const fromDate = parseSp(sp, "fromDate");
  const toDate = parseSp(sp, "toDate");
  const search = parseSp(sp, "search");

  if (sourceType) filters.sourceType = sourceType;
  if (status) filters.status = status;
  if (payeeType) filters.payeeType = payeeType;
  if (fromDate) filters.fromDate = fromDate;
  if (toDate) filters.toDate = toDate;
  if (search) filters.search = search;

  return filters;
}
