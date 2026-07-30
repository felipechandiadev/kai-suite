export type EmploymentContractKind = "LABOR" | "FEE";
export type EmploymentLaborType = "INDEFINITE" | "FIXED_TERM" | "PART_TIME";
export type EmploymentContractStatus = "DRAFT" | "ACTIVE" | "TERMINATED";
export type SalesCommissionType = "NONE" | "PERCENT" | "FIXED";
export type ExtraHoursMode =
  | "PAID_OVERTIME"
  | "COMPENSATORY_REST"
  | "BOTH"
  | "NONE";
export type HealthContributionMode = "PERCENT" | "FIXED";
export type ShiftSystemType =
  | "FIXED"
  | "ROTATING"
  | "FLEXIBLE"
  | "FREE"
  | "EXCEPTIONAL";
export type FlexibleMode = "BAND" | "OPEN";

export type ScheduleSlot = { start?: string; end?: string } | null;
export type FlexibleBandSlot = {
  earliestStart?: string;
  latestStart?: string;
  earliestEnd?: string;
  latestEnd?: string;
} | null;

export type EmploymentContractView = {
  id: string;
  employeeId: string;
  companyId: string;
  branchId: string | null;
  kind: EmploymentContractKind;
  laborType: EmploymentLaborType | null;
  status: EmploymentContractStatus;
  startDate: string;
  endDate: string | null;
  baseSalary: string | null;
  feeAmount: string | null;
  workRegime: string | null;
  weeklyHours?: string | null;
  extraHoursMode?: string | null;
  mealAllowance: string;
  transportAllowance: string;
  tipsEligible?: boolean;
  afpId?: string | null;
  afpCode: string | null;
  afpName?: string | null;
  afpContributionPercent?: string | null;
  healthSystem: string | null;
  isapreId?: string | null;
  isapreCode?: string | null;
  isapreName?: string | null;
  healthContributionMode?: string | null;
  healthContributionValue?: string | null;
  mutualName?: string | null;
  shiftSystemId?: string | null;
  shiftSystemCode?: string | null;
  shiftSystemName?: string | null;
  shiftSystemType?: ShiftSystemType | null;
  fixedScheduleJson?: Record<string, ScheduleSlot> | null;
  flexibleMode?: FlexibleMode | null;
  flexibleBandJson?: Record<string, FlexibleBandSlot> | null;
  art22Exempt?: boolean | null;
  exceptionalResolutionRef?: string | null;
  notes: string | null;
  documentUrl: string | null;
  supersedesContractId?: string | null;
  jobPositionId?: string | null;
  duties?: string | null;
  salesCommissionType?: SalesCommissionType;
  salesCommissionValue?: string | null;
};

export const CONTRACT_KIND_LABELS: Record<EmploymentContractKind, string> = {
  LABOR: "Laboral (CdT)",
  FEE: "Honorarios",
};

/** Modalidad del vínculo (sin PART_TIME — usar workRegime PARTIAL). */
export const LABOR_TYPE_LABELS: Record<"INDEFINITE" | "FIXED_TERM", string> = {
  INDEFINITE: "Indefinido",
  FIXED_TERM: "Plazo fijo",
};

export const EXTRA_HOURS_MODE_LABELS: Record<ExtraHoursMode, string> = {
  PAID_OVERTIME: "Horas extraordinarias pagadas",
  COMPENSATORY_REST: "Compensación de horas (descanso)",
  BOTH: "Ambos",
  NONE: "Ninguno",
};

export const MUTUAL_OPTIONS = [
  { id: "ACHS", label: "ACHS" },
  { id: "Mutual de Seguridad", label: "Mutual de Seguridad" },
  { id: "IST", label: "IST" },
  { id: "ISL", label: "ISL" },
  { id: "Sin mutual", label: "Sin mutual" },
  { id: "__other__", label: "Otra…" },
] as const;

export const SALES_COMMISSION_LABELS: Record<SalesCommissionType, string> = {
  NONE: "Sin comisión",
  PERCENT: "Porcentaje sobre ventas netas",
  FIXED: "Monto fijo",
};

export const CONTRACT_STATUS_LABELS: Record<EmploymentContractStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  TERMINATED: "Terminado",
};

export const SHIFT_SYSTEM_TYPE_LABELS: Record<ShiftSystemType, string> = {
  FIXED: "Jornada fija",
  ROTATING: "Rotativo",
  FLEXIBLE: "Flexible",
  FREE: "Sin control (Art. 22)",
  EXCEPTIONAL: "Excepcional DT",
};

export const FLEXIBLE_MODE_LABELS: Record<FlexibleMode, string> = {
  BAND: "Con banda horaria",
  OPEN: "Sin banda (por objetivos)",
};
