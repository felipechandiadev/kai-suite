import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Employee } from '@modules/employees/domain/employee.entity';
import { HrLaborUnit } from '@modules/hr-labor-units/domain/hr-labor-unit.entity';
import { HrLaborUnitShift } from '../domain/hr-labor-unit-shift.entity';
import {
  HrLaborUnitShiftMember,
  LaborUnitShiftMemberStatus,
} from '../domain/hr-labor-unit-shift-member.entity';
import {
  HR_LABOR_UNIT_SHIFT_CODE_PREFIX,
  nextPrefixedSequenceCodeFromExisting,
} from '@shared/codes/prefixed-sequence-code.util';

function requireCompanyId(): string {
  const companyId = TenantContext.getCompanyId();
  if (!companyId) throw new BadRequestException('Company context required');
  return companyId;
}

export type UpsertLaborUnitShiftInput = {
  laborUnitId: string;
  name: string;
  scheduleJson?: Record<string, { start?: string; end?: string } | null> | null;
  timezone?: string;
  isActive?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

@Injectable()
export class LaborUnitShiftsService {
  constructor(
    @InjectRepository(HrLaborUnitShift)
    private readonly shiftRepo: Repository<HrLaborUnitShift>,
    @InjectRepository(HrLaborUnitShiftMember)
    private readonly memberRepo: Repository<HrLaborUnitShiftMember>,
    @InjectRepository(HrLaborUnit)
    private readonly laborUnitRepo: Repository<HrLaborUnit>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly dataSource: DataSource,
  ) {}

  async list(laborUnitId?: string) {
    const companyId = requireCompanyId();
    const where: Record<string, unknown> = {
      companyId,
      deletedAt: IsNull(),
    };
    if (laborUnitId) where.laborUnitId = laborUnitId;
    return this.shiftRepo.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async get(id: string) {
    const companyId = requireCompanyId();
    const row = await this.shiftRepo.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('Turno no encontrado');
    return row;
  }

  async listMembers(shiftId: string) {
    const shift = await this.get(shiftId);
    return this.memberRepo.find({
      where: { companyId: shift.companyId, shiftId: shift.id },
      order: { createdAt: 'ASC' },
    });
  }

  async getActiveMembershipForEmployee(employeeId: string) {
    const companyId = requireCompanyId();
    const member = await this.memberRepo.findOne({
      where: {
        companyId,
        employeeId,
        status: LaborUnitShiftMemberStatus.ACTIVE,
      },
    });
    if (!member) return null;
    const shift = await this.shiftRepo.findOne({
      where: { id: member.shiftId, companyId, deletedAt: IsNull() },
    });
    if (!shift) return null;
    return { member, shift };
  }

  async create(input: UpsertLaborUnitShiftInput) {
    const companyId = requireCompanyId();
    await this.requireLaborUnit(companyId, input.laborUnitId);
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('Nombre del turno requerido');
    const code = await this.allocateNextCode(companyId);
    return this.shiftRepo.save(
      this.shiftRepo.create({
        companyId,
        laborUnitId: input.laborUnitId,
        code,
        name,
        scheduleJson: input.scheduleJson ?? null,
        timezone: input.timezone?.trim() || 'America/Santiago',
        isActive: input.isActive !== false,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveTo: input.effectiveTo ?? null,
      }),
    );
  }

  async update(id: string, patch: Partial<UpsertLaborUnitShiftInput>) {
    const row = await this.get(id);
    if (patch.laborUnitId && patch.laborUnitId !== row.laborUnitId) {
      await this.requireLaborUnit(row.companyId, patch.laborUnitId);
      row.laborUnitId = patch.laborUnitId;
    }
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new BadRequestException('Nombre del turno requerido');
      row.name = name;
    }
    if (patch.scheduleJson !== undefined) row.scheduleJson = patch.scheduleJson;
    if (patch.timezone !== undefined) {
      row.timezone = patch.timezone?.trim() || 'America/Santiago';
    }
    if (patch.isActive !== undefined) row.isActive = patch.isActive;
    if (patch.effectiveFrom !== undefined)
      row.effectiveFrom = patch.effectiveFrom;
    if (patch.effectiveTo !== undefined) row.effectiveTo = patch.effectiveTo;
    return this.shiftRepo.save(row);
  }

  async addMember(shiftId: string, employeeId: string) {
    const companyId = requireCompanyId();
    const shift = await this.get(shiftId);
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');
    if (employee.laborUnitId !== shift.laborUnitId) {
      throw new BadRequestException(
        'El empleado debe pertenecer a la misma unidad laboral del turno',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const members = manager.getRepository(HrLaborUnitShiftMember);
      const existingActive = await members.findOne({
        where: {
          companyId,
          employeeId,
          status: LaborUnitShiftMemberStatus.ACTIVE,
        },
      });
      if (existingActive) {
        if (existingActive.shiftId === shift.id) return existingActive;
        existingActive.status = LaborUnitShiftMemberStatus.INACTIVE;
        await members.save(existingActive);
      }
      return members.save(
        members.create({
          companyId,
          shiftId: shift.id,
          employeeId,
          status: LaborUnitShiftMemberStatus.ACTIVE,
        }),
      );
    });
  }

  async removeMember(shiftId: string, employeeId: string) {
    const companyId = requireCompanyId();
    await this.get(shiftId);
    const member = await this.memberRepo.findOne({
      where: {
        companyId,
        shiftId,
        employeeId,
        status: LaborUnitShiftMemberStatus.ACTIVE,
      },
    });
    if (!member) throw new NotFoundException('Membresía no encontrada');
    member.status = LaborUnitShiftMemberStatus.INACTIVE;
    return this.memberRepo.save(member);
  }

  private async requireLaborUnit(companyId: string, laborUnitId: string) {
    const ul = await this.laborUnitRepo.findOne({
      where: { id: laborUnitId, companyId, deletedAt: IsNull() },
    });
    if (!ul) throw new BadRequestException('Unidad laboral no encontrada');
    return ul;
  }

  private async allocateNextCode(companyId: string): Promise<string> {
    const rows = await this.shiftRepo.find({
      where: { companyId },
      select: ['code'],
      withDeleted: true,
    });
    return nextPrefixedSequenceCodeFromExisting(
      HR_LABOR_UNIT_SHIFT_CODE_PREFIX,
      rows.map((r) => r.code),
    );
  }
}
