/**
 * ORM to Domain Mapper for Cash Deposits Module
 * Maps between ORM entities and domain entities
 */

import { CashDeposit } from '../../domain/cash-deposit.entity';

export class CashDepositOrmMapper {
  static toDomain(ormEntity: unknown): CashDeposit | null {
    return ormEntity ? (ormEntity as CashDeposit) : null;
  }

  static toOrm(domainEntity: CashDeposit | null): unknown {
    return domainEntity ? ({ ...domainEntity } as Record<string, unknown>) : null;
  }
}
