import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetAllSuppliersQuery } from '../../queries/get-all-suppliers.query';
import {
  SuppliersRepositoryPort,
  SUPPLIERS_REPOSITORY,
} from '../../ports/suppliers.repository.port';
import { Supplier } from '../../../domain/supplier.entity';

@QueryHandler(GetAllSuppliersQuery)
export class GetAllSuppliersQueryHandler implements IQueryHandler<
  GetAllSuppliersQuery,
  { data: Supplier[]; total: number }
> {
  private readonly logger = new Logger(GetAllSuppliersQueryHandler.name);

  constructor(
    @Inject(SUPPLIERS_REPOSITORY)
    private readonly repository: SuppliersRepositoryPort,
  ) {}

  async execute(
    query: GetAllSuppliersQuery,
  ): Promise<{ data: Supplier[]; total: number }> {
    this.logger.debug(
      `[${query.id}] Fetching suppliers with limit=${query.limit}, offset=${query.offset}`,
    );

    const where: any = {};
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.supplierType) where.supplierType = query.supplierType;

    const [data, total] = await Promise.all([
      this.repository.findAll({
        where,
        take: query.limit,
        skip: query.offset,
        relations: ['person'],
        order: { createdAt: 'DESC' },
      }),
      this.repository.count({ where }),
    ]);

    return { data, total };
  }
}
