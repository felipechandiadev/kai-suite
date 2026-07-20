"use client";

import { ReportCharts } from "./ReportCharts";
import {
  formatReportCell,
  formatReportColumnLabel,
  formatReportParamLabel,
  formatReportParamValue,
  formatReportSummaryLabel,
  formatReportSummaryValue,
} from "@/features/inventory-reports/lib/report-dates";
import type { InventoryReportRunResult } from "@/features/inventory-reports/types/inventory-report.types";

type Props = {
  result: InventoryReportRunResult | null;
  companyLabel?: string;
};

export function ReportPreview({ result, companyLabel }: Props) {
  if (!result) {
    return (
      <div
        className="min-h-[320px] rounded-xl border border-dashed border-border bg-muted/20"
        data-test-id="inventory-report-empty"
        aria-hidden
      />
    );
  }

  const summaryEntries = Object.entries(result.summary);

  return (
    <div
      className="inventory-report-print-root rounded-xl border border-border bg-background p-5 shadow-sm print:border-0 print:p-0 print:shadow-none"
      data-test-id="inventory-report-preview"
    >
      <header className="mb-5 border-b border-border pb-4 print:border-neutral-300">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {companyLabel || "Kai Admin"} · Reportes de inventario
        </p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{result.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Generado {new Date(result.generatedAt).toLocaleString("es-CL")}
          {result.truncated ? " · Resultado truncado" : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {Object.entries(result.params).map(([k, v]) =>
            v == null || v === "" ? null : (
              <span key={k} className="rounded bg-muted px-1.5 py-0.5">
                {formatReportParamLabel(k)}: {formatReportParamValue(k, v)}
              </span>
            ),
          )}
        </div>
      </header>

      {summaryEntries.length > 0 ? (
        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4">
          {summaryEntries.map(([key, value]) => (
            <div
              key={key}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2 print:border-neutral-300"
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {formatReportSummaryLabel(key)}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                {formatReportSummaryValue(key, value)}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="mb-6">
        <ReportCharts series={result.series} />
      </section>

      {result.columns.length > 0 ? (
        <section className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border print:border-neutral-400">
                {result.columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-2 py-2 font-semibold text-foreground ${
                      c.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {formatReportColumnLabel(c.key, c.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={result.columns.length}
                    className="px-2 py-6 text-center text-muted-foreground"
                  >
                    Sin filas para el período / filtros seleccionados.
                  </td>
                </tr>
              ) : (
                result.rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border/70 print:border-neutral-200"
                  >
                    {result.columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-2 py-1.5 tabular-nums ${
                          c.align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        {formatReportCell(c.key, row[c.key])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {result.totals ? (
              <tfoot>
                <tr className="border-t-2 border-border font-semibold print:border-neutral-400">
                  {result.columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={`px-2 py-2 ${c.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {i === 0
                        ? "Totales"
                        : result.totals?.[c.key] != null
                          ? formatReportCell(c.key, result.totals[c.key])
                          : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </section>
      ) : null}

      {result.footnotes?.length ? (
        <footer className="mt-5 space-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground print:border-neutral-300">
          {result.footnotes.map((f, i) => (
            <p key={i}>{f}</p>
          ))}
        </footer>
      ) : null}
    </div>
  );
}
