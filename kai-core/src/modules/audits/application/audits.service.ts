import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Audit } from '../domain/audit.entity';
import { SearchAuditsDto } from './dto/search-audits.dto';

@Injectable()
export class AuditsService {
  constructor(
    @InjectRepository(Audit)
    private readonly auditRepository: Repository<Audit>,
  ) {}

  async search(dto: SearchAuditsDto) {
    const page = Math.max(Number(dto.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(dto.limit ?? 25), 1), 200);

    const qb = this.auditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .leftJoinAndSelect('user.person', 'person');

    if (dto.entityName) {
      qb.andWhere('audit.entityName = :entityName', {
        entityName: dto.entityName,
      });
    }
    if (dto.entityId) {
      qb.andWhere('audit.entityId = :entityId', { entityId: dto.entityId });
    }
    if (dto.userId) {
      qb.andWhere('audit.userId = :userId', { userId: dto.userId });
    }
    if (dto.action) {
      qb.andWhere('audit.action = :action', { action: dto.action });
    }
    if (dto.dateFrom) {
      const parsed = new Date(dto.dateFrom);
      if (!Number.isNaN(parsed.getTime())) {
        qb.andWhere('audit.timestamp >= :dateFrom', { dateFrom: parsed });
      }
    }
    if (dto.dateTo) {
      const parsed = new Date(dto.dateTo);
      if (!Number.isNaN(parsed.getTime())) {
        qb.andWhere('audit.timestamp <= :dateTo', { dateTo: parsed });
      }
    }

    qb.orderBy('audit.timestamp', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      success: true,
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const audit = await this.auditRepository.findOne({
      where: { id },
      relations: ['user', 'user.person'],
    });

    return {
      success: true,
      data: audit,
    };
  }
}
