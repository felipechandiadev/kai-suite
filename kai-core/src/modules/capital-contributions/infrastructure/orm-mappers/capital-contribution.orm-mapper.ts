/**
 * ORM to Domain Mapper for Capital Contributions Module
 * Maps between ORM entities and domain entities
 */

import { CapitalContribution } from '../../domain/capital-contribution.entity';

export class CapitalContributionOrmMapper {
  static toDomain(ormEntity: unknown): CapitalContribution | null {
    return ormEntity ? (ormEntity as CapitalContribution) : null;
  }

  static toOrm(domainEntity: CapitalContribution | null): unknown {
    return domainEntity ? ({ ...domainEntity } as Record<string, unknown>) : null;
  }
}
