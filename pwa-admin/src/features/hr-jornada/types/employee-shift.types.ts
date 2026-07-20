export type EmployeeShiftView = {
  id: string;
  companyId: string;
  employeeId: string;
  name: string;
  type: string;
  scheduleJson: Record<string, { start?: string; end?: string } | null> | null;
  timezone: string;
  templateId: string | null;
  isNight: boolean;
  isNightOutgoing: boolean;
  status: "ACTIVE" | "INACTIVE";
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
