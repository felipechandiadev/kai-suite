/**
 * ORM to Domain Mapper for Bank Withdrawals Module
 * Maps between ORM entities and domain entities
 */

import { BankWithdrawal } from '../../domain/bank-withdrawal.entity';

export class BankWithdrawalOrmMapper {
  static toDomain(ormEntity: unknown): BankWithdrawal | null {
    return ormEntity ? (ormEntity as BankWithdrawal) : null;
  }

  static toOrm(domainEntity: BankWithdrawal | null): unknown {
    return domainEntity ? ({ ...domainEntity } as Record<string, unknown>) : null;
  }
}
