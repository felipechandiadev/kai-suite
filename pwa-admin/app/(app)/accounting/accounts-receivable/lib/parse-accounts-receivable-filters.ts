import type { AccountsReceivableListForGridInput } from "@/features/accounting-accounts-receivable/types/accounts-receivable.types";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

function parseBool(sp: Record<string, string | string[] | undefined>, key: string): boolean {
  const v = parseSp(sp, key).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function parseAccountsReceivableFilters(
  sp: Record<string, string | string[] | undefined>,
  opts?: { calendar?: boolean },
): AccountsReceivableListForGridInput {
  const page = Math.max(1, parseInt(parseSp(sp, "page") || "1", 10) || 1);
  const limit = Math.min(
    opts?.calendar ? 500 : 200,
    Math.max(1, parseInt(parseSp(sp, "limit") || "25", 10) || 25),
  );
  const search = parseSp(sp, "search");
  const status = parseSp(sp, "status");
  const fromDate = parseSp(sp, "fromDate");
  const toDate = parseSp(sp, "toDate");

  const filters: AccountsReceivableListForGridInput = { page, limit };
  if (search) filters.search = search;
  if (status) filters.status = status;
  if (fromDate) filters.fromDate = fromDate;
  if (toDate) filters.toDate = toDate;
  if (parseBool(sp, "overdueOnly")) filters.overdueOnly = true;
  if (parseBool(sp, "includePaid")) filters.includePaid = true;

  return filters;
}
