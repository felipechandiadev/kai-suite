"use client";

import { useEffect, useState } from "react";
import { Button, LoadingState, TextField } from "@kai/ui";
import {
  getActiveContractAction,
  listContractsAction,
} from "@/features/hr-employees/actions/contract.action";
import type { EmploymentContractView } from "@/features/hr-employees/types/contract.types";
import {
  CONTRACT_KIND_LABELS,
  CONTRACT_STATUS_LABELS,
  EXTRA_HOURS_MODE_LABELS,
  FLEXIBLE_MODE_LABELS,
  LABOR_TYPE_LABELS,
  SALES_COMMISSION_LABELS,
  SHIFT_SYSTEM_TYPE_LABELS,
} from "@/features/hr-employees/types/contract.types";
import type { ExtraHoursMode } from "@/features/hr-employees/types/contract.types";
import { WEEKDAY_LABELS } from "@/features/hr-jornada/types/employee-shift.types";
import { WORK_REGIME_LABELS } from "@/features/hr-jornada/types/jornada.types";
import { listJobPositionsAction } from "@/features/hr-job-positions/actions/job-position.action";
import { EmployeeContractDialog } from "../EmployeeContractDialog";
import { employeeSectionCardClass } from "./employee-section-card";
import { formatDateOnlySlash, formatMoneyClp } from "./employee-detail-labels";

const noop = () => {};

type Props = {
  employeeId: string;
  employeeName?: string;
  onChanged?: () => void;
};

