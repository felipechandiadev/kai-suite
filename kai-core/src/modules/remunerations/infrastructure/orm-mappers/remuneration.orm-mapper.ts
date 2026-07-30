/**
 * ORM to Domain Mapper for Remunerations Module
 * Maps between ORM entities and domain entities
 */

import { Remuneration } from '../../domain/remuneration.entity';

export class RemunerationOrmMapper {
  static toDomain(ormEntity: unknown): Remuneration | null {
    return ormEntity ? (ormEntity as Remuneration) : null;
  }

  static toOrm(domainEntity: Remuneration | null): unknown {
    return domainEntity ? ({ ...domainEntity } as Record<string, unknown>) : null;
  }
}
