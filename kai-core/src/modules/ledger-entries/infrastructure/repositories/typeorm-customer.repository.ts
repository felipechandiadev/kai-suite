import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerRepositoryPort } from '../../application/ports/customer.repository.port';
import { Customer } from '@modules/customers/domain/customer.entity';

@Injectable()
export class TypeOrmCustomerRepository implements CustomerRepositoryPort {
  constructor(
    @InjectRepository(Customer)
    private readonly repository: Repository<Customer>,
  ) {}

  async findById(id: string): Promise<Customer | null> {
    return await this.repository.findOne({ where: { id } }) ?? null;
  }

  createQueryBuilder(alias: string): any {
    return this.repository.createQueryBuilder(alias);
  }
}