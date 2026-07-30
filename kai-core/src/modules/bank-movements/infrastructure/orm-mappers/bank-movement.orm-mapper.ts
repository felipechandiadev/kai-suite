/**
 * ORM to Domain Mapper for Bank Movements Module
 * Maps between ORM entities and domain entities
 */

import { BankMovement } from '../../domain/bank-movement.entity';

export class BankMovementOrmMapper {
  static toDomain(ormEntity: unknown): BankMovement | null {
    return ormEntity ? (ormEntity as BankMovement) : null;
  }

  static toOrm(domainEntity: BankMovement | null): unknown {
    return domainEntity ? ({ ...domainEntity } as Record<string, unknown>) : null;
  }
}
