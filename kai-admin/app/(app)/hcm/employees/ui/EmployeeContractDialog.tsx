"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert, Button, Dialog, Select, Switch, TextField } from "@kai/ui";
import {
  createContractAction,
  getActiveContractAction,
} from "@/features/hr-employees/actions/contract.action";
import type {
  EmploymentContractView,
  ExtraHoursMode,
  FlexibleBandSlot,
  FlexibleMode,
  HealthContributionMode,
  SalesCommissionType,
  ScheduleSlot,
  ShiftSystemType,
} from "@/features/hr-employees/types/contract.types";
import {
  CONTRACT_KIND_LABELS,
  EXTRA_HOURS_MODE_LABELS,
  FLEXIBLE_MODE_LABELS,
  LABOR_TYPE_LABELS,
  MUTUAL_OPTIONS,
  SALES_COMMISSION_LABELS,
} from "@/features/hr-employees/types/contract.types";
import { WEEKDAY_LABELS } from "@/features/hr-jornada/types/employee-shift.types";
import { WORK_REGIME_LABELS } from "@/features/hr-jornada/types/jornada.types";
import {
  createJobPositionAction,
  listJobPositionsAction,
} from "@/features/hr-job-positions/actions/job-position.action";
import type { JobPositionView } from "@/features/hr-job-positions/types/job-position.types";
import { listAfpFundsAction } from "@/features/hr-afp-funds/actions/afp-fund.action";
import type { AfpFundView } from "@/features/hr-afp-funds/types/afp-fund.types";
import { listIsapresAction } from "@/features/hr-isapres/actions/isapre.action";
import type { IsapreView } from "@/features/hr-isapres/types/isapre.types";
import { listShiftSystemsAction } from "@/features/hr-shift-systems/actions/shift-system.action";
import type { ShiftSystemView } from "@/features/hr-shift-systems/types/shift-system.types";

type Props = {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName?: string;
  onSaved?: () => void;
};

const CREATE_JOB_OPTION = "__create_job__";
const MUTUAL_OTHER = "__other__";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptySchedule(): Record<string, { start: string; end: string } | null> {
  const s: Record<string, { start: string; end: string } | null> = {};
  for (let i = 0; i < 5; i++) {
    s[String(i)] = { start: "09:00", end: "18:00" };
  }
  s["5"] = null;
  s["6"] = null;
  return s;
}

function emptyBand(): Record<string, FlexibleBandSlot> {
  const s: Record<string, FlexibleBandSlot> = {};
  for (let i = 0; i < 5; i++) {
    s[String(i)] = { earliestStart: "08:00", latestStart: "10:00" };
  }
  s["5"] = null;
  s["6"] = null;
  return s;
}

function resolveMutualSelect(name: string | null | undefined): {
  select: string;
  other: string;
} {
  const v = name?.trim() || "";
  if (!v) return { select: "", other: "" };
  const known = MUTUAL_OPTIONS.find((o) => o.id === v && o.id !== MUTUAL_OTHER);
  if (known) return { select: known.id, other: "" };
  return { select: MUTUAL_OTHER, other: v };
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
  const [isapres, setIsapres] = useState<IsapreView[]>([]);
  const [shiftSystems, setShiftSystems] = useState<ShiftSystemView[]>([]);
  const [shiftSystemId, setShiftSystemId] = useState<string | null>(null);
  const [fixedSchedule, setFixedSchedule] = useState(emptySchedule());
  const [flexibleMode, setFlexibleMode] = useState<FlexibleMode>("BAND");
  const [flexibleBand, setFlexibleBand] = useState(emptyBand());
  const [art22Exempt, setArt22Exempt] = useState(false);
  const [exceptionalResolutionRef, setExceptionalResolutionRef] = useState("");
  const [kind, setKind] = useState("LABOR");
  const [laborType, setLaborType] = useState("INDEFINITE");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [workRegime, setWorkRegime] = useState("ORDINARY");
  const [weeklyHours, setWeeklyHours] = useState("45");
  const [extraHoursMode, setExtraHoursMode] =
    useState<ExtraHoursMode>("PAID_OVERTIME");
  const [mealAllowance, setMealAllowance] = useState("0");
  const [transportAllowance, setTransportAllowance] = useState("0");
  const [tipsEligible, setTipsEligible] = useState(false);
  const [afpId, setAfpId] = useState<string | null>(null);
  const [healthSystem, setHealthSystem] = useState("");
  const [isapreId, setIsapreId] = useState<string | null>(null);
  const [healthContributionMode, setHealthContributionMode] =
    useState<HealthContributionMode>("PERCENT");
  const [healthContributionValue, setHealthContributionValue] = useState("");
  const [mutualSelect, setMutualSelect] = useState("");
  const [mutualOther, setMutualOther] = useState("");
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
        label: `${f.name} (comisión ${f.contributionPercent}%)`,
      })),
    ],
    [afpFunds],
  );

  const isapreOptions = useMemo(
    () => isapres.map((i) => ({ id: i.id, label: i.name })),
    [isapres],
  );

  const selectedShiftSystem = useMemo(
    () => shiftSystems.find((s) => s.id === shiftSystemId) ?? null,
    [shiftSystems, shiftSystemId],
  );

  const shiftSystemOptions = useMemo(
    () => shiftSystems.map((s) => ({ id: s.id, label: s.name })),
    [shiftSystems],
  );

  useEffect(() => {
    if (!open || !employeeId) return;
    startTransition(async () => {
      const [contractRes, jobsRes, afpRes, isapreRes, shiftRes] =
        await Promise.all([
        getActiveContractAction(employeeId),
        listJobPositionsAction(false),
        listAfpFundsAction(false),
        listIsapresAction(false),
        listShiftSystemsAction(false),
      ]);
      if (jobsRes.success) setPositions(jobsRes.data);
      if (afpRes.success) setAfpFunds(afpRes.data);
      if (isapreRes.success) setIsapres(isapreRes.data);
      if (shiftRes.success) {
        setShiftSystems(shiftRes.data);
        if (!contractRes.data?.shiftSystemId && shiftRes.data.length > 0) {
          const rotating =
            shiftRes.data.find((s) => s.code === "SS00002") ??
            shiftRes.data[0];
          setShiftSystemId(rotating?.id ?? null);
        }
      }
      if (!contractRes.success) {
        setError(contractRes.message);
        return;
      }
      const c = contractRes.data;
      setExistingActive(c);
      if (c) {
        setKind(c.kind);
        setLaborType(
          c.laborType === "FIXED_TERM" ? "FIXED_TERM" : "INDEFINITE",
        );
        setStartDate(todayIso());
        setEndDate("");
        setBaseSalary(c.baseSalary ?? "");
        setFeeAmount(c.feeAmount ?? "");
        setWorkRegime(c.workRegime ?? "ORDINARY");
        setWeeklyHours(
          c.weeklyHours != null ? String(c.weeklyHours) : "45",
        );
        setExtraHoursMode(
          (c.extraHoursMode as ExtraHoursMode) || "PAID_OVERTIME",
        );
        setMealAllowance(c.mealAllowance ?? "0");
        setTransportAllowance(c.transportAllowance ?? "0");
        setTipsEligible(c.tipsEligible === true);
        setAfpId(c.afpId ?? null);
        setHealthSystem(c.healthSystem ?? "");
        setIsapreId(c.isapreId ?? null);
        setHealthContributionMode(
          (c.healthContributionMode as HealthContributionMode) || "PERCENT",
        );
        setHealthContributionValue(c.healthContributionValue ?? "");
        const m = resolveMutualSelect(c.mutualName);
        setMutualSelect(m.select);
        setMutualOther(m.other);
        setJobPositionId(c.jobPositionId ?? null);
        setDuties(c.duties ?? "");
        setCommissionType(c.salesCommissionType ?? "NONE");
        setCommissionValue(c.salesCommissionValue ?? "");
        setShiftSystemId(c.shiftSystemId ?? null);
        setFixedSchedule(
          (c.fixedScheduleJson as Record<string, ScheduleSlot>) ?? emptySchedule(),
        );
        setFlexibleMode((c.flexibleMode as FlexibleMode) ?? "BAND");
        setFlexibleBand(
          (c.flexibleBandJson as Record<string, FlexibleBandSlot>) ?? emptyBand(),
        );
        setArt22Exempt(c.art22Exempt === true);
        setExceptionalResolutionRef(c.exceptionalResolutionRef ?? "");
      } else {
        setKind("LABOR");
        setLaborType("INDEFINITE");
        setStartDate(todayIso());
        setEndDate("");
        setBaseSalary("");
        setFeeAmount("");
        setWorkRegime("ORDINARY");
        setWeeklyHours("45");
        setExtraHoursMode("PAID_OVERTIME");
        setMealAllowance("0");
        setTransportAllowance("0");
        setTipsEligible(false);
        setAfpId(null);
        setHealthSystem("");
        setIsapreId(null);
        setHealthContributionMode("PERCENT");
        setHealthContributionValue("");
        setMutualSelect("");
        setMutualOther("");
        setJobPositionId(null);
        setDuties("");
        setCommissionType("NONE");
        setCommissionValue("");
        const defaultShift =
          shiftRes.success && shiftRes.data.length > 0
            ? (shiftRes.data.find((s) => s.code === "SS00002") ?? shiftRes.data[0])
            : null;
        setShiftSystemId(defaultShift?.id ?? null);
        setFixedSchedule(emptySchedule());
        setFlexibleMode("BAND");
        setFlexibleBand(emptyBand());
        setArt22Exempt(false);
        setExceptionalResolutionRef("");
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

  function mutualNameValue(): string | null {
    if (kind !== "LABOR") return null;
    if (mutualSelect === MUTUAL_OTHER) return mutualOther.trim() || null;
    return mutualSelect.trim() || null;
  }

  function buildBody() {
    if (kind === "FEE") {
      return {
        kind,
        laborType: null,
        startDate,
        endDate: endDate.trim() || null,
        baseSalary: null,
        feeAmount: feeAmount.trim() || null,
        workRegime: null,
        weeklyHours: null,
        extraHoursMode: null,
        mealAllowance: mealAllowance || "0",
        transportAllowance: transportAllowance || "0",
        tipsEligible: false,
        afpId: null,
        healthSystem: null,
        isapreId: null,
        healthContributionMode: null,
        healthContributionValue: null,
        mutualName: null,
        shiftSystemId: null,
        fixedScheduleJson: null,
        flexibleMode: null,
        flexibleBandJson: null,
        art22Exempt: null,
        exceptionalResolutionRef: null,
        jobPositionId,
        duties: duties.trim() || null,
        salesCommissionType: commissionType,
        salesCommissionValue:
          commissionType === "NONE" ? null : commissionValue.trim() || null,
        activate: true,
        status: "ACTIVE",
      };
    }
    return {
      kind,
      laborType,
      startDate,
      endDate: endDate.trim() || null,
      baseSalary: baseSalary.trim() || null,
      feeAmount: null,
      workRegime,
      weeklyHours: weeklyHours.trim() || null,
      extraHoursMode,
      mealAllowance: mealAllowance || "0",
      transportAllowance: transportAllowance || "0",
      tipsEligible,
      afpId: afpId?.trim() || null,
      healthSystem: healthSystem.trim() || null,
      isapreId:
        healthSystem === "ISAPRE" ? isapreId?.trim() || null : null,
      healthContributionMode:
        healthSystem === "ISAPRE" ? healthContributionMode : null,
      healthContributionValue:
        healthSystem === "ISAPRE"
          ? healthContributionValue.trim() || null
          : null,
      mutualName: mutualNameValue(),
      shiftSystemId,
      fixedScheduleJson:
        selectedShiftSystem?.type === "FIXED" ? fixedSchedule : null,
      flexibleMode:
        selectedShiftSystem?.type === "FLEXIBLE" ? flexibleMode : null,
      flexibleBandJson:
        selectedShiftSystem?.type === "FLEXIBLE" && flexibleMode === "BAND"
          ? flexibleBand
          : null,
      art22Exempt:
        selectedShiftSystem?.type === "FREE" ? art22Exempt : null,
      exceptionalResolutionRef:
        selectedShiftSystem?.type === "EXCEPTIONAL"
          ? exceptionalResolutionRef.trim() || null
          : null,
      jobPositionId,
      duties: duties.trim() || null,
      salesCommissionType: commissionType,
      salesCommissionValue:
        commissionType === "NONE" ? null : commissionValue.trim() || null,
      activate: true,
      status: "ACTIVE",
    };
  }

  const canSave =
    !!startDate &&
    (kind === "FEE"
      ? !!feeAmount.trim()
      : !!baseSalary.trim() &&
        !!shiftSystemId &&
        !!extraHoursMode &&
        (selectedShiftSystem?.type !== "FREE" ? !!weeklyHours.trim() : true) &&
        (selectedShiftSystem?.type !== "FREE" ||
          art22Exempt === true) &&
        (healthSystem !== "ISAPRE" ||
          (!!isapreId && !!healthContributionValue.trim())));

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={`Contrato${employeeName ? ` — ${employeeName}` : ""}`}
        size="lg"
        scroll="paper"
        maxHeight="min(90vh, 720px)"
        actions={
          <>
            <Button variant="outlined" onClick={onClose} disabled={pending}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              disabled={pending || !canSave}
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
        <div className="flex w-full min-w-0 flex-col gap-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {existingActive ? (
            <Alert variant="info">
              Al guardar se termina el contrato activo y se crea una versión
              nueva (historial inmutable).
            </Alert>
          ) : null}

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">
              Tipo y cargo
            </p>
            <Select
              label="Tipo de contrato"
              value={kind}
              onChange={(id) => setKind(String(id ?? "LABOR"))}
              options={Object.entries(CONTRACT_KIND_LABELS).map(
                ([id, label]) => ({ id, label }),
              )}
            />
            {kind === "LABOR" ? (
              <Select
                label="Modalidad del vínculo"
                value={laborType}
                onChange={(id) => setLaborType(String(id ?? "INDEFINITE"))}
                options={Object.entries(LABOR_TYPE_LABELS).map(
                  ([id, label]) => ({ id, label }),
                )}
              />
            ) : null}
            <Select
              label="Cargo"
              value={jobPositionId}
              onChange={(id) =>
                applyJobPosition(id != null ? String(id) : null)
              }
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            </div>
          </div>

          {kind === "LABOR" ? (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground">Jornada</p>
              <Select
                label="Tipo de jornada"
                value={workRegime}
                onChange={(id) => {
                  const next = String(id ?? "ORDINARY");
                  setWorkRegime(next);
                  if (next === "PARTIAL") {
                    const n = Number(weeklyHours);
                    if (!Number.isFinite(n) || n > 30) setWeeklyHours("30");
                  }
                }}
                options={Object.entries(WORK_REGIME_LABELS).map(
                  ([id, label]) => ({ id, label }),
                )}
              />
              <TextField
                label="Horas semanales pactadas"
                type="number"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
                helperText={
                  selectedShiftSystem?.type === "FREE"
                    ? "Opcional para jornada sin control (Art. 22)"
                    : workRegime === "PARTIAL"
                      ? "Parcial: máximo 30 h/semana (Art. 40 bis)"
                      : undefined
                }
              />
              <Select
                label="Sistema de jornada"
                value={shiftSystemId}
                onChange={(id) => {
                  const nextId = id != null ? String(id) : null;
                  setShiftSystemId(nextId);
                  const sys = shiftSystems.find((s) => s.id === nextId);
                  if (sys?.code === "SS00004") setFlexibleMode("OPEN");
                  if (sys?.code === "SS00003") setFlexibleMode("BAND");
                  if (sys?.type === "FREE") setArt22Exempt(true);
                }}
                options={shiftSystemOptions}
                alwaysShowLabel
              />
              {selectedShiftSystem?.type === "FIXED" ? (
                <div className="space-y-2 rounded-md border border-dashed p-3">
                  <p className="text-sm font-medium">Horario fijo (contrato)</p>
                  {Object.entries(WEEKDAY_LABELS).map(([day, label]) => {
                    const slot = fixedSchedule[day];
                    return (
                      <div key={day} className="grid grid-cols-3 gap-2 items-end">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <TextField
                          label="Inicio"
                          type="time"
                          value={slot?.start ?? ""}
                          onChange={(e) =>
                            setFixedSchedule((prev) => ({
                              ...prev,
                              [day]: slot
                                ? { ...slot, start: e.target.value }
                                : { start: e.target.value, end: "18:00" },
                            }))
                          }
                        />
                        <TextField
                          label="Fin"
                          type="time"
                          value={slot?.end ?? ""}
                          onChange={(e) =>
                            setFixedSchedule((prev) => ({
                              ...prev,
                              [day]: slot
                                ? { ...slot, end: e.target.value }
                                : { start: "09:00", end: e.target.value },
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {selectedShiftSystem?.type === "FLEXIBLE" ? (
                <>
                  <Select
                    label="Modalidad flexible"
                    value={flexibleMode}
                    onChange={(id) =>
                      setFlexibleMode(String(id ?? "BAND") as FlexibleMode)
                    }
                    options={Object.entries(FLEXIBLE_MODE_LABELS).map(
                      ([id, label]) => ({ id, label }),
                    )}
                  />
                  {flexibleMode === "BAND" ? (
                    <div className="space-y-2 rounded-md border border-dashed p-3">
                      <p className="text-sm font-medium">Ventana de ingreso</p>
                      {Object.entries(WEEKDAY_LABELS).map(([day, label]) => {
                        const slot = flexibleBand[day];
                        return (
                          <div key={day} className="grid grid-cols-3 gap-2 items-end">
                            <span className="text-sm text-muted-foreground">
                              {label}
                            </span>
                            <TextField
                              label="Desde"
                              type="time"
                              value={slot?.earliestStart ?? ""}
                              onChange={(e) =>
                                setFlexibleBand((prev) => ({
                                  ...prev,
                                  [day]: {
                                    ...slot,
                                    earliestStart: e.target.value,
                                    latestStart: slot?.latestStart ?? "10:00",
                                  },
                                }))
                              }
                            />
                            <TextField
                              label="Hasta (máx. ingreso)"
                              type="time"
                              value={slot?.latestStart ?? ""}
                              onChange={(e) =>
                                setFlexibleBand((prev) => ({
                                  ...prev,
                                  [day]: {
                                    ...slot,
                                    earliestStart: slot?.earliestStart ?? "08:00",
                                    latestStart: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              ) : null}
              {selectedShiftSystem?.type === "FREE" ? (
                <>
                  <Alert variant="info">
                    Jornada exenta de control de asistencia (Art. 22). El motor
                    no generará atrasos ni horas extras automáticas.
                  </Alert>
                  <div className="flex items-center gap-2">
                    <Switch checked={art22Exempt} onChange={setArt22Exempt} />
                    <span className="text-sm">
                      Confirmo cláusula Art. 22 en el contrato
                    </span>
                  </div>
                </>
              ) : null}
              {selectedShiftSystem?.type === "EXCEPTIONAL" ? (
                <TextField
                  label="Resolución DT / referencia"
                  value={exceptionalResolutionRef}
                  onChange={(e) => setExceptionalResolutionRef(e.target.value)}
                />
              ) : null}
              {selectedShiftSystem?.type === "ROTATING" ? (
                <Alert variant="info">
                  El horario se asigna en Turnos UL y el planificador semanal.
                </Alert>
              ) : null}
              <Select
                label="Horas extras / compensación"
                value={extraHoursMode}
                onChange={(id) =>
                  setExtraHoursMode(
                    String(id ?? "PAID_OVERTIME") as ExtraHoursMode,
                  )
                }
                options={Object.entries(EXTRA_HOURS_MODE_LABELS).map(
                  ([id, label]) => ({ id, label }),
                )}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground">
              Remuneración
            </p>
            {kind === "LABOR" ? (
              <>
                <TextField
                  label="Sueldo base"
                  type="currency"
                  currencySymbol="$"
                  startSymbol="$"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={tipsEligible} onChange={setTipsEligible} />
                  <span className="text-sm text-foreground">Propinas</span>
                </div>
              </>
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
          </div>

          {kind === "LABOR" ? (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground">
                Previsión y mutual
              </p>
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
                label="Sistema de salud"
                value={healthSystem || null}
                onChange={(id) => {
                  const next = id != null ? String(id) : "";
                  setHealthSystem(next);
                  if (next !== "ISAPRE") {
                    setIsapreId(null);
                    setHealthContributionValue("");
                  }
                }}
                options={[
                  { id: "FONASA", label: "Fonasa" },
                  { id: "ISAPRE", label: "Isapre" },
                ]}
                allowClear
              />
              {healthSystem === "ISAPRE" ? (
                <>
                  <Select
                    label="Isapre"
                    value={isapreId}
                    onChange={(id) =>
                      setIsapreId(id != null ? String(id) : null)
                    }
                    options={isapreOptions}
                    alwaysShowLabel
                  />
                  <Select
                    label="Modo aporte Isapre"
                    value={healthContributionMode}
                    onChange={(id) =>
                      setHealthContributionMode(
                        String(id ?? "PERCENT") as HealthContributionMode,
                      )
                    }
                    options={[
                      { id: "PERCENT", label: "Porcentaje (%)" },
                      { id: "FIXED", label: "Monto (CLP)" },
                    ]}
                  />
                  <TextField
                    label={
                      healthContributionMode === "FIXED"
                        ? "Aporte plan Isapre"
                        : "Aporte plan Isapre (%)"
                    }
                    {...(healthContributionMode === "FIXED"
                      ? {
                          type: "currency" as const,
                          currencySymbol: "$",
                          startSymbol: "$",
                        }
                      : { type: "number" as const })}
                    value={healthContributionValue}
                    onChange={(e) =>
                      setHealthContributionValue(e.target.value)
                    }
                  />
                </>
              ) : null}
              <Select
                label="Mutual / ISL"
                value={mutualSelect || null}
                onChange={(id) =>
                  setMutualSelect(id != null ? String(id) : "")
                }
                options={MUTUAL_OPTIONS.map((o) => ({
                  id: o.id,
                  label: o.label,
                }))}
                allowClear
              />
              {mutualSelect === MUTUAL_OTHER ? (
                <TextField
                  label="Nombre mutual"
                  value={mutualOther}
                  onChange={(e) => setMutualOther(e.target.value)}
                />
              ) : null}
            </div>
          ) : null}
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
