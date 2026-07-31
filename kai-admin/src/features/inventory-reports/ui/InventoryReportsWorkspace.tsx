"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { IconButton, SelectDefault as Select } from "@kai/ui";
import {
  INVENTORY_REPORT_REGISTRY,
  getReportEntry,
} from "@/features/inventory-reports/report-registry";
import { runInventoryReportAction } from "@/features/inventory-reports/actions/inventory-reports.action";
import type { InventoryReportRunResult } from "@/features/inventory-reports/types/inventory-report.types";
import {
  INVENTORY_REPORT_CATEGORY_LABEL,
  INVENTORY_REPORT_CATEGORY_ORDER,
  type InventoryReportCategory,
} from "@/features/inventory-reports/types/inventory-report.types";
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

function categoryOf(id: string): InventoryReportCategory {
  return getReportEntry(id)?.category ?? "valuacion";
}

export function InventoryReportsWorkspace({
  storages,
  units,
  categories,
  companyLabel,
}: Props) {
  const defaultId = INVENTORY_REPORT_REGISTRY[0]?.id ?? "stock-valuation";
  const [category, setCategory] = useState<InventoryReportCategory>(() =>
    categoryOf(defaultId),
  );
  const [reportId, setReportId] = useState(defaultId);
  const entry = useMemo(
    () => getReportEntry(reportId) ?? INVENTORY_REPORT_REGISTRY[0],
    [reportId],
  );
  const [form, setForm] = useState<ReportFormState>(() => emptyReportFormState());
  const [result, setResult] = useState<InventoryReportRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryOptions = useMemo(
    () =>
      INVENTORY_REPORT_CATEGORY_ORDER.filter((cat) =>
        INVENTORY_REPORT_REGISTRY.some((r) => r.category === cat),
      ).map((cat) => ({
        id: cat,
        label: INVENTORY_REPORT_CATEGORY_LABEL[cat],
      })),
    [],
  );

  const reportOptions = useMemo(
    () =>
      INVENTORY_REPORT_REGISTRY.filter((r) => r.category === category).map((r) => ({
        id: r.id,
        label: r.title,
      })),
    [category],
  );

  const runReport = useCallback(
    (activeEntry: NonNullable<typeof entry>, activeForm: ReportFormState) => {
      const validationError = validateFormForEntry(activeEntry, activeForm);
      if (validationError) {
        setError(validationError);
        setResult(null);
        return;
      }
      setError(null);
      const params = formStateToParams(activeEntry, activeForm);
      startTransition(async () => {
        const res = await runInventoryReportAction(activeEntry.id, params);
        if (!res.success || !res.data) {
          setResult(null);
          setError(res.error ?? "No se pudo generar el reporte");
          return;
        }
        setResult(res.data);
      });
    },
    [],
  );

  useEffect(() => {
    if (!entry) return;
    const timer = window.setTimeout(() => {
      runReport(entry, form);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [entry, form, runReport]);

  const onSelectCategory = useCallback((id: string | number | null) => {
    const nextCat = String(id ?? "valuacion") as InventoryReportCategory;
    setCategory(nextCat);
    const first = INVENTORY_REPORT_REGISTRY.find((r) => r.category === nextCat);
    if (first) {
      setReportId(first.id);
      setForm(emptyReportFormState());
      setResult(null);
      setError(null);
    }
  }, []);

  const onSelectReport = useCallback((id: string | number | null) => {
    const nextId = String(id ?? "");
    setReportId(nextId);
    setForm(emptyReportFormState());
    setResult(null);
    setError(null);
  }, []);

  const onRefresh = useCallback(() => {
    if (!entry) return;
    runReport(entry, form);
  }, [entry, form, runReport]);

  return (
    <div
      className="inventory-reports-workspace flex min-h-0 flex-1 flex-col gap-3"
      data-test-id="inventory-reports-workspace"
    >
      <div className="inventory-reports-toolbar flex flex-wrap items-center gap-2 print:hidden">
        <IconButton
          icon="RefreshCw"
          variant="primary"
          size="sm"
          ariaLabel="Actualizar reporte"
          onClick={onRefresh}
          isLoading={pending}
          disabled={pending}
          data-test-id="inventory-reports-refresh"
        />
        <h1 className="text-lg font-semibold text-foreground">
          Reportes de inventario
        </h1>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="inventory-reports-config flex h-fit flex-col gap-3 rounded-xl border border-border bg-card p-4 print:hidden">
          <Select
            label="Categoría"
            alwaysShowLabel
            options={categoryOptions}
            value={category}
            onChange={onSelectCategory}
          />
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
