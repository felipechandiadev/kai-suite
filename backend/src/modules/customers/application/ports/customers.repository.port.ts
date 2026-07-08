import { Customer } from '@modules/customers/domain/customer.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { Person } from '@modules/persons/domain/person.entity';

export interface CustomersRepositoryPort {
  save(customer: Customer | any): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findByIdWithPerson(id: string): Promise<Customer | null>;
  findAll(filter?: Record<string, any>): Promise<Customer[]>;
  findAllWithPagination(
    filter?: Record<string, any>,
    page?: number,
    pageSize?: number,
  ): Promise<{ customers: Customer[]; total: number }>;
  findOfflineSnapshotPage(
    cursor: string | null,
    limit: number,
  ): Promise<Customer[]>;
  findByPersonId(personId: string): Promise<Customer | null>;
  findByDocumentNumber(documentNumber: string): Promise<Customer | null>;
  update(id: string, updateData: Partial<Customer>): Promise<Customer>;
  softDelete(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  getTransactions(customerId: string): Promise<Transaction[]>;
  getPendingPayments(customerId: string): Promise<Transaction[]>;
  getPurchases(customerId: string, status?: string): Promise<Transaction[]>;
  getPaymentIns(customerId: string): Promise<Transaction[]>;
  calculateAvailableCredit(customerId: string): Promise<{
    creditLimit: number;
    usedCredit: number;
    availableCredit: number;
  }>;
}

export const CUSTOMERS_REPOSITORY = 'CUSTOMERS_REPOSITORY';
