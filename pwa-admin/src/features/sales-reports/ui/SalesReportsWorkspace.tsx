"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Button, IconButton, SelectDefault as Select } from "@kai/ui";
import { RefreshCw } from "lucide-react";
import {
  SALES_REPORT_REGISTRY,
  getReportEntry,
} from "@/features/sales-reports/report-registry";
import { runSalesReportAction } from "@/features/sales-reports/actions/sales-reports.action";
import type { SalesReportRunResult } from "@/features/sales-reports/types/sales-report.types";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
  type ReportFormState,
} from "@/features/sales-reports/lib/report-form";
import { printHtmlInHiddenIframe } from "@/features/print/lib/print-html-in-hidden-iframe";
import { ReportParamsForm } from "./ReportParamsForm";
import { ReportPreview } from "./ReportPreview";

type Props = {
  pointsOfSale: PointOfSaleListItem[];
  cashSessions: Array<{ id: string; label: string }>;
  companyLabel?: string;
};

export function SalesReportsWorkspace({
  pointsOfSale,
  cashSessions,
  companyLabel,
}: Props) {
  const [reportId, setReportId] = useState(SALES_REPORT_REGISTRY[0]?.id ?? "sales-by-period");
  const entry = useMemo(() => getReportEntry(reportId) ?? SALES_REPORT_REGISTRY[0], [reportId]);
  const [form, setForm] = useState<ReportFormState>(emptyReportFormState);
  const [result, setResult] = useState<SalesReportRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reportOptions = useMemo(
    () =>
      SALES_REPORT_REGISTRY.map((r) => ({
        id: r.id,
        label: `${r.title}${r.wave === "p1" ? " ·+" : ""}`,
      })),
    [],
  );

  const onSelectReport = useCallback((id: string | number | null) => {
    const nextId = String(id ?? "");
    setReportId(nextId);
    setForm(emptyReportFormState());
    setResult(null);
    setError(null);
  }, []);

  const onGenerate = useCallback(() => {
    if (!entry) return;
    const validationError = validateFormForEntry(entry, form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const params = formStateToParams(entry, form);
    startTransition(async () => {
      const res = await runSalesReportAction(entry.id, params);
      if (!res.success || !res.data) {
        setResult(null);
        setError(res.error ?? "No se pudo generar el reporte");
        return;
      }
      if (!res.data.series?.length) {
        setResult(res.data);
        setError("El reporte no incluyó gráficos. Revisá filtros o datos del período.");
        return;
      }
      setResult(res.data);
    });
  }, [entry, form]);

  const onPrint = useCallback(() => {
    if (!result || typeof window === "undefined") return;
    const root = document.querySelector(".sales-report-print-root");
    if (!root) {
      window.print();
      return;
    }
    // Clonar solo el preview evita que el TopBar/sidebar salgan en el diálogo de impresión.
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${
      result.title
    }</title>${styles}<style>
      @page { margin: 12mm; }
      html, body { background: #fff !important; margin: 0; padding: 0; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .sales-report-print-root { box-shadow: none !important; border: none !important; }
    </style></head><body>${root.outerHTML}</body></html>`;
    printHtmlInHiddenIframe(html, result.title);
  }, [result]);

  const onClear = useCallback(() => {
    setForm(emptyReportFormState());
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="sales-reports-workspace flex min-h-0 flex-1 flex-col gap-3" data-test-id="sales-reports-workspace">
      <div className="sales-reports-toolbar flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Reportes de ventas</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outlined" onClick={onClear} disabled={pending}>
            Limpiar
          </Button>
          <IconButton
            icon="Printer"
            variant="secondary"
            size="md"
            ariaLabel="Imprimir reporte"
            title="Imprimir"
            onClick={onPrint}
            disabled={!result || pending}
            data-test-id="sales-reports-print-button"
          />
          <Button type="button" onClick={onGenerate} loading={pending}>
            <RefreshCw className="mr-1.5 size-4" />
            Generar
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="sales-reports-config flex h-fit flex-col gap-3 rounded-xl border border-border bg-card p-4 print:hidden">
          <Select
            label="Tipo de reporte"
            alwaysShowLabel
            options={reportOptions}
            value={reportId}
            onChange={onSelectReport}
          />
          {entry ? (
            <p className="text-xs text-muted-foreground">{entry.description}</p>
          ) : null}
          {entry ? (
            <ReportParamsForm
              entry={entry}
              value={form}
              onChange={setForm}
              pointsOfSale={pointsOfSale}
              cashSessions={cashSessions}
            />
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </aside>

        <div className="min-w-0">
          <ReportPreview result={result} companyLabel={companyLabel} />
        </div>
      </div>
    </div>
  );
}
