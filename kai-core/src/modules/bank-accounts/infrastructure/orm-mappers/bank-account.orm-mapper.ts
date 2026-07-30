/**
 * ORM to Domain Mapper for Bank Accounts Module
 * Maps between ORM entities and domain entities
 */

import { BankAccount } from '../../domain/bank-account.entity';

export class BankAccountOrmMapper {
  static toDomain(ormEntity: unknown): BankAccount | null {
    return ormEntity ? (ormEntity as BankAccount) : null;
  }

  static toOrm(domainEntity: BankAccount | null): unknown {
    return domainEntity ? ({ ...domainEntity } as Record<string, unknown>) : null;
  }
}
