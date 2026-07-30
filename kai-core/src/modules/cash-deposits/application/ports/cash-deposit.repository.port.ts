import { CashDeposit } from '../../domain/cash-deposit.entity';

export interface CashDepositRepositoryPort {
  save(deposit: CashDeposit): Promise<CashDeposit>;
  findById(id: string): Promise<CashDeposit | null>;
  findAll(): Promise<CashDeposit[]>;
  findAllPaginated(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ items: CashDeposit[]; total: number }>;
  update(id: string, deposit: Partial<CashDeposit>): Promise<CashDeposit>;
}
