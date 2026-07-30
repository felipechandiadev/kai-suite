import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';

export interface ShareholderRepositoryPort {
  findById(id: string): Promise<Shareholder | null>;
  createQueryBuilder(alias: string): any; // TypeORM query builder
}