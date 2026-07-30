import { Supplier } from '../../domain/supplier.entity';

export const SUPPLIERS_REPOSITORY = 'SuppliersRepositoryPort';

export interface SuppliersRepositoryPort {
  findAll(options?: any): Promise<Supplier[]>;
  findOne(id: string): Promise<Supplier | null>;
  create(data: Partial<Supplier> | any): Promise<Supplier>;
  update(id: string, data: Partial<Supplier> | any): Promise<Supplier>;
  remove(id: string): Promise<void>;
  count(options?: any): Promise<number>;
}
