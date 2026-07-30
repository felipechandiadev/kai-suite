import { AccountingPeriodSnapshot } from '../../domain/accounting-period-snapshot.entity';

export interface AccountingPeriodSnapshotRepositoryPort {
  save(snapshot: AccountingPeriodSnapshot): Promise<AccountingPeriodSnapshot>;
  findById(id: string): Promise<AccountingPeriodSnapshot | null>;
  findAll(): Promise<AccountingPeriodSnapshot[]>;
  findAllPaginated(
    limit: number,
    offset: number,
    periodId?: string,
    accountId?: string,
  ): Promise<{ items: AccountingPeriodSnapshot[]; total: number }>;
  update(
    id: string,
    snapshot: Partial<AccountingPeriodSnapshot>,
  ): Promise<AccountingPeriodSnapshot>;
}
