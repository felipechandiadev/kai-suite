import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceList } from '../../domain/price-list.entity';
import { PriceListRepositoryPort } from '../../application/ports/price-list.repository.port';

@Injectable()
export class TypeOrmPriceListRepository implements PriceListRepositoryPort {
  constructor(
    @InjectRepository(PriceList)
    private readonly repository: Repository<PriceList>,
  ) {}

  async save(priceList: PriceList): Promise<PriceList> {
    return this.repository.save(priceList);
  }

  async findById(id: string): Promise<PriceList | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAll(includeInactive: boolean = false): Promise<PriceList[]> {
    const query = this.repository.createQueryBuilder('priceList');

    if (!includeInactive) {
      query.where('priceList.isActive = :isActive', { isActive: true });
    }

    return query
      .orderBy('priceList.priority', 'ASC')
      .addOrderBy('priceList.name', 'ASC')
      .getMany();
  }

  async update(id: string, priceList: Partial<PriceList>): Promise<PriceList> {
    await this.repository.update(id, priceList);
    const updatedPriceList = await this.findById(id);
    if (!updatedPriceList) {
      throw new Error(`PriceList with id ${id} not found after update`);
    }
    return updatedPriceList;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}