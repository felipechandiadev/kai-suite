import { Employee } from '../../domain/employee.entity';

export interface CreateEmployeePayload {
  personId: string;
  companyId?: string;
  branchId?: string | null;
  resultCenterId?: string | null;
  organizationalUnitId?: string | null;
  laborUnitId: string;
  employmentType: string;
  hireDate: string;
  baseSalary?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateEmployeePayload {
  id: string;
  branchId?: string | null;
  resultCenterId?: string | null;
  organizationalUnitId?: string | null;
  laborUnitId?: string;
  employmentType?: string;
  status?: string;
  terminationDate?: string | null;
  baseSalary?: string | null;
  workRegime?: string;
  metadata?: Record<string, unknown> | null;
}

export interface EmployeeRepositoryPort {
  createEmployee(payload: CreateEmployeePayload): Promise<Employee>;
  updateEmployee(payload: UpdateEmployeePayload): Promise<Employee>;
  deleteEmployee(id: string): Promise<{ success: true }>;
  findEmployeeById(id: string): Promise<Employee | null>;
  findAllEmployees(params: {
    includeTerminated?: boolean;
    status?: string;
    branchId?: string;
    companyId?: string;
  }): Promise<Employee[]>;
}
