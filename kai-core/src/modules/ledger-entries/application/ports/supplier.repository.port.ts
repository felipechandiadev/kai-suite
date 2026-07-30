import { Supplier } from '@modules/suppliers/domain/supplier.entity';

export interface SupplierRepositoryPort {
  findById(id: string): Promise<Supplier | null>;
  createQueryBuilder(alias: string): any; // TypeORM query builder
}