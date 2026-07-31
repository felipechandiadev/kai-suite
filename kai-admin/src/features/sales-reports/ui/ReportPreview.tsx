"use client";

import { useId, useState } from "react";
import { IconButton } from "@kai/ui";
import { ReportCharts } from "./ReportCharts";
import { KpiBulletChart, shouldUseKpiBullet } from "./KpiBulletChart";
import {
  formatReportCell,
  formatReportColumnLabel,
  formatReportParamLabel,
  formatReportParamValue,
  formatReportPercent,
  formatReportSummaryLabel,
  formatReportSummaryValue,
} from "@/features/sales-reports/lib/report-dates";
import { salesReportKpiHelp } from "@/features/sales-reports/lib/report-kpi-help";
import type {
  SalesReportRunResult,
  SalesReportSummaryDelta,
} from "@/features/sales-reports/types/sales-report.types";

type Props = {
  result: SalesReportRunResult | null;
  companyLabel?: string;
};

function KpiInfoButton({ help }: { help: string }) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  return (
    <span className="relative inline-flex shrink-0">
      <IconButton
        icon="Info"
        variant="text"
        size="xs"
        ariaLabel="Más información"
        aria-describedby={open ? tipId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
        className="!h-5 !w-5 text-muted-foreground hover:text-foreground"
        data-test-id="sales-report-kpi-info"
      />
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-md border border-border bg-background px-2.5 py-2 text-left text-[11px] font-normal normal-case tracking-normal text-foreground shadow-md"
        >
          {help}
        </span>
      ) : null}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: SalesReportSummaryDelta }) {
  if (delta.deltaPct == null || !Number.isFinite(delta.deltaPct)) {
    return (
      <span className="shrink-0 text-[10px] font-medium text-muted-foreground">vs ant. —</span>
    );
  }
  const up = delta.deltaPct > 0.05;
  const down = delta.deltaPct < -0.05;
  const tone = up
    ? "text-emerald-700 dark:text-emerald-400"
    : down
      ? "text-red-700 dark:text-red-400"
      : "text-muted-foreground";
  const arrow = up ? "↑" : down ? "↓" : "→";
  return (
    <span className={`shrink-0 text-[10px] font-medium tabular-nums ${tone}`}>
      {arrow} {formatReportPercent(Math.abs(delta.deltaPct))}
    </span>
  );
}

export function ReportPreview({ result, companyLabel }: Props) {
  if (!result) {
    return (
      <div
        className="min-h-[320px] rounded-xl border border-dashed border-border bg-muted/20"
        data-test-id="sales-report-empty"
        aria-hidden
      />
    );
  }

  const summaryEntries = Object.entries(result.summary);
  const bulletEntries = summaryEntries.filter(([key, value]) =>
    shouldUseKpiBullet(key, value, result.summaryDelta?.[key]),
  );
  const cardEntries = summaryEntries.filter(
    ([key, value]) => !shouldUseKpiBullet(key, value, result.summaryDelta?.[key]),
  );

  return (
    <div
      className="sales-report-print-root rounded-xl border border-border bg-background p-5 shadow-sm print:border-0 print:p-0 print:shadow-none"
      data-test-id="sales-report-preview"
    >
      <header className="mb-5 border-b border-border pb-4 print:border-neutral-300">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {companyLabel || "Kai Admin"} · Reportes de ventas
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

      {bulletEntries.length > 0 ? (
        <section
          className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3"
          data-test-id="sales-report-kpi-bullets"
        >
          {bulletEntries.map(([key, value]) => {
            const help = salesReportKpiHelp(key);
            const delta = result.summaryDelta![key]!;
            return (
              <KpiBulletChart
                key={key}
                label={formatReportSummaryLabel(key)}
                formattedValue={formatReportSummaryValue(key, value)}
                delta={delta}
                helpSlot={help ? <KpiInfoButton help={help} /> : undefined}
                deltaSlot={<DeltaBadge delta={delta} />}
                testId={`sales-report-kpi-${key}`}
              />
            );
          })}
        </section>
      ) : null}

      {cardEntries.length > 0 ? (
        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4">
          {cardEntries.map(([key, value]) => {
            const help = salesReportKpiHelp(key);
            const delta = result.summaryDelta?.[key];
            return (
              <div
                key={key}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2 print:border-neutral-300"
                data-test-id={`sales-report-kpi-${key}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {formatReportSummaryLabel(key)}
                  </p>
                  {help ? <KpiInfoButton help={help} /> : null}
                </div>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {formatReportSummaryValue(key, value)}
                </p>
                {delta ? (
                  <div className="mt-1">
                    <DeltaBadge delta={delta} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {result.marginQuality ? (
        <p className="mb-4 text-xs text-muted-foreground">
          Cobertura de margen: {result.marginQuality.coveragePct}% (
          {result.marginQuality.linesWithCost} con costo /{" "}
          {result.marginQuality.linesWithCost + result.marginQuality.linesMissingCost} líneas)
        </p>
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
                        {formatReportCell(c.key, row[c.key], {
                          metricKey:
                            typeof row.metric === "string" ? row.metric : undefined,
                        })}
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
