import { HealthMetric } from '../../domain/health-metric.entity';

export interface HealthMetricRepositoryPort {
  save(metric: HealthMetric): Promise<HealthMetric>;
  findById(id: string): Promise<HealthMetric | null>;
  findAll(): Promise<HealthMetric[]>;
  findAllPaginated(
    limit: number,
    offset: number,
    service?: string,
  ): Promise<{ items: HealthMetric[]; total: number }>;
  update(id: string, metric: Partial<HealthMetric>): Promise<HealthMetric>;
}