export function EmployeeDetailContractSection({
  employeeId,
  employeeName,
  onChanged,
}: Props) {
  const [contract, setContract] = useState<EmploymentContractView | null>(null);
  const [history, setHistory] = useState<EmploymentContractView[]>([]);
  const [jobName, setJobName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => {
    const id = employeeId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    void Promise.all([
      getActiveContractAction(id),
      listContractsAction(id),
      listJobPositionsAction(true),
    ]).then(([activeRes, listRes, jobsRes]) => {
      setLoading(false);
      if (!activeRes.success) {
        setError(activeRes.message);
        return;
      }
      setContract(activeRes.data);
      if (listRes.success) {
        setHistory(
          listRes.data.filter((c) => c.status !== "ACTIVE").slice(0, 8),
        );
      }
      if (jobsRes.success && activeRes.data?.jobPositionId) {
        const hit = jobsRes.data.find(
          (j) => j.id === activeRes.data?.jobPositionId,
        );
        setJobName(hit?.name ?? null);
      } else {
        setJobName(null);
      }
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on employeeId
  }, [employeeId]);

  if (loading) {
    return <LoadingState className="flex items-center justify-center py-8" />;
  }

  const commissionLabel = contract
    ? SALES_COMMISSION_LABELS[contract.salesCommissionType ?? "NONE"]
    : "";

  return (
    <>
      <section
        className={employeeSectionCardClass(false)}
        data-test-id="employee-detail-contract"
      >
        <h2 className="text-sm font-semibold text-foreground">Contrato activo</h2>
        <p className="text-xs text-muted-foreground">
          Los contratos no se editan: cada cambio crea una versión nueva y
          termina la anterior.
        </p>

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        {!contract ? (
          <div className="space-y-3 py-2" data-test-id="employee-detail-contract-empty">
            <p className="text-sm text-muted-foreground">
              Sin contrato activo. Crea uno para definir sueldo y régimen.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setDialogOpen(true)}
              data-test-id="employee-detail-contract-create"
            >
              Crear contrato
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Tipo"
              value={
                contract.kind === "FEE"
                  ? CONTRACT_KIND_LABELS.FEE
                  : `${CONTRACT_KIND_LABELS.LABOR}${
                      contract.laborType === "INDEFINITE" ||
                      contract.laborType === "FIXED_TERM"
                        ? ` · ${LABOR_TYPE_LABELS[contract.laborType]}`
                        : contract.laborType
                          ? ` · ${contract.laborType}`
                          : ""
                    }`
              }
              onChange={noop}
              readOnly
            />
            {jobName ? (
              <TextField
                label="Cargo"
                value={jobName}
                onChange={noop}
                readOnly
              />
            ) : null}
            <TextField
              label="Vigencia"
              value={`${formatDateOnlySlash(contract.startDate)}${
                contract.endDate
                  ? ` → ${formatDateOnlySlash(contract.endDate)}`
                  : ""
              }`}
              onChange={noop}
              readOnly
            />
            <TextField
              label={contract.kind === "FEE" ? "Honorario" : "Sueldo base"}
              value={formatMoneyClp(
                contract.kind === "FEE" ? contract.feeAmount : contract.baseSalary,
              )}
              onChange={noop}
              readOnly
            />
            {contract.kind === "LABOR" ? (
              <>
                <TextField
                  label="Tipo de jornada"
                  value={
                    contract.workRegime
                      ? (WORK_REGIME_LABELS[contract.workRegime] ??
                        contract.workRegime)
                      : "—"
                  }
                  onChange={noop}
                  readOnly
                />
                <TextField
                  label="Horas semanales"
                  value={
                    contract.weeklyHours != null
                      ? `${contract.weeklyHours} h`
                      : "—"
                  }
                  onChange={noop}
                  readOnly
                />
                <TextField
                  label="Horas extras / compensación"
                  value={
                    contract.extraHoursMode
                      ? (EXTRA_HOURS_MODE_LABELS[
                          contract.extraHoursMode as ExtraHoursMode
                        ] ?? contract.extraHoursMode)
                      : "—"
                  }
                  onChange={noop}
                  readOnly
                />
                <TextField
                  label="Sistema de jornada"
                  value={
                    contract.shiftSystemName
                      ? `${contract.shiftSystemName}${
                          contract.shiftSystemType
                            ? ` · ${
                                SHIFT_SYSTEM_TYPE_LABELS[
                                  contract.shiftSystemType as keyof typeof SHIFT_SYSTEM_TYPE_LABELS
                                ] ?? contract.shiftSystemType
                              }`
                            : ""
                        }`
                      : "—"
                  }
                  onChange={noop}
                  readOnly
                />
                {contract.shiftSystemType === "FIXED" &&
                contract.fixedScheduleJson ? (
                  <TextField
                    label="Horario fijo (contrato)"
                    className="sm:col-span-2"
                    value={Object.entries(contract.fixedScheduleJson)
                      .filter(([, s]) => s?.start && s?.end)
                      .map(
                        ([d, s]) =>
                          `${WEEKDAY_LABELS[Number(d)] ?? d} ${s!.start}–${s!.end}`,
                      )
                      .join(", ")}
                    onChange={noop}
                    readOnly
                  />
                ) : null}
                {contract.shiftSystemType === "FLEXIBLE" ? (
                  <TextField
                    label="Modalidad flexible"
                    value={
                      contract.flexibleMode
                        ? (FLEXIBLE_MODE_LABELS[
                            contract.flexibleMode as keyof typeof FLEXIBLE_MODE_LABELS
                          ] ?? contract.flexibleMode)
                        : "—"
                    }
                    onChange={noop}
                    readOnly
                  />
                ) : null}
                {contract.shiftSystemType === "FREE" ? (
                  <TextField
                    label="Art. 22"
                    value={contract.art22Exempt ? "Exento de control" : "—"}
                    onChange={noop}
                    readOnly
                  />
                ) : null}
                {contract.shiftSystemType === "EXCEPTIONAL" ? (
                  <TextField
                    label="Resolución DT"
                    value={contract.exceptionalResolutionRef?.trim() || "—"}
                    onChange={noop}
                    readOnly
                  />
                ) : null}
              </>
            ) : null}
            <TextField
              label="Comisión ventas"
              value={
                (contract.salesCommissionType ?? "NONE") === "NONE"
                  ? commissionLabel
                  : `${commissionLabel}: ${contract.salesCommissionValue ?? "—"}`
              }
              onChange={noop}
              readOnly
            />
            {contract.duties?.trim() ? (
              <div className="sm:col-span-2">
                <TextField
                  label="Funciones"
                  value={contract.duties}
                  onChange={noop}
                  readOnly
                />
              </div>
            ) : null}
            {contract.kind === "LABOR" ? (
              <>
                <TextField
                  label="Colación / Movilización"
                  value={`${formatMoneyClp(contract.mealAllowance)} / ${formatMoneyClp(contract.transportAllowance)}`}
                  onChange={noop}
                  readOnly
                />
                <TextField
                  label="Propinas"
                  value={contract.tipsEligible ? "Sí" : "No"}
                  onChange={noop}
                  readOnly
                />
                <TextField
                  label="AFP"
                  value={`${
                    contract.afpName?.trim() ||
                    contract.afpCode?.trim() ||
                    "—"
                  }${
                    contract.afpContributionPercent
                      ? ` (comisión ${contract.afpContributionPercent}%)`
                      : ""
                  }`}
                  onChange={noop}
                  readOnly
                />
                <TextField
                  label="Salud"
                  value={
                    contract.healthSystem === "ISAPRE"
                      ? `Isapre · ${contract.isapreName ?? "—"}${
                          contract.healthContributionValue
                            ? ` · ${
                                contract.healthContributionMode === "FIXED"
                                  ? formatMoneyClp(
                                      contract.healthContributionValue,
                                    )
                                  : `${contract.healthContributionValue}%`
                              }`
                            : ""
                        }`
                      : contract.healthSystem?.trim() || "—"
                  }
                  onChange={noop}
                  readOnly
                />
                <TextField
                  label="Mutual / ISL"
                  value={contract.mutualName?.trim() || "—"}
                  onChange={noop}
                  readOnly
                />
              </>
            ) : null}
            <div className="sm:col-span-2">
              <Button
                variant="outlined"
                size="sm"
                onClick={() => setDialogOpen(true)}
                data-test-id="employee-detail-contract-edit"
              >
                Nueva versión de contrato
              </Button>
            </div>
          </div>
        )}

        {history.length > 0 ? (
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Versiones anteriores
            </h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {history.map((c) => (
                <li key={c.id}>
                  {formatDateOnlySlash(c.startDate)}
                  {c.endDate ? ` → ${formatDateOnlySlash(c.endDate)}` : ""} ·{" "}
                  {CONTRACT_STATUS_LABELS[c.status]} ·{" "}
                  {formatMoneyClp(
                    c.kind === "FEE" ? c.feeAmount : c.baseSalary,
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <EmployeeContractDialog
        open={dialogOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          load();
          onChanged?.();
        }}
      />
    </>
  );
}
