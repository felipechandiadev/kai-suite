import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { HrIsapre } from '../domain/hr-isapre.entity';

function requireCompanyId(): string {
  const companyId = TenantContext.getCompanyId();
  if (!companyId) throw new BadRequestException('Company context required');
  return companyId;
}

@Injectable()
export class IsapresService {
  constructor(
    @InjectRepository(HrIsapre)
    private readonly repo: Repository<HrIsapre>,
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
    if (!row) throw new NotFoundException('Isapre no encontrada');
    return row;
  }
}
