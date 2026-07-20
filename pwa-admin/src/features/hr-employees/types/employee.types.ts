export type EmployeePersonSummary = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type EmployeePersonDetail = EmployeePersonSummary & {
  address?: string | null;
};

export type EmployeeBranchSummary = {
  id: string;
  name?: string | null;
};

export type EmployeeResultCenterSummary = {
  id: string;
  name?: string | null;
  code?: string | null;
};

export type EmployeeOrganizationalUnitSummary = {
  id: string;
  name?: string | null;
};

export type EmployeeCompanySummary = {
  id: string;
  name?: string | null;
};

export type EmployeeGridRow = {
  id: string;
  companyId?: string;
  personId?: string;
  branchId?: string | null;
  resultCenterId?: string | null;
  organizationalUnitId?: string | null;
  laborUnitId?: string | null;
  employmentType?: string;
  workRegime?: string;
  status?: string;
  hireDate?: string;
  terminationDate?: string | null;
  baseSalary?: string | null;
  person?: EmployeePersonSummary | null;
  branch?: EmployeeBranchSummary | null;
};

export type EmployeeDetailView = {
  id: string;
  personId: string;
  companyId?: string;
  branchId?: string | null;
  resultCenterId?: string | null;
  organizationalUnitId?: string | null;
  laborUnitId?: string | null;
  employmentType?: string;
  workRegime?: string;
  status?: string;
  hireDate?: string;
  terminationDate?: string | null;
  baseSalary?: string | null;
  person?: EmployeePersonDetail | null;
  branch?: EmployeeBranchSummary | null;
  resultCenter?: EmployeeResultCenterSummary | null;
  organizationalUnit?: EmployeeOrganizationalUnitSummary | null;
  company?: EmployeeCompanySummary | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateEmployeePersonPayload = {
  firstName?: string;
  lastName?: string;
  documentType?: "RUT" | "PASSPORT" | "OTHER";
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type UpdateEmployeePayload = {
  branchId?: string | null;
  resultCenterId?: string | null;
  organizationalUnitId?: string | null;
  laborUnitId?: string | null;
  employmentType?: string;
  workRegime?: string;
  status?: string;
  terminationDate?: string | null;
  baseSalary?: string | null;
};

export type ResultCenterListItem = {
  id: string;
  name: string;
  code?: string | null;
};

export type EmployeeListResult = {
  success: boolean;
  data: EmployeeGridRow[];
};

export function employeeDisplayName(
  row: Pick<EmployeeGridRow | EmployeeDetailView, "person"> & { personId?: string },
): string {
  const p = row.person;
  if (!p) {
    return row.personId?.trim() || "—";
  }
  const business = p.businessName?.trim();
  if (business) {
    return business;
  }
  const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return full || "—";
}
