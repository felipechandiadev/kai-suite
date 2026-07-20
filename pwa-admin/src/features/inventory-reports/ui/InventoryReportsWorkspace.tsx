"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Button, SelectDefault as Select } from "@kai/ui";
import { RefreshCw } from "lucide-react";
import {
  INVENTORY_REPORT_REGISTRY,
  getReportEntry,
} from "@/features/inventory-reports/report-registry";
import { runInventoryReportAction } from "@/features/inventory-reports/actions/inventory-reports.action";
import type { InventoryReportRunResult } from "@/features/inventory-reports/types/inventory-report.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type { UnitListItem } from "@/features/inventory-units/types/unit.types";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
  type ReportFormState,
} from "@/features/inventory-reports/lib/report-form";
import { ReportParamsForm } from "./ReportParamsForm";
import { ReportPreview } from "./ReportPreview";

type Props = {
  storages: StorageListItem[];
  units: UnitListItem[];
  categories: CategoryListItem[];
  companyLabel?: string;
};

export function InventoryReportsWorkspace({
  storages,
  units,
  categories,
  companyLabel,
}: Props) {
  const [reportId, setReportId] = useState(
    INVENTORY_REPORT_REGISTRY[0]?.id ?? "stock-valuation",
  );
  const entry = useMemo(
    () => getReportEntry(reportId) ?? INVENTORY_REPORT_REGISTRY[0],
    [reportId],
  );
  const [form, setForm] = useState<ReportFormState>(emptyReportFormState);
  const [result, setResult] = useState<InventoryReportRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reportOptions = useMemo(
    () =>
      INVENTORY_REPORT_REGISTRY.map((r) => ({
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
      const res = await runInventoryReportAction(entry.id, params);
      if (!res.success || !res.data) {
        setResult(null);
        setError(res.error ?? "No se pudo generar el reporte");
        return;
      }
      if (!res.data.series?.length) {
        setResult(res.data);
        setError("El reporte no incluyó gráficos. Revisá filtros o datos.");
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
      className="inventory-reports-workspace flex min-h-0 flex-1 flex-col gap-3"
      data-test-id="inventory-reports-workspace"
    >
      <div className="inventory-reports-toolbar flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Reportes de inventario</h1>
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
        <aside className="inventory-reports-config flex h-fit flex-col gap-3 rounded-xl border border-border bg-card p-4 print:hidden">
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
              storages={storages}
              units={units}
              categories={categories}
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
