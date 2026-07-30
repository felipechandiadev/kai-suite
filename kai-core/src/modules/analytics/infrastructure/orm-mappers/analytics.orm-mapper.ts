/**
 * ORM to Domain Mapper for Analytics Module
 * Maps between ORM entities and domain entities
 */

export class AnalyticsOrmMapper {
  static toDomainDashboardStats(ormEntity: unknown): Record<string, unknown> | null {
    return ormEntity ? ({ ...(ormEntity as Record<string, unknown>) }) : null;
  }

  static toOrmDashboardStats(domainEntity: Record<string, unknown> | null): unknown {
    return domainEntity ? ({ ...domainEntity }) : null;
  }
}
