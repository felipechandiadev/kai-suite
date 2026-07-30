/**
 * ORM to Domain Mapper for Bank Transfers Module
 * Maps between ORM entities and domain entities
 */

import { BankTransfer } from '../../domain/bank-transfer.entity';

export class BankTransferOrmMapper {
  static toDomain(ormEntity: unknown): BankTransfer | null {
    return ormEntity ? (ormEntity as BankTransfer) : null;
  }

  static toOrm(domainEntity: BankTransfer | null): unknown {
    return domainEntity ? ({ ...domainEntity } as Record<string, unknown>) : null;
  }
}
