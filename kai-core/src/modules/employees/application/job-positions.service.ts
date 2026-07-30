import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { HrJobPosition } from '../domain/hr-job-position.entity';
import {
  HR_JOB_POSITION_CODE_PREFIX,
  nextPrefixedSequenceCodeFromExisting,
} from '@shared/codes/prefixed-sequence-code.util';

function requireCompanyId(): string {
  const companyId = TenantContext.getCompanyId();
  if (!companyId) throw new BadRequestException('Company context required');
  return companyId;
}

@Injectable()
export class JobPositionsService {
  constructor(
    @InjectRepository(HrJobPosition)
    private readonly repo: Repository<HrJobPosition>,
  ) {}

  async list(includeInactive = false) {
    const companyId = requireCompanyId();
    const where: Record<string, unknown> = { companyId, deletedAt: IsNull() };
    if (!includeInactive) where.isActive = true;
    return this.repo.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async get(id: string) {
    const companyId = requireCompanyId();
    const row = await this.repo.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('Cargo no encontrado');
    return row;
  }

  async create(input: {
    name: string;
    description?: string | null;
    defaultDuties?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const companyId = requireCompanyId();
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('Nombre del cargo requerido');
    const code = await this.allocateNextCode(companyId);
    return this.repo.save(
      this.repo.create({
        companyId,
        name,
        code,
        description: input.description?.trim() || null,
        defaultDuties: input.defaultDuties?.trim() || null,
        isActive: input.isActive !== false,
        sortOrder: input.sortOrder ?? 0,
      }),
    );
  }

  async update(
    id: string,
    patch: {
      name?: string;
      description?: string | null;
      defaultDuties?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    const row = await this.get(id);
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new BadRequestException('Nombre del cargo requerido');
      row.name = name;
    }
    if (patch.description !== undefined)
      row.description = patch.description?.trim() || null;
    if (patch.defaultDuties !== undefined)
      row.defaultDuties = patch.defaultDuties?.trim() || null;
    if (patch.isActive !== undefined) row.isActive = patch.isActive;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    return this.repo.save(row);
  }

  async deactivate(id: string) {
    return this.update(id, { isActive: false });
  }

  private async allocateNextCode(companyId: string): Promise<string> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const rows = await this.repo.find({
        where: { companyId },
        select: ['code'],
        withDeleted: true,
      });
      const candidate = nextPrefixedSequenceCodeFromExisting(
        HR_JOB_POSITION_CODE_PREFIX,
        rows.map((r) => r.code),
      );
      const taken = await this.repo.exist({
        where: { companyId, code: candidate },
      });
      if (!taken) return candidate;
    }
    throw new ConflictException(
      'No se pudo generar un código único para el cargo. Intente de nuevo.',
    );
  }
}
