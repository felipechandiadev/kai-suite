export type EmploymentContractKind = "LABOR" | "FEE";
export type EmploymentLaborType = "INDEFINITE" | "FIXED_TERM" | "PART_TIME";
export type EmploymentContractStatus = "DRAFT" | "ACTIVE" | "TERMINATED";
export type SalesCommissionType = "NONE" | "PERCENT" | "FIXED";

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
  workRegime: string;
  mealAllowance: string;
  transportAllowance: string;
  tipsEligible?: boolean;
  afpId?: string | null;
  afpCode: string | null;
  afpName?: string | null;
  afpContributionPercent?: string | null;
  healthSystem: string | null;
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

export const LABOR_TYPE_LABELS: Record<EmploymentLaborType, string> = {
  INDEFINITE: "Indefinido",
  FIXED_TERM: "Plazo fijo",
  PART_TIME: "Jornada parcial",
};

export const SALES_COMMISSION_LABELS: Record<SalesCommissionType, string> = {
  NONE: "Sin comisión",
  PERCENT: "Porcentaje sobre ventas",
  FIXED: "Monto fijo",
};

export const CONTRACT_STATUS_LABELS: Record<EmploymentContractStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  TERMINATED: "Terminado",
};
