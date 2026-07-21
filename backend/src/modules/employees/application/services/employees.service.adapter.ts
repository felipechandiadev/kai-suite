import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateEmployeeCommand } from '../commands/create-employee.command';
import { UpdateEmployeeCommand } from '../commands/update-employee.command';
import { DeleteEmployeeCommand } from '../commands/delete-employee.command';
import { GetEmployeeByIdQuery } from '../queries/get-employee-by-id.query';
import { GetAllEmployeesQuery } from '../queries/get-all-employees.query';
import {
  Employee,
  EmploymentType,
} from '../../domain/employee.entity';
import { User, UserRole } from '@modules/users/domain/user.entity';
import { Person, PersonType } from '@modules/persons/domain/person.entity';
import { TenantContext } from '@common/tenant';
import type { AlsoAsUserDto } from '@modules/users/application/dto/user.dto';
import { LaborUnitsService } from '@modules/hr-labor-units/application/labor-units.service';
import { EmploymentContractsService } from '../employment-contracts.service';
import {
  SalesCommissionType,
} from '../../domain/employment-contract.enums';

@Injectable()
export class EmployeesServiceAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Person)
    private readonly personsRepository: Repository<Person>,
    private readonly dataSource: DataSource,
    private readonly laborUnitsService: LaborUnitsService,
    private readonly employmentContractsService: EmploymentContractsService,
  ) {}

  async getAllEmployees(params?: {
    includeTerminated?: boolean;
    status?: string;
    branchId?: string;
    companyId?: string;
  }): Promise<
    Array<
      Employee & {
        tipsEligible: boolean;
        salesCommissionType: SalesCommissionType;
        salesCommissionValue: string | null;
      }
    >
  > {
    const employees = await this.queryBus.execute(
      new GetAllEmployeesQuery(
        params?.includeTerminated,
        params?.status,
        params?.branchId,
        params?.companyId,
      ),
    );
    const flags =
      await this.employmentContractsService.findActiveCompFlagsByEmployeeIds(
        employees.map((e: Employee) => e.id),
      );
    return employees.map((employee: Employee) => {
      const f = flags.get(employee.id);
      return Object.assign(employee, {
        tipsEligible: f?.tipsEligible ?? false,
        salesCommissionType:
          f?.salesCommissionType ?? SalesCommissionType.NONE,
        salesCommissionValue: f?.salesCommissionValue ?? null,
      });
    });
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    return this.queryBus.execute(new GetEmployeeByIdQuery(id));
  }

  async createEmployee(data: {
    personId: string;
    companyId?: string;
    branchId?: string;
    resultCenterId?: string;
    organizationalUnitId?: string;
    laborUnitId: string;
    employmentType: string;
    hireDate: string;
    baseSalary?: string;
    metadata?: Record<string, unknown>;
    alsoAsUser?: AlsoAsUserDto;
  }): Promise<{ employee: Employee; user?: { id: string; userName: string } }> {
    const laborUnitId = data.laborUnitId?.trim();
    if (!laborUnitId) {
      throw new BadRequestException('La unidad laboral es obligatoria.');
    }
    await this.laborUnitsService.get(laborUnitId);

    const existing = await this.employeesRepository.findOne({
      where: { personId: data.personId, deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un empleado asociado a esta persona.',
      );
    }

    const person = await this.personsRepository.findOne({
      where: { id: data.personId },
    });
    if (!person || person.deletedAt) {
      throw new BadRequestException('La persona indicada no existe.');
    }

    if (data.alsoAsUser && person.type !== PersonType.NATURAL) {
      throw new BadRequestException(
        'alsoAsUser requiere una persona natural.',
      );
    }

    if (!data.alsoAsUser) {
      const employee = await this.commandBus.execute(
        new CreateEmployeeCommand(
          data.personId,
          data.companyId,
          data.branchId,
          data.resultCenterId,
          data.organizationalUnitId,
          laborUnitId,
          data.employmentType,
          data.hireDate,
          data.baseSalary,
          data.metadata,
        ),
      );
      return { employee };
    }

    const companyId =
      data.companyId ?? TenantContext.getCompanyId() ?? null;
    if (!companyId) {
      throw new BadRequestException(
        'Se requiere empresa activa para crear empleado y usuario.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const empRepo = manager.getRepository(Employee);
      const userRepo = manager.getRepository(User);

      const existingEmp = await empRepo.findOne({
        where: { personId: data.personId, deletedAt: IsNull() },
      });
      if (existingEmp) {
        throw new ConflictException(
          'Ya existe un empleado asociado a esta persona.',
        );
      }

      const existingUser = await userRepo
        .createQueryBuilder('u')
        .leftJoin('u.person', 'p')
        .where('p.id = :personId', { personId: data.personId })
        .andWhere('u.deletedAt IS NULL')
        .getOne();
      if (existingUser) {
        throw new ConflictException(
          'Ya existe un usuario de plataforma asociado a esta persona.',
        );
      }

      const employee = empRepo.create({
        personId: data.personId,
        companyId,
        branchId: data.branchId ?? null,
        resultCenterId: data.resultCenterId ?? null,
        organizationalUnitId: data.organizationalUnitId ?? null,
        laborUnitId,
        employmentType: (data.employmentType as EmploymentType) || EmploymentType.FULL_TIME,
        hireDate: data.hireDate,
        baseSalary: data.baseSalary ?? null,
        metadata: data.metadata ?? null,
      });
      const savedEmp = await empRepo.save(employee);

      const rol = (data.alsoAsUser!.rol as UserRole) || UserRole.OPERATOR;
      if (rol === UserRole.SUPER_ADMIN) {
        throw new BadRequestException(
          'No se puede crear SUPER_ADMIN desde el alta de empleado.',
        );
      }

      const user = userRepo.create({
        userName: data.alsoAsUser!.userName,
        mail: data.alsoAsUser!.mail,
        pass: bcrypt.hashSync(data.alsoAsUser!.password, 12),
        rol,
        companyId,
        person: { id: data.personId } as Person,
      } as DeepPartial<User>);
      const savedUser = await userRepo.save(user);

      return {
        employee: savedEmp,
        user: { id: savedUser.id, userName: savedUser.userName },
      };
    });
  }

  async updateEmployee(
    id: string,
    data: Partial<{
      branchId?: string | null;
      resultCenterId?: string | null;
      organizationalUnitId?: string | null;
      laborUnitId?: string;
      employmentType?: string;
      status?: string;
      terminationDate?: string | null;
      baseSalary?: string | null;
      workRegime?: string;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<Employee> {
    if (data.laborUnitId !== undefined) {
      const laborUnitId = data.laborUnitId?.trim();
      if (!laborUnitId) {
        throw new BadRequestException('La unidad laboral es obligatoria.');
      }
      await this.laborUnitsService.get(laborUnitId);
      data = { ...data, laborUnitId };
    }
    return this.commandBus.execute(
      new UpdateEmployeeCommand(
        id,
        data.branchId,
        data.resultCenterId,
        data.organizationalUnitId,
        data.laborUnitId,
        data.employmentType,
        data.status,
        data.terminationDate,
        data.baseSalary,
        data.metadata,
        data.workRegime,
      ),
    );
  }

  async deleteEmployee(id: string): Promise<{ success: true }> {
    return this.commandBus.execute(new DeleteEmployeeCommand(id));
  }
}
