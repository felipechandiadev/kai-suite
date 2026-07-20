export type ShiftSystemType =
  | "FIXED"
  | "ROTATING"
  | "FLEXIBLE"
  | "FREE"
  | "EXCEPTIONAL";

export type FlexibleMode = "BAND" | "OPEN";

export type ShiftSystemView = {
  id: string;
  code: string;
  name: string;
  type: ShiftSystemType;
  requiresPlannerAssignment: boolean;
  generatesLateEvents: boolean;
  overtimeEnabled: boolean;
  cycleConfigJson?: { daysOn?: number; daysOff?: number } | null;
  isActive: boolean;
};

export type CreateShiftSystemInput = {
  name: string;
  type: ShiftSystemType;
  requiresPlannerAssignment?: boolean;
  generatesLateEvents?: boolean;
  overtimeEnabled?: boolean;
  cycleConfigJson?: { daysOn?: number; daysOff?: number } | null;
  isActive?: boolean;
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

export const SEED_SHIFT_SYSTEM_CODES = [
  "SS00001",
  "SS00002",
  "SS00003",
  "SS00004",
  "SS00005",
  "SS00006",
] as const;
