import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { HrShiftSystem } from '../domain/hr-shift-system.entity';
import {
  SEED_SHIFT_SYSTEM_CODES,
  ShiftSystemType,
} from '../domain/shift-system.enums';
import {
  HR_SHIFT_SYSTEM_CODE_PREFIX,
  nextPrefixedSequenceCodeFromExisting,
} from '@shared/codes/prefixed-sequence-code.util';

function requireCompanyId(): string {
  const companyId = TenantContext.getCompanyId();
  if (!companyId) throw new BadRequestException('Company context required');
  return companyId;
}

function isShiftSystemType(v: string): v is ShiftSystemType {
  return Object.values(ShiftSystemType).includes(v as ShiftSystemType);
}

const DEFAULT_FLAGS: Record<
  ShiftSystemType,
  {
    requiresPlannerAssignment: boolean;
    generatesLateEvents: boolean;
    overtimeEnabled: boolean;
  }
> = {
  [ShiftSystemType.FIXED]: {
    requiresPlannerAssignment: false,
    generatesLateEvents: true,
    overtimeEnabled: true,
  },
  [ShiftSystemType.ROTATING]: {
    requiresPlannerAssignment: true,
    generatesLateEvents: true,
    overtimeEnabled: true,
  },
  [ShiftSystemType.FLEXIBLE]: {
    requiresPlannerAssignment: false,
    generatesLateEvents: true,
    overtimeEnabled: true,
  },
  [ShiftSystemType.FREE]: {
    requiresPlannerAssignment: false,
    generatesLateEvents: false,
    overtimeEnabled: false,
  },
  [ShiftSystemType.EXCEPTIONAL]: {
    requiresPlannerAssignment: true,
    generatesLateEvents: true,
    overtimeEnabled: true,
  },
};

@Injectable()
export class ShiftSystemsService {
  constructor(
    @InjectRepository(HrShiftSystem)
    private readonly repo: Repository<HrShiftSystem>,
  ) {}

  async list(includeInactive = false) {
    const companyId = requireCompanyId();
    const where: Record<string, unknown> = { companyId, deletedAt: IsNull() };
    if (!includeInactive) where.isActive = true;
    return this.repo.find({ where, order: { name: 'ASC' } });
  }

  async get(id: string) {
    const companyId = requireCompanyId();
    const row = await this.repo.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('Sistema de jornada no encontrado');
    return row;
  }

  async getByIdForCompany(companyId: string, id: string) {
    const row = await this.repo.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('Sistema de jornada no encontrado');
    return row;
  }

  async create(input: {
    name: string;
    type: ShiftSystemType | string;
    requiresPlannerAssignment?: boolean;
    generatesLateEvents?: boolean;
    overtimeEnabled?: boolean;
    cycleConfigJson?: { daysOn?: number; daysOff?: number } | null;
    isActive?: boolean;
  }) {
    const companyId = requireCompanyId();
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('Nombre requerido');
    const type = String(input.type ?? '').trim() as ShiftSystemType;
    if (!isShiftSystemType(type)) {
      throw new BadRequestException('Tipo de sistema de jornada inválido');
    }
    const defaults = DEFAULT_FLAGS[type];
    const code = await this.allocateNextCode(companyId);
    return this.repo.save(
      this.repo.create({
        companyId,
        code,
        name,
        type,
        requiresPlannerAssignment:
          input.requiresPlannerAssignment ?? defaults.requiresPlannerAssignment,
        generatesLateEvents:
          input.generatesLateEvents ?? defaults.generatesLateEvents,
        overtimeEnabled: input.overtimeEnabled ?? defaults.overtimeEnabled,
        cycleConfigJson:
          type === ShiftSystemType.EXCEPTIONAL
            ? input.cycleConfigJson ?? { daysOn: 4, daysOff: 4 }
            : null,
        isActive: input.isActive !== false,
      }),
    );
  }

  async update(
    id: string,
    patch: {
      name?: string;
      type?: ShiftSystemType | string;
      requiresPlannerAssignment?: boolean;
      generatesLateEvents?: boolean;
      overtimeEnabled?: boolean;
      cycleConfigJson?: { daysOn?: number; daysOff?: number } | null;
      isActive?: boolean;
    },
  ) {
    const row = await this.get(id);
    const isSeed = (SEED_SHIFT_SYSTEM_CODES as readonly string[]).includes(
      row.code,
    );
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new BadRequestException('Nombre requerido');
      row.name = name;
    }
    if (patch.type !== undefined) {
      if (isSeed) {
        throw new BadRequestException(
          'No se puede cambiar el tipo de un sistema del catálogo base',
        );
      }
      const type = String(patch.type).trim() as ShiftSystemType;
      if (!isShiftSystemType(type)) {
        throw new BadRequestException('Tipo de sistema de jornada inválido');
      }
      row.type = type;
    }
    if (patch.requiresPlannerAssignment !== undefined) {
      row.requiresPlannerAssignment = patch.requiresPlannerAssignment;
    }
    if (patch.generatesLateEvents !== undefined) {
      row.generatesLateEvents = patch.generatesLateEvents;
    }
    if (patch.overtimeEnabled !== undefined) {
      row.overtimeEnabled = patch.overtimeEnabled;
    }
    if (patch.cycleConfigJson !== undefined) {
      row.cycleConfigJson = patch.cycleConfigJson;
    }
    if (patch.isActive !== undefined) row.isActive = patch.isActive;
    return this.repo.save(row);
  }

  private async allocateNextCode(companyId: string): Promise<string> {
    const existing = await this.repo.find({
      where: { companyId },
      select: ['code'],
    });
    const code = nextPrefixedSequenceCodeFromExisting(
      HR_SHIFT_SYSTEM_CODE_PREFIX,
      existing.map((r) => r.code),
    );
    const dup = await this.repo.findOne({
      where: { companyId, code, deletedAt: IsNull() },
    });
    if (dup) {
      throw new ConflictException('Código de sistema de jornada duplicado');
    }
    return code;
  }
}
