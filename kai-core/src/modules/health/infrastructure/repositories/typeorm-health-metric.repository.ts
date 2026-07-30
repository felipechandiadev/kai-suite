import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthMetric } from '../../domain/health-metric.entity';

@Injectable()
export class TypeOrmHealthMetricRepository {
  constructor(
    @InjectRepository(HealthMetric)
    private readonly repository: Repository<HealthMetric>,
  ) {}

  async save(metric: HealthMetric): Promise<HealthMetric> {
    return this.repository.save(metric);
  }

  async findById(id: string): Promise<HealthMetric | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<HealthMetric[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    limit: number,
    offset: number,
    service?: string,
  ): Promise<{ items: HealthMetric[]; total: number }> {
    const query = this.repository.createQueryBuilder('metric');

    if (service) {
      query.where('metric.service = :service', { service });
    }

    const [items, total] = await query
      .orderBy('metric.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { items, total };
  }

  async update(
    id: string,
    metric: Partial<HealthMetric>,
  ): Promise<HealthMetric> {
    await this.repository.update(id, metric);
    return this.repository.findOneOrFail({
      where: { id },
    });
  }
}
