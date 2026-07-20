"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Button, SelectDefault as Select } from "@kai/ui";
import { RefreshCw } from "lucide-react";
import {
  PURCHASING_REPORT_REGISTRY,
  getReportEntry,
} from "@/features/purchasing-reports/report-registry";
import { runPurchasingReportAction } from "@/features/purchasing-reports/actions/purchasing-reports.action";
import type { PurchasingReportRunResult } from "@/features/purchasing-reports/types/purchasing-report.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
  type ReportFormState,
} from "@/features/purchasing-reports/lib/report-form";
import { ReportParamsForm } from "./ReportParamsForm";
import { ReportPreview } from "./ReportPreview";

type Props = {
  suppliers: Array<{ id: string; label: string }>;
  storages: StorageListItem[];
  companyLabel?: string;
};

export function PurchasingReportsWorkspace({
  suppliers,
  storages,
  companyLabel,
}: Props) {
  const [reportId, setReportId] = useState(
    PURCHASING_REPORT_REGISTRY[0]?.id ?? "purchases-by-period",
  );
  const entry = useMemo(
    () => getReportEntry(reportId) ?? PURCHASING_REPORT_REGISTRY[0],
    [reportId],
  );
  const [form, setForm] = useState<ReportFormState>(emptyReportFormState);
  const [result, setResult] = useState<PurchasingReportRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reportOptions = useMemo(
    () =>
      PURCHASING_REPORT_REGISTRY.map((r) => ({
        id: r.id,
        label: r.title,
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
      const res = await runPurchasingReportAction(entry.id, params);
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

  const onClear = useCallback(() => {
    setForm(emptyReportFormState());
    setResult(null);
    setError(null);
  }, []);

  return (
    <div
      className="purchasing-reports-workspace flex min-h-0 flex-1 flex-col gap-3"
      data-test-id="purchasing-reports-workspace"
    >
      <div className="purchasing-reports-toolbar flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Reportes de compras</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outlined" onClick={onClear} disabled={pending}>
            Limpiar
          </Button>
          <Button type="button" onClick={onGenerate} loading={pending}>
            <RefreshCw className="mr-1.5 size-4" />
            Generar
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="purchasing-reports-config flex h-fit flex-col gap-3 rounded-xl border border-border bg-card p-4 print:hidden">
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
              suppliers={suppliers}
              storages={storages}
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
