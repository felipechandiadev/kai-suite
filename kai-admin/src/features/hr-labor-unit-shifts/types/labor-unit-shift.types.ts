export type LaborUnitShiftView = {
  id: string;
  companyId: string;
  laborUnitId: string;
  code: string;
  name: string;
  scheduleJson?: Record<string, { start?: string; end?: string } | null> | null;
  timezone: string;
  isActive: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export type LaborUnitShiftMemberView = {
  id: string;
  companyId: string;
  shiftId: string;
  employeeId: string;
  status: "ACTIVE" | "INACTIVE";
};

export type ActiveLaborUnitShiftMembership = {
  member: LaborUnitShiftMemberView;
  shift: LaborUnitShiftView;
} | null;
