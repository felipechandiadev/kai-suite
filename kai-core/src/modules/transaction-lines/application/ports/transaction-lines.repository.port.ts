import { TransactionLine } from '../../domain/transaction-line.entity';

export abstract class TransactionLinesRepositoryPort {
  abstract findAll(): Promise<TransactionLine[]>;
  abstract findById(id: string): Promise<TransactionLine | null>;
  abstract findByTransactionId(transactionId: string): Promise<TransactionLine[]>;
}
