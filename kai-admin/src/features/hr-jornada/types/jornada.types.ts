export type FindingSeverity = "OK" | "WARNING" | "CRITICAL";
export type FindingCategory = "LEGAL" | "POLICY";

export type ScheduleFinding = {
  ruleCode: string;
  severity: FindingSeverity;
  category: FindingCategory;
  message: string;
  context?: Record<string, unknown>;
};

export type JornadaEmployeeRow = {
  id: string;
  personId: string;
  branchId: string | null;
  laborUnitId?: string | null;
  workRegime: string;
  baseSalary: string | null;
  displayName: string;
  compensatoryBalanceMinutes: number;
};

export type WeekAssignmentView = {
  id: string;
  employeeId: string;
  /** Jornada de la persona (puede diferir de la banda del turno UL). */
  startTime?: string;
  endTime?: string;
  plannedOvertimeMinutes: number;
  notes: string | null;
};

export type WeekInstanceView = {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  templateId: string | null;
  laborUnitShiftId?: string | null;
  isNight: boolean;
  isNightOutgoing: boolean;
  assignments: WeekAssignmentView[];
};

export type ShiftExceptionView = {
  id: string;
  employeeId: string;
  assignmentId: string | null;
  workDate: string;
  type: string;
  minutes: number;
  notes: string | null;
  affectsPayroll: boolean;
  settled: boolean;
};

export type WeekPlanView = {
  weekStart: string;
  weekEnd: string;
  employees: JornadaEmployeeRow[];
  instances: WeekInstanceView[];
  exceptions: ShiftExceptionView[];
  findings: ScheduleFinding[];
  worstSeverity: FindingSeverity;
  holidays: Array<{ date: string; name: string }>;
  config: JornadaConfigView;
};

export type JornadaConfigView = {
  id: string;
  enforcementMode: string;
  monthlyOrdinaryHours: number;
  overtimeMultiplier: string;
  minRestBetweenShiftsMinutes: number;
  nightStart: string;
  nightEnd: string;
  maxWeeklyMinutes: number | null;
  maxMonthlyMinutes: number | null;
  maxDailyOvertimeMinutes: number;
  allowShiftOverlap: boolean;
  compensatoryExpiryDays: number | null;
  defaultMealAllowance?: string;
  defaultTransportAllowance?: string;
  defaultWorkRegime?: string;
  defaultWeeklyHours?: string | number;
  defaultExtraHoursMode?: string;
  defaultShiftSystemId?: string | null;
};

export type ShiftTemplateView = {
  id: string;
  name: string;
  type: string;
  isNight: boolean;
  isNightOutgoing: boolean;
  timezone: string | null;
};

export type WeekAssignmentInput = {
  employeeId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  /** Banda fija del turno UL; no cambia al extender la jornada de la persona. */
  shiftBandStartTime?: string | null;
  shiftBandEndTime?: string | null;
  plannedOvertimeMinutes?: number;
  templateId?: string | null;
  laborUnitShiftId?: string | null;
  isNight?: boolean;
  isNightOutgoing?: boolean;
  notes?: string | null;
};

export type LaborUnitShiftMeta = {
  id: string;
  code: string;
  name: string;
  scheduleJson?: Record<string, { start?: string; end?: string } | null> | null;
};

export type LedgerEntryView = {
  id: string;
  employeeId: string;
  entryType: string;
  minutes: number;
  workDate: string | null;
  expiresOn: string | null;
  reason: string | null;
  createdAt: string;
};

export type AttendanceDocumentView = {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  contentHash: string;
  version: number;
  status: string;
  signedDocumentUrl: string | null;
  signedAt: string | null;
  snapshotJson: Record<string, unknown> | null;
  createdAt: string;
};

export type PayrollSuggestionView = {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  typeId: string;
  amountCents: string;
  description: string | null;
  status: string;
};

export const WORK_REGIME_LABELS: Record<string, string> = {
  ORDINARY: "Ordinaria",
  PARTIAL: "Parcial",
  EXCEPTIONAL_ART38: "Excepcional (Art. 38)",
};

export const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  NO_SHOW: "Inasistencia",
  LATE: "Atraso",
  EARLY_LEAVE: "Retiro anticipado",
  PARTIAL: "Jornada parcial",
  UNPAID_LEAVE: "Ausencia sin goce",
  PAID_LEAVE: "Ausencia con goce",
};

export const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  FREE: "Libre",
  FIXED: "Fijo",
  WEEKLY: "Semanal",
  ROTATING: "Rotativo",
};
