import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Employee,
  EmployeeStatus,
  EmploymentType,
} from '../domain/employee.entity';
import { Company } from '@modules/companies/domain/company.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async getEmployeeById(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: [
        'company',
        'person',
        'branch',
        'resultCenter',
        'organizationalUnit',
      ],
    });

    if (!employee) {
      return null;
    }

    return this.formatEmployee(employee);
  }

  async getAllEmployees(params?: {
    includeTerminated?: boolean;
    status?: EmployeeStatus;
    branchId?: string;
    companyId?: string;
  }) {
    const query = this.employeeRepository.createQueryBuilder('employee');

    query.leftJoinAndSelect('employee.company', 'company');
    query.leftJoinAndSelect('employee.person', 'person');
    query.leftJoinAndSelect('employee.branch', 'branch');
    query.leftJoinAndSelect('employee.resultCenter', 'resultCenter');
    query.leftJoinAndSelect(
      'employee.organizationalUnit',
      'organizationalUnit',
    );

    // Filter by status
    if (params?.status) {
      query.andWhere('employee.status = :status', { status: params.status });
    } else if (!params?.includeTerminated) {
      // By default, exclude terminated employees unless specifically included
      query.andWhere('employee.status != :terminated', {
        terminated: EmployeeStatus.TERMINATED,
      });
    }

    // Filter by branch
    if (params?.branchId) {
      query.andWhere('employee.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    // Filter by company
    if (params?.companyId) {
      query.andWhere('employee.companyId = :companyId', {
        companyId: params.companyId,
      });
    }

    const employees = await query
      .orderBy('person.firstName', 'ASC')
      .addOrderBy('person.lastName', 'ASC')
      .getMany();

    return employees.map((emp) => this.formatEmployee(emp));
  }

  async createEmployee(data: {
    personId: string;
    companyId?: string;
    branchId?: string;
    resultCenterId?: string;
    organizationalUnitId?: string;
    employmentType: EmploymentType | string;
    hireDate: string;
    baseSalary?: string;
    metadata?: Record<string, unknown>;
  }) {
    let companyId = data.companyId;

    // If companyId not provided, get the first available company
    if (!companyId) {
      const firstCompany = await this.companyRepository.findOne({
        where: {},
        order: { createdAt: 'ASC' },
      });

      if (!firstCompany) {
        throw new Error('No company found. Please create a company first.');
      }

      companyId = firstCompany.id;
    }

    const employeeData = {
      ...data,
      companyId,
      employmentType: data.employmentType as EmploymentType,
    };
    const employee = this.employeeRepository.create(employeeData);
    await this.employeeRepository.save(employee);

    return this.getEmployeeById(employee.id);
  }

  async updateEmployee(
    id: string,
    data: Partial<{
      branchId?: string | null;
      resultCenterId?: string | null;
      organizationalUnitId?: string | null;
      employmentType: EmploymentType | string;
      status: EmployeeStatus;
      terminationDate?: string | null;
      baseSalary?: string | null;
      metadata?: Record<string, unknown>;
    }>,
  ) {
    const updateData = { ...data };
    if (updateData.employmentType) {
      (updateData as any).employmentType =
        updateData.employmentType as EmploymentType;
    }
    await this.employeeRepository.update(id, updateData as any);
    return this.getEmployeeById(id);
  }

  async deleteEmployee(id: string) {
    await this.employeeRepository.softDelete(id);
    return { success: true };
  }

  private formatEmployee(employee: Employee) {
    return {
      id: employee.id,
      companyId: employee.companyId,
      personId: employee.personId,
      branchId: employee.branchId ?? null,
      resultCenterId: employee.resultCenterId ?? null,
      organizationalUnitId: employee.organizationalUnitId ?? null,
      laborUnitId: employee.laborUnitId ?? null,
      employmentType: employee.employmentType,
      status: employee.status,
      hireDate: employee.hireDate,
      terminationDate: employee.terminationDate ?? null,
      baseSalary: employee.baseSalary ?? null,
      metadata: employee.metadata ?? null,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
      company: employee.company
        ? {
            id: employee.company.id,
            razonSocial: employee.company.razonSocial,
          }
        : null,
      person: employee.person
        ? {
            id: employee.person.id,
            firstName: employee.person.firstName,
            lastName: employee.person.lastName,
            businessName: employee.person.businessName,
            email: employee.person.email,
            phone: employee.person.phone,
          }
        : null,
      branch: employee.branch
        ? {
            id: employee.branch.id,
            name: employee.branch.name,
          }
        : null,
      resultCenter: employee.resultCenter
        ? {
            id: employee.resultCenter.id,
            name: employee.resultCenter.name,
          }
        : null,
      organizationalUnit: employee.organizationalUnit
        ? {
            id: employee.organizationalUnit.id,
            name: employee.organizationalUnit.name,
          }
        : null,
    };
  }
}
