/**
 * ORM to Domain Mapper for Health Module
 * Maps between ORM entities and domain entities
 */

import { HealthMetric } from '../../domain/health-metric.entity';

export class HealthOrmMapper {
  static toDomain(ormEntity: unknown): HealthMetric | null {
    return ormEntity ? (ormEntity as HealthMetric) : null;
  }

  static toOrm(domainEntity: HealthMetric | null): unknown {
    return domainEntity ? ({ ...domainEntity } as Record<string, unknown>) : null;
  }
}
