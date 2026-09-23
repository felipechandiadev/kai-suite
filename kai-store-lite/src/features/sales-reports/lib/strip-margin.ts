import type { SalesReportRunResult } from "@/features/sales-reports/types/sales-report.types";

const MARGIN_SUMMARY_KEYS = new Set([
  "grossMargin",
  "marginCoveragePct",
  "margin",
  "cogs",
  "unitCost",
]);

function isMarginColumnKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k === "margin" ||
    k === "grossmargin" ||
    k === "unitcost" ||
    k === "cogs" ||
    k.includes("margin") ||
    k.includes("cobertura")
  );
}

function isMarginFootnote(text: string): boolean {
  return /margen|unitCost|cobertura de margen|sin costo|con costo/i.test(text);
}

function omitKeys<T extends Record<string, unknown>>(
  obj: T | undefined,
  drop: (key: string) => boolean,
): T | undefined {
  if (!obj) return obj;
  const next = { ...obj };
  for (const key of Object.keys(next)) {
    if (drop(key)) delete next[key];
  }
  return next;
}

/**
 * Lite no opera costos/compras: oculta KPIs, columnas y notas de margen.
 */
export function stripMarginFromSalesReport(
  result: SalesReportRunResult,
): SalesReportRunResult {
  const columns = result.columns.filter((c) => !isMarginColumnKey(c.key));
  const dropCol = new Set(
    result.columns.filter((c) => isMarginColumnKey(c.key)).map((c) => c.key),
  );

  const rows = result.rows.map((row) => {
    if (dropCol.size === 0) return row;
    const next = { ...row };
    for (const key of dropCol) delete next[key];
    return next;
  });

  const summary = omitKeys(
    result.summary as Record<string, unknown>,
    (k) => MARGIN_SUMMARY_KEYS.has(k) || isMarginColumnKey(k),
  ) as SalesReportRunResult["summary"];

  const summaryDelta = omitKeys(
    result.summaryDelta as Record<string, unknown> | undefined,
    (k) => MARGIN_SUMMARY_KEYS.has(k) || isMarginColumnKey(k),
  ) as SalesReportRunResult["summaryDelta"];

  const totals = omitKeys(
    result.totals as Record<string, unknown> | undefined,
    (k) => MARGIN_SUMMARY_KEYS.has(k) || isMarginColumnKey(k),
  ) as SalesReportRunResult["totals"];

  const footnotes = result.footnotes?.filter((f) => !isMarginFootnote(f));

  return {
    ...result,
    summary,
    summaryDelta,
    columns,
    rows,
    totals,
    footnotes: footnotes?.length ? footnotes : undefined,
    marginQuality: undefined,
  };
}
