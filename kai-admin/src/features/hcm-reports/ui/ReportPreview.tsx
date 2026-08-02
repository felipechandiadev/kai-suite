"use client";

import { ReportCharts } from "@/shared/reports";
import type { HcmReportRunResult } from "@/features/hcm-reports/types/hcm-report.types";

type Props = {
  result: HcmReportRunResult | null;
  companyLabel?: string;
  periodActions?: React.ReactNode;
};

function formatCell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? String(value)
      : value.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  }
  return String(value);
}

const SUMMARY_LABELS: Record<string, string> = {
  headcount: "Empleados",
  totalNetHours: "Horas netas",
  totalOrdinaryHours: "Horas ordinarias",
  totalOvertimeHours: "HE planificadas",
  totalExceptionHours: "Excepciones (h)",
  assignmentDays: "Días con turno",
  certificationStatus: "Certificación",
};

export function ReportPreview({ result, companyLabel, periodActions }: Props) {
  if (!result) {
    return (
      <div
        className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
        data-test-id="hcm-report-preview-empty"
      >
        Configurá los filtros para generar el reporte.
      </div>
    );
  }

  const summaryEntries = Object.entries(result.summary).filter(
    ([key]) => key !== "certificationStatus",
  );
  const certified =
    result.certified === true ||
    result.summary.certificationStatus === "Certificado";

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      data-test-id="hcm-report-preview"
    >
      <div
        className={[
          "rounded-lg border px-3 py-2 text-sm",
          certified
            ? "border-success/40 bg-success/10 text-foreground"
            : "border-warning/40 bg-warning/10 text-foreground",
        ].join(" ")}
        data-test-id="hcm-report-certification-banner"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            {certified
              ? "Información certificada: el período de jornada está cerrado."
              : "Información preliminar / no certificada. Las horas extraordinarias y totales pueden cambiar hasta cerrar el mes."}
          </p>
          {periodActions ? (
            <div className="flex flex-wrap gap-2 print:hidden">{periodActions}</div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {result.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {companyLabel ? `${companyLabel} · ` : null}
            Generado {new Date(result.generatedAt).toLocaleString("es-CL")}
          </p>
        </div>
        {result.truncated ? (
          <span className="text-xs text-warning">Resultado truncado</span>
        ) : null}
      </div>

      {summaryEntries.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {summaryEntries.map(([key, val]) => (
            <div
              key={key}
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {SUMMARY_LABELS[key] ?? key}
              </p>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {formatCell(val)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {result.series.length > 0 ? (
        <ReportCharts series={result.series} />
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-neutral/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              {result.columns.map((c) => (
                <th
                  key={c.key}
                  className={[
                    "px-2 py-2 font-medium",
                    c.align === "right" ? "text-right" : "",
                  ].join(" ")}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.rows.map((row, i) => (
              <tr key={i}>
                {result.columns.map((c) => (
                  <td
                    key={c.key}
                    className={[
                      "px-2 py-1.5 text-foreground",
                      c.align === "right" ? "text-right tabular-nums" : "",
                    ].join(" ")}
                  >
                    {formatCell(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={result.columns.length}
                  className="px-2 py-6 text-center text-muted-foreground"
                >
                  Sin datos en el período.
                </td>
              </tr>
            ) : null}
          </tbody>
          {result.totals ? (
            <tfoot>
              <tr className="border-t border-border font-medium">
                {result.columns.map((c) => (
                  <td
                    key={c.key}
                    className={[
                      "px-2 py-2",
                      c.align === "right" ? "text-right tabular-nums" : "",
                    ].join(" ")}
                  >
                    {c.key === "displayName"
                      ? "Total"
                      : result.totals?.[c.key] != null
                        ? formatCell(result.totals[c.key])
                        : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {result.footnotes?.length ? (
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          {result.footnotes.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
