import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryDeepPartialEntity } from 'typeorm';
import {
  EmployeeRepositoryPort,
  CreateEmployeePayload,
  UpdateEmployeePayload,
} from '../../application/ports/employee.repository.port';
import {
  Employee,
  EmploymentType,
  EmployeeStatus,
  WorkRegime,
} from '../../domain/employee.entity';
import { Company } from '@modules/companies/domain/company.entity';

@Injectable()
export class TypeOrmEmployeeRepository implements EmployeeRepositoryPort {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    let companyId = payload.companyId;

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

    const employee = this.employeeRepository.create({
      personId: payload.personId,
      companyId,
      branchId: payload.branchId ?? null,
      resultCenterId: payload.resultCenterId ?? null,
      organizationalUnitId: payload.organizationalUnitId ?? null,
      laborUnitId: payload.laborUnitId,
      employmentType: (payload.employmentType ||
        EmploymentType.FULL_TIME) as EmploymentType,
      status: EmployeeStatus.ACTIVE,
      hireDate: payload.hireDate,
      baseSalary: payload.baseSalary ?? null,
      metadata: payload.metadata ?? null,
    });

    const saved = await this.employeeRepository.save(employee);

    const reloaded = await this.employeeRepository.findOne({
      where: { id: saved.id },
      relations: [
        'company',
        'person',
        'branch',
        'resultCenter',
        'organizationalUnit',
      ],
    });

    return this.toDomain(reloaded ?? saved);
  }

  async updateEmployee(payload: UpdateEmployeePayload): Promise<Employee> {
    const updateData: QueryDeepPartialEntity<Employee> = {};

    if (payload.branchId !== undefined) updateData.branchId = payload.branchId;
    if (payload.resultCenterId !== undefined)
      updateData.resultCenterId = payload.resultCenterId;
    if (payload.organizationalUnitId !== undefined)
      updateData.organizationalUnitId = payload.organizationalUnitId;
    if (payload.laborUnitId !== undefined)
      updateData.laborUnitId = payload.laborUnitId;
    if (payload.employmentType !== undefined)
      updateData.employmentType = payload.employmentType as EmploymentType;
    if (payload.status !== undefined)
      updateData.status = payload.status as EmployeeStatus;
    if (payload.terminationDate !== undefined)
      updateData.terminationDate = payload.terminationDate;
    if (payload.baseSalary !== undefined)
      updateData.baseSalary = payload.baseSalary;
    if (payload.workRegime !== undefined)
      updateData.workRegime = payload.workRegime as WorkRegime;
    if (payload.metadata !== undefined)
      updateData.metadata = payload.metadata as any;

    await this.employeeRepository.update(payload.id, updateData);

    const updated = await this.employeeRepository.findOne({
      where: { id: payload.id },
      relations: [
        'company',
        'person',
        'branch',
        'resultCenter',
        'organizationalUnit',
      ],
    });

    if (!updated) {
      throw new Error(`Employee with id ${payload.id} not found`);
    }

    return this.toDomain(updated);
  }

  async deleteEmployee(id: string): Promise<{ success: true }> {
    await this.employeeRepository.softDelete(id);
    return { success: true };
  }

  async findEmployeeById(id: string): Promise<Employee | null> {
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

    return employee ? this.toDomain(employee) : null;
  }

  async findAllEmployees(params: {
    includeTerminated?: boolean;
    status?: string;
    branchId?: string;
    companyId?: string;
  }): Promise<Employee[]> {
    const qb = this.employeeRepository.createQueryBuilder('employee');

    qb.leftJoinAndSelect('employee.company', 'company');
    qb.leftJoinAndSelect('employee.person', 'person');
    qb.leftJoinAndSelect('employee.branch', 'branch');
    qb.leftJoinAndSelect('employee.resultCenter', 'resultCenter');
    qb.leftJoinAndSelect('employee.organizationalUnit', 'organizationalUnit');

    if (params.status) {
      qb.andWhere('employee.status = :status', { status: params.status });
    } else if (!params.includeTerminated) {
      qb.andWhere('employee.status != :terminated', {
        terminated: EmployeeStatus.TERMINATED,
      });
    }

    if (params.branchId) {
      qb.andWhere('employee.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    if (params.companyId) {
      qb.andWhere('employee.companyId = :companyId', {
        companyId: params.companyId,
      });
    }

    const employees = await qb
      .orderBy('person.firstName', 'ASC')
      .addOrderBy('person.lastName', 'ASC')
      .getMany();

    return employees.map((emp) => this.toDomain(emp));
  }

  private toDomain(orm: Employee): Employee {
    const employee = new Employee({
      id: orm.id,
      companyId: orm.companyId,
      personId: orm.personId,
      branchId: orm.branchId ?? null,
      resultCenterId: orm.resultCenterId ?? null,
      organizationalUnitId: orm.organizationalUnitId ?? null,
      laborUnitId: orm.laborUnitId,
      employmentType: orm.employmentType,
      status: orm.status,
      hireDate: orm.hireDate,
      terminationDate: orm.terminationDate ?? null,
      baseSalary: orm.baseSalary ?? null,
      metadata: orm.metadata ?? null,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
      deletedAt: orm.deletedAt,
    });

    if (orm.company) employee.company = orm.company;
    if (orm.person) employee.person = orm.person;
    if (orm.branch) employee.branch = orm.branch;
    if (orm.resultCenter) employee.resultCenter = orm.resultCenter;
    if (orm.organizationalUnit) employee.organizationalUnit = orm.organizationalUnit;

    return employee;
  }
}
