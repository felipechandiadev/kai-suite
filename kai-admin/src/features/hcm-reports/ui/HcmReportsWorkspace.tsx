"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button, IconButton, SelectDefault as Select } from "@kai/ui";
import {
  HCM_REPORT_REGISTRY,
  getReportEntry,
} from "@/features/hcm-reports/report-registry";
import { runHcmReportAction } from "@/features/hcm-reports/actions/hcm-reports.action";
import type { HcmReportRunResult } from "@/features/hcm-reports/types/hcm-report.types";
import {
  HCM_REPORT_CATEGORY_LABEL,
  HCM_REPORT_CATEGORY_ORDER,
  type HcmReportCategory,
} from "@/features/hcm-reports/types/hcm-report.types";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
  type ReportFormState,
} from "@/features/hcm-reports/lib/report-form";
import {
  closeJornadaPeriodAction,
  getJornadaPeriodAction,
  reopenJornadaPeriodAction,
} from "@/features/hr-jornada/actions/jornada.action";
import { ReportParamsForm } from "./ReportParamsForm";
import { ReportPreview } from "./ReportPreview";

type LaborUnitOpt = { id: string; name: string };
type EmployeeOpt = { id: string; label: string; laborUnitId?: string | null };

type Props = {
  laborUnits: LaborUnitOpt[];
  employees: EmployeeOpt[];
  companyLabel?: string;
};

function categoryOf(id: string): HcmReportCategory {
  return getReportEntry(id)?.category ?? "jornada";
}

function monthStartFromIso(iso: string): string {
  const d = iso.slice(0, 10);
  return `${d.slice(0, 7)}-01`;
}

export function HcmReportsWorkspace({
  laborUnits,
  employees,
  companyLabel,
}: Props) {
  const defaultId = HCM_REPORT_REGISTRY[0]?.id ?? "hours-planned-by-employee";
  const [category, setCategory] = useState<HcmReportCategory>(() =>
    categoryOf(defaultId),
  );
  const [reportId, setReportId] = useState(defaultId);
  const entry = useMemo(
    () => getReportEntry(reportId) ?? HCM_REPORT_REGISTRY[0],
    [reportId],
  );
  const [form, setForm] = useState<ReportFormState>(() => emptyReportFormState());
  const [result, setResult] = useState<HcmReportRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [periodStatus, setPeriodStatus] = useState<"DRAFT" | "CLOSED" | null>(
    null,
  );
  const [periodBusy, setPeriodBusy] = useState(false);

  const categoryOptions = useMemo(
    () =>
      HCM_REPORT_CATEGORY_ORDER.filter((cat) =>
        HCM_REPORT_REGISTRY.some((r) => r.category === cat),
      ).map((cat) => ({
        id: cat,
        label: HCM_REPORT_CATEGORY_LABEL[cat],
      })),
    [],
  );

  const reportOptions = useMemo(
    () =>
      HCM_REPORT_REGISTRY.filter((r) => r.category === category).map((r) => ({
        id: r.id,
        label: r.title,
      })),
    [category],
  );

  const periodStart = form.dateFrom
    ? monthStartFromIso(form.dateFrom)
    : null;

  const refreshPeriod = useCallback(async (start: string) => {
    const res = await getJornadaPeriodAction(start);
    if (res.success && res.data) {
      setPeriodStatus(res.data.status);
    } else {
      setPeriodStatus(null);
    }
  }, []);

  useEffect(() => {
    if (!periodStart) {
      setPeriodStatus(null);
      return;
    }
    void refreshPeriod(periodStart);
  }, [periodStart, refreshPeriod]);

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
        const res = await runHcmReportAction(activeEntry.id, params);
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
    const nextCat = String(id ?? "jornada") as HcmReportCategory;
    setCategory(nextCat);
    const first = HCM_REPORT_REGISTRY.find((r) => r.category === nextCat);
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
    if (periodStart) void refreshPeriod(periodStart);
  }, [entry, form, runReport, periodStart, refreshPeriod]);

  const onCloseMonth = useCallback(() => {
    if (!periodStart) return;
    setPeriodBusy(true);
    startTransition(async () => {
      const res = await closeJornadaPeriodAction(periodStart);
      setPeriodBusy(false);
      if (!res.success) {
        setError(res.message ?? "No se pudo cerrar el mes");
        return;
      }
      setPeriodStatus("CLOSED");
      setError(null);
      if (entry) runReport(entry, form);
    });
  }, [periodStart, entry, form, runReport]);

  const onReopenMonth = useCallback(() => {
    if (!periodStart) return;
    setPeriodBusy(true);
    startTransition(async () => {
      const res = await reopenJornadaPeriodAction(periodStart);
      setPeriodBusy(false);
      if (!res.success) {
        setError(res.message ?? "No se pudo reabrir el mes");
        return;
      }
      setPeriodStatus("DRAFT");
      setError(null);
      if (entry) runReport(entry, form);
    });
  }, [periodStart, entry, form, runReport]);

  const periodLabel = periodStart?.slice(0, 7) ?? "";

  const periodActions =
    periodStart && periodStatus ? (
      periodStatus === "CLOSED" ? (
        <Button
          size="sm"
          variant="outlined"
          disabled={periodBusy || pending}
          onClick={onReopenMonth}
          data-test-id="hcm-reports-reopen-month"
        >
          Reabrir {periodLabel}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="primary"
          disabled={periodBusy || pending}
          onClick={onCloseMonth}
          data-test-id="hcm-reports-close-month"
        >
          Cerrar mes {periodLabel}
        </Button>
      )
    ) : null;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3"
      data-test-id="hcm-reports-workspace"
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
          data-test-id="hcm-reports-refresh"
        />
        <h1 className="text-lg font-semibold text-foreground">
          Reportes de capital humano
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
              laborUnits={laborUnits}
              employees={employees}
            />
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </aside>

        <div className="min-w-0">
          <ReportPreview
            result={result}
            companyLabel={companyLabel}
            periodActions={periodActions}
          />
        </div>
      </div>
    </div>
  );
}
