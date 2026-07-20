import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { HrAfpFund } from '../domain/hr-afp-fund.entity';
import {
  HR_AFP_FUND_CODE_PREFIX,
  nextPrefixedSequenceCodeFromExisting,
} from '@shared/codes/prefixed-sequence-code.util';

function requireCompanyId(): string {
  const companyId = TenantContext.getCompanyId();
  if (!companyId) throw new BadRequestException('Company context required');
  return companyId;
}

function normalizePercent(raw: string | undefined | null): string {
  const v = String(raw ?? '').trim().replace(',', '.');
  if (!v) throw new BadRequestException('Indique el porcentaje de cotización');
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new BadRequestException('Porcentaje inválido (0–100)');
  }
  return n.toFixed(2);
}

@Injectable()
export class AfpFundsService {
  constructor(
    @InjectRepository(HrAfpFund)
    private readonly repo: Repository<HrAfpFund>,
  ) {}

  async list(includeInactive = false) {
    const companyId = requireCompanyId();
    const where: Record<string, unknown> = { companyId, deletedAt: IsNull() };
    if (!includeInactive) where.isActive = true;
    return this.repo.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async get(id: string) {
    const companyId = requireCompanyId();
    const row = await this.repo.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('AFP no encontrada');
    return row;
  }

  async create(input: {
    name: string;
    contributionPercent: string;
    isActive?: boolean;
  }) {
    const companyId = requireCompanyId();
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('Nombre de AFP requerido');
    const contributionPercent = normalizePercent(input.contributionPercent);
    const code = await this.allocateNextCode(companyId);
    return this.repo.save(
      this.repo.create({
        companyId,
        code,
        name,
        contributionPercent,
        isActive: input.isActive !== false,
      }),
    );
  }

  async update(
    id: string,
    patch: {
      name?: string;
      contributionPercent?: string;
      isActive?: boolean;
    },
  ) {
    const row = await this.get(id);
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new BadRequestException('Nombre de AFP requerido');
      row.name = name;
    }
    if (patch.contributionPercent !== undefined) {
      row.contributionPercent = normalizePercent(patch.contributionPercent);
    }
    if (patch.isActive !== undefined) row.isActive = patch.isActive;
    return this.repo.save(row);
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
        HR_AFP_FUND_CODE_PREFIX,
        rows.map((r) => r.code),
      );
      const taken = await this.repo.exist({
        where: { companyId, code: candidate },
      });
      if (!taken) return candidate;
    }
    throw new ConflictException(
      'No se pudo generar un código único para la AFP. Intente de nuevo.',
    );
  }
}
