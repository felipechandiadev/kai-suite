import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Supplier } from '../domain/supplier.entity';

@Injectable()
export class SuppliersRepository {
  constructor(
    @InjectRepository(Supplier)
    private readonly repository: Repository<Supplier>,
  ) {}

  async findAll(options?: FindManyOptions<Supplier>): Promise<Supplier[]> {
    return this.repository.find(options);
  }

  async findOne(id: string): Promise<Supplier | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['person'],
    });
  }

  async create(data: Partial<Supplier>): Promise<Supplier> {
    const supplier = this.repository.create(data);
    return this.repository.save(supplier);
  }

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    await this.repository.update(id, data as any);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new Error(`Supplier ${id} not found after update`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async count(options?: FindManyOptions<Supplier>): Promise<number> {
    return this.repository.count(options);
  }
}
