import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShareholderRepositoryPort } from '../../application/ports/shareholder.repository.port';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';

@Injectable()
export class TypeOrmShareholderRepository implements ShareholderRepositoryPort {
  constructor(
    @InjectRepository(Shareholder)
    private readonly repository: Repository<Shareholder>,
  ) {}

  async findById(id: string): Promise<Shareholder | null> {
    return await this.repository.findOne({ where: { id } }) ?? null;
  }

  createQueryBuilder(alias: string): any {
    return this.repository.createQueryBuilder(alias);
  }
}