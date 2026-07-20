export enum EmploymentContractKind {
  LABOR = 'LABOR',
  FEE = 'FEE',
}

export enum EmploymentLaborType {
  INDEFINITE = 'INDEFINITE',
  FIXED_TERM = 'FIXED_TERM',
  PART_TIME = 'PART_TIME',
}

export enum EmploymentContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  TERMINATED = 'TERMINATED',
}

export enum SalesCommissionType {
  NONE = 'NONE',
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum ExtraHoursMode {
  PAID_OVERTIME = 'PAID_OVERTIME',
  COMPENSATORY_REST = 'COMPENSATORY_REST',
  BOTH = 'BOTH',
  NONE = 'NONE',
}

export enum HealthContributionMode {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}
