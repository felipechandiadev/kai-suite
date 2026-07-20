"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert, Button, Dialog, Select, Switch, TextField } from "@kai/ui";
import {
  createContractAction,
  getActiveContractAction,
} from "@/features/hr-employees/actions/contract.action";
import type {
  EmploymentContractView,
  SalesCommissionType,
} from "@/features/hr-employees/types/contract.types";
import {
  CONTRACT_KIND_LABELS,
  LABOR_TYPE_LABELS,
  SALES_COMMISSION_LABELS,
} from "@/features/hr-employees/types/contract.types";
import { WORK_REGIME_LABELS } from "@/features/hr-jornada/types/jornada.types";
import {
  createJobPositionAction,
  listJobPositionsAction,
} from "@/features/hr-job-positions/actions/job-position.action";
import type { JobPositionView } from "@/features/hr-job-positions/types/job-position.types";
import { listAfpFundsAction } from "@/features/hr-afp-funds/actions/afp-fund.action";
import type { AfpFundView } from "@/features/hr-afp-funds/types/afp-fund.types";

type Props = {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName?: string;
  onSaved?: () => void;
};

const CREATE_JOB_OPTION = "__create_job__";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeeContractDialog({
  open,
  onClose,
  employeeId,
  employeeName,
  onSaved,
}: Props) {
  const [existingActive, setExistingActive] =
    useState<EmploymentContractView | null>(null);
  const [positions, setPositions] = useState<JobPositionView[]>([]);
  const [afpFunds, setAfpFunds] = useState<AfpFundView[]>([]);
  const [kind, setKind] = useState("LABOR");
  const [laborType, setLaborType] = useState("INDEFINITE");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [workRegime, setWorkRegime] = useState("ORDINARY");
  const [mealAllowance, setMealAllowance] = useState("0");
  const [transportAllowance, setTransportAllowance] = useState("0");
  const [tipsEligible, setTipsEligible] = useState(false);
  const [afpId, setAfpId] = useState<string | null>(null);
  const [healthSystem, setHealthSystem] = useState("");
  const [jobPositionId, setJobPositionId] = useState<string | null>(null);
  const [duties, setDuties] = useState("");
  const [commissionType, setCommissionType] =
    useState<SalesCommissionType>("NONE");
  const [commissionValue, setCommissionValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [dutiesOpen, setDutiesOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [newJobName, setNewJobName] = useState("");
  const [newJobDuties, setNewJobDuties] = useState("");

  const jobOptions = useMemo(
    () => [
      ...positions.map((p) => ({ id: p.id, label: p.name })),
      { id: CREATE_JOB_OPTION, label: "Crear cargo…" },
    ],
    [positions],
  );

  const afpOptions = useMemo(
    () => [
      { id: "", label: "Sin AFP" },
      ...afpFunds.map((f) => ({
        id: f.id,
        label: `${f.name} (${f.contributionPercent}%)`,
      })),
    ],
    [afpFunds],
  );

  useEffect(() => {
    if (!open || !employeeId) return;
    startTransition(async () => {
      const [contractRes, jobsRes, afpRes] = await Promise.all([
        getActiveContractAction(employeeId),
        listJobPositionsAction(false),
        listAfpFundsAction(false),
      ]);
      if (jobsRes.success) setPositions(jobsRes.data);
      if (afpRes.success) setAfpFunds(afpRes.data);
      if (!contractRes.success) {
        setError(contractRes.message);
        return;
      }
      const c = contractRes.data;
      setExistingActive(c);
      if (c) {
        setKind(c.kind);
        setLaborType(c.laborType ?? "INDEFINITE");
        setStartDate(todayIso());
        setEndDate("");
        setBaseSalary(c.baseSalary ?? "");
        setFeeAmount(c.feeAmount ?? "");
        setWorkRegime(c.workRegime);
        setMealAllowance(c.mealAllowance ?? "0");
        setTransportAllowance(c.transportAllowance ?? "0");
        setTipsEligible(c.tipsEligible === true);
        setAfpId(c.afpId ?? null);
        setHealthSystem(c.healthSystem ?? "");
        setJobPositionId(c.jobPositionId ?? null);
        setDuties(c.duties ?? "");
        setCommissionType(c.salesCommissionType ?? "NONE");
        setCommissionValue(c.salesCommissionValue ?? "");
      } else {
        setKind("LABOR");
        setLaborType("INDEFINITE");
        setStartDate(todayIso());
        setEndDate("");
        setBaseSalary("");
        setFeeAmount("");
        setWorkRegime("ORDINARY");
        setMealAllowance("0");
        setTransportAllowance("0");
        setTipsEligible(false);
        setAfpId(null);
        setHealthSystem("");
        setJobPositionId(null);
        setDuties("");
        setCommissionType("NONE");
        setCommissionValue("");
      }
    });
  }, [open, employeeId]);

  function applyJobPosition(id: string | null) {
    if (!id) {
      setJobPositionId(null);
      return;
    }
    if (id === CREATE_JOB_OPTION) {
      setCreateJobOpen(true);
      return;
    }
    const pos = positions.find((p) => p.id === id);
    const nextDuties = pos?.defaultDuties?.trim() || "";
    if (duties.trim() && nextDuties && duties.trim() !== nextDuties) {
      if (
        !window.confirm(
          "¿Reemplazar las funciones del contrato con las del cargo seleccionado?",
        )
      ) {
        setJobPositionId(id);
        return;
      }
    }
    setJobPositionId(id);
    if (nextDuties) setDuties(nextDuties);
  }

  function buildBody() {
    return {
      kind,
      laborType: kind === "FEE" ? null : laborType,
      startDate,
      endDate: endDate.trim() || null,
      baseSalary: kind === "LABOR" ? baseSalary.trim() || null : null,
      feeAmount: kind === "FEE" ? feeAmount.trim() || null : null,
      workRegime,
      mealAllowance: mealAllowance || "0",
      transportAllowance: transportAllowance || "0",
      tipsEligible,
      afpId: afpId?.trim() || null,
      healthSystem: healthSystem.trim() || null,
      jobPositionId,
      duties: duties.trim() || null,
      salesCommissionType: commissionType,
      salesCommissionValue:
        commissionType === "NONE" ? null : commissionValue.trim() || null,
      activate: true,
      status: "ACTIVE",
    };
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={`Contrato${employeeName ? ` — ${employeeName}` : ""}`}
        size="md"
        scroll="paper"
        maxHeight="min(90vh, 720px)"
        actions={
          <>
            <Button variant="outlined" onClick={onClose} disabled={pending}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              disabled={pending || !startDate}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const res = await createContractAction(
                    employeeId,
                    buildBody(),
                  );
                  if (!res.success) {
                    setError(res.message);
                    return;
                  }
                  onSaved?.();
                  onClose();
                });
              }}
            >
              {existingActive
                ? "Guardar nueva versión"
                : "Guardar y activar"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {existingActive ? (
            <Alert variant="info">
              Al guardar se termina el contrato activo y se crea una versión
              nueva (historial inmutable).
            </Alert>
          ) : null}
          <Select
            label="Tipo de contrato"
            value={kind}
            onChange={(id) => setKind(String(id ?? "LABOR"))}
            options={Object.entries(CONTRACT_KIND_LABELS).map(([id, label]) => ({
              id,
              label,
            }))}
          />
          {kind === "LABOR" ? (
            <Select
              label="Modalidad laboral"
              value={laborType}
              onChange={(id) => setLaborType(String(id ?? "INDEFINITE"))}
              options={Object.entries(LABOR_TYPE_LABELS).map(([id, label]) => ({
                id,
                label,
              }))}
            />
          ) : null}
          <Select
            label="Cargo"
            value={jobPositionId}
            onChange={(id) => applyJobPosition(id != null ? String(id) : null)}
            options={jobOptions}
            allowClear
            alwaysShowLabel
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              size="sm"
              type="button"
              onClick={() => setDutiesOpen(true)}
            >
              Funciones
            </Button>
            <span className="text-xs text-muted-foreground line-clamp-1">
              {duties.trim()
                ? `${duties.trim().slice(0, 80)}${duties.trim().length > 80 ? "…" : ""}`
                : "Sin funciones definidas"}
            </span>
          </div>
          <TextField
            label="Inicio"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <TextField
            label="Término (opcional)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          {kind === "LABOR" ? (
            <TextField
              label="Sueldo base"
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
            />
          ) : (
            <TextField
              label="Honorario"
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
            />
          )}
          {kind === "LABOR" ? (
            <Select
              label="Régimen laboral"
              value={workRegime}
              onChange={(id) => setWorkRegime(String(id ?? "ORDINARY"))}
              options={Object.entries(WORK_REGIME_LABELS).map(([id, label]) => ({
                id,
                label,
              }))}
            />
          ) : null}
          <Select
            label="Comisión por ventas"
            value={commissionType}
            onChange={(id) =>
              setCommissionType(String(id ?? "NONE") as SalesCommissionType)
            }
            options={Object.entries(SALES_COMMISSION_LABELS).map(
              ([id, label]) => ({ id, label }),
            )}
          />
          {commissionType !== "NONE" ? (
            <TextField
              label={
                commissionType === "PERCENT"
                  ? "Porcentaje (%)"
                  : "Monto fijo (CLP)"
              }
              {...(commissionType === "FIXED"
                ? {
                    type: "currency" as const,
                    currencySymbol: "$",
                    startSymbol: "$",
                  }
                : {})}
              value={commissionValue}
              onChange={(e) => setCommissionValue(e.target.value)}
            />
          ) : null}
          <TextField
            label="Colación"
            type="currency"
            currencySymbol="$"
            startSymbol="$"
            value={mealAllowance}
            onChange={(e) => setMealAllowance(e.target.value)}
          />
          <TextField
            label="Movilización"
            type="currency"
            currencySymbol="$"
            startSymbol="$"
            value={transportAllowance}
            onChange={(e) => setTransportAllowance(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Switch checked={tipsEligible} onChange={setTipsEligible} />
            <span className="text-sm text-foreground">Propinas</span>
          </div>
          <Select
            label="AFP"
            value={afpId ?? ""}
            onChange={(id) =>
              setAfpId(id != null && String(id) !== "" ? String(id) : null)
            }
            options={afpOptions}
            allowClear
          />
          <Select
            label="Salud"
            value={healthSystem || null}
            onChange={(id) => setHealthSystem(id != null ? String(id) : "")}
            options={[
              { id: "FONASA", label: "Fonasa" },
              { id: "ISAPRE", label: "Isapre" },
            ]}
            allowClear
          />
        </div>
      </Dialog>

      <Dialog
        open={dutiesOpen}
        onClose={() => setDutiesOpen(false)}
        title="Funciones del contrato"
        size="md"
        actions={
          <Button variant="primary" onClick={() => setDutiesOpen(false)}>
            Listo
          </Button>
        }
      >
        <TextField
          label="Funciones"
          type="textarea"
          rows={6}
          value={duties}
          onChange={(e) => setDuties(e.target.value)}
        />
      </Dialog>

      <Dialog
        open={createJobOpen}
        onClose={() => setCreateJobOpen(false)}
        title="Crear cargo"
        size="sm"
        actions={
          <>
            <Button
              variant="outlined"
              onClick={() => setCreateJobOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={pending || !newJobName.trim()}
              onClick={() => {
                startTransition(async () => {
                  const res = await createJobPositionAction({
                    name: newJobName.trim(),
                    defaultDuties: newJobDuties.trim() || null,
                  });
                  if (!res.success) {
                    setError(res.message);
                    return;
                  }
                  setPositions((prev) =>
                    [...prev, res.data].sort((a, b) =>
                      a.name.localeCompare(b.name),
                    ),
                  );
                  setJobPositionId(res.data.id);
                  if (res.data.defaultDuties?.trim()) {
                    setDuties(res.data.defaultDuties);
                  }
                  setNewJobName("");
                  setNewJobDuties("");
                  setCreateJobOpen(false);
                });
              }}
            >
              Crear
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <TextField
            label="Nombre del cargo"
            value={newJobName}
            onChange={(e) => setNewJobName(e.target.value)}
          />
          <TextField
            label="Funciones (plantilla)"
            type="textarea"
            rows={4}
            value={newJobDuties}
            onChange={(e) => setNewJobDuties(e.target.value)}
          />
        </div>
      </Dialog>
    </>
  );
}
