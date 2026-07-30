import { BankWithdrawal } from '../../domain/bank-withdrawal.entity';

export interface BankWithdrawalRepositoryPort {
  save(withdrawal: BankWithdrawal): Promise<BankWithdrawal>;
  findById(id: string): Promise<BankWithdrawal | null>;
  findAll(): Promise<BankWithdrawal[]>;
  findAllPaginated(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ items: BankWithdrawal[]; total: number }>;
  update(
    id: string,
    withdrawal: Partial<BankWithdrawal>,
  ): Promise<BankWithdrawal>;
}
