import { Employee } from '@modules/employees/domain/employee.entity';

export interface EmployeeRepositoryPort {
  findById(id: string): Promise<Employee | null>;
  createQueryBuilder(alias: string): any; // TypeORM query builder
}