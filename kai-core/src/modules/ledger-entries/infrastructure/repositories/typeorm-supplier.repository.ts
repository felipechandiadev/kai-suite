import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierRepositoryPort } from '../../application/ports/supplier.repository.port';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';

@Injectable()
export class TypeOrmSupplierRepository implements SupplierRepositoryPort {
  constructor(
    @InjectRepository(Supplier)
    private readonly repository: Repository<Supplier>,
  ) {}

  async findById(id: string): Promise<Supplier | null> {
    return await this.repository.findOne({ where: { id } }) ?? null;
  }

  createQueryBuilder(alias: string): any {
    return this.repository.createQueryBuilder(alias);
  }
}