import 'reflect-metadata';
import { PersonBankAccount } from '@modules/persons/domain/person.entity';
export type CompanyBankAccount = PersonBankAccount;
export declare class Company {
  id: string;
  name: string;
  defaultCurrency: string;
  fiscalYearStart?: Date;
  isActive: boolean;
  settings?: Record<string, any>;
  bankAccounts?: CompanyBankAccount[] | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
