import { BankTransfer } from '../../domain/bank-transfer.entity';

export interface BankTransferRepositoryPort {
  save(transfer: BankTransfer): Promise<BankTransfer>;
  findById(id: string): Promise<BankTransfer | null>;
  findAll(): Promise<BankTransfer[]>;
  findAllPaginated(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ items: BankTransfer[]; total: number }>;
  update(id: string, transfer: Partial<BankTransfer>): Promise<BankTransfer>;
}
