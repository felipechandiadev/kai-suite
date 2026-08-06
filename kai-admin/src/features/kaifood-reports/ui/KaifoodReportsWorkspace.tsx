"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { IconButton, SelectDefault as Select } from "@kai/ui";
import {
  KAIFOOD_REPORT_REGISTRY,
  getReportEntry,
} from "@/features/kaifood-reports/report-registry";
import { runKaifoodReportAction } from "@/features/kaifood-reports/actions/kaifood-reports.action";
import type { DiningReportRunResult } from "@/features/kaifood-reports/types/kaifood-report.types";
import {
  KAIFOOD_REPORT_CATEGORY_LABEL,
  KAIFOOD_REPORT_CATEGORY_ORDER,
  type KaifoodReportCategory,
} from "@/features/kaifood-reports/types/kaifood-report.types";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
  type ReportFormState,
} from "@/features/kaifood-reports/lib/report-form";
import { ReportParamsForm } from "./ReportParamsForm";
import { ReportPreview } from "./ReportPreview";

type Props = {
  branches: Array<{ id: string; label: string }>;
  diningRooms: Array<{ id: string; label: string; branchId: string }>;
  companyLabel?: string;
};

function categoryOf(id: string): KaifoodReportCategory {
  return getReportEntry(id)?.category ?? "resumen";
}

export function KaifoodReportsWorkspace({
  branches,
  diningRooms,
  companyLabel,
}: Props) {
  const defaultId = KAIFOOD_REPORT_REGISTRY[0]?.id ?? "dining-salon-summary";
  const [category, setCategory] = useState<KaifoodReportCategory>(() =>
    categoryOf(defaultId),
  );
  const [reportId, setReportId] = useState(defaultId);
  const entry = useMemo(
    () => getReportEntry(reportId) ?? KAIFOOD_REPORT_REGISTRY[0],
    [reportId],
  );
  const [form, setForm] = useState<ReportFormState>(() => emptyReportFormState());
  const [result, setResult] = useState<DiningReportRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryOptions = useMemo(
    () =>
      KAIFOOD_REPORT_CATEGORY_ORDER.filter((cat) =>
        KAIFOOD_REPORT_REGISTRY.some((r) => r.category === cat),
      ).map((cat) => ({
        id: cat,
        label: KAIFOOD_REPORT_CATEGORY_LABEL[cat],
      })),
    [],
  );

  const reportOptions = useMemo(
    () =>
      KAIFOOD_REPORT_REGISTRY.filter((r) => r.category === category).map(
        (r) => ({
          id: r.id,
          label: r.title,
        }),
      ),
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
        const res = await runKaifoodReportAction(activeEntry.id, params);
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
    const nextCat = String(id ?? "resumen") as KaifoodReportCategory;
    setCategory(nextCat);
    const first = KAIFOOD_REPORT_REGISTRY.find((r) => r.category === nextCat);
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
      className="kaifood-reports-workspace flex min-h-0 flex-1 flex-col gap-3"
      data-test-id="kaifood-reports-workspace"
    >
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <IconButton
          icon="RefreshCw"
          variant="primary"
          size="sm"
          ariaLabel="Actualizar reporte"
          onClick={onRefresh}
          isLoading={pending}
          disabled={pending}
          data-test-id="kaifood-reports-refresh"
        />
        <h1 className="text-lg font-semibold text-foreground">
          Reportes KaiFood
        </h1>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex h-fit flex-col gap-3 rounded-xl border border-border bg-card p-4 print:hidden">
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
              branches={branches}
              diningRooms={diningRooms}
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
