import { Customer } from '@modules/customers/domain/customer.entity';

export interface CustomerRepositoryPort {
  findById(id: string): Promise<Customer | null>;
  createQueryBuilder(alias: string): any; // TypeORM query builder
}