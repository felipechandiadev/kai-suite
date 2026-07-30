import { BankAccount } from '../../domain/bank-account.entity';
import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';

export abstract class BankAccountsRepositoryPort {
  abstract getCashBalance(): Promise<{ balance: number }>;
  abstract findAll(): Promise<BankAccount[]>;
  abstract findById(accountKey: string): Promise<BankAccount | null>;
  abstract create(data: CreateBankAccountDto): Promise<BankAccount>;
  abstract update(accountKey: string, data: UpdateBankAccountDto): Promise<BankAccount>;
  abstract remove(accountKey: string): Promise<void>;
}
