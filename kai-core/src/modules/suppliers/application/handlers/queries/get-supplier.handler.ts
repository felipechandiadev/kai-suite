import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { GetSupplierQuery } from '../../queries/get-supplier.query';
import {
  SuppliersRepositoryPort,
  SUPPLIERS_REPOSITORY,
} from '../../ports/suppliers.repository.port';
import { Supplier } from '../../../domain/supplier.entity';

@QueryHandler(GetSupplierQuery)
export class GetSupplierQueryHandler implements IQueryHandler<
  GetSupplierQuery,
  Supplier
> {
  private readonly logger = new Logger(GetSupplierQueryHandler.name);

  constructor(
    @Inject(SUPPLIERS_REPOSITORY)
    private readonly repository: SuppliersRepositoryPort,
  ) {}

  async execute(query: GetSupplierQuery): Promise<Supplier> {
    this.logger.debug(`[${query.id}] Fetching supplier ${query.supplierId}`);

    const supplier = await this.repository.findOne(query.supplierId);
    if (!supplier) {
      throw new NotFoundException(`Supplier ${query.supplierId} not found`);
    }

    return supplier;
  }
}
