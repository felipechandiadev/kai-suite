import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CapitalContribution } from '../../domain/capital-contribution.entity';

@Injectable()
export class TypeOrmCapitalContributionRepository {
  constructor(
    @InjectRepository(CapitalContribution)
    private readonly repository: Repository<CapitalContribution>,
  ) {}

  async save(contribution: CapitalContribution): Promise<CapitalContribution> {
    return this.repository.save(contribution);
  }

  async findById(id: string): Promise<CapitalContribution | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<CapitalContribution[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ items: CapitalContribution[]; total: number }> {
    const query = this.repository.createQueryBuilder('contribution');

    if (status) {
      query.where('contribution.status = :status', { status });
    }

    const [items, total] = await query
      .orderBy('contribution.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { items, total };
  }

  async update(
    id: string,
    contribution: Partial<CapitalContribution>,
  ): Promise<CapitalContribution> {
    const entity = await this.repository.findOneOrFail({
      where: { id },
    });
    Object.assign(entity, contribution);
    return this.repository.save(entity);
  }
}
