import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Remuneration } from '../../domain/remuneration.entity';

@Injectable()
export class TypeOrmRemunerationRepository {
  constructor(
    @InjectRepository(Remuneration)
    private readonly repository: Repository<Remuneration>,
  ) {}

  async save(remuneration: Remuneration): Promise<Remuneration> {
    return this.repository.save(remuneration);
  }

  async findById(id: string): Promise<Remuneration | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<Remuneration[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ items: Remuneration[]; total: number }> {
    const query = this.repository.createQueryBuilder('remuneration');

    if (status) {
      query.where('remuneration.status = :status', { status });
    }

    const [items, total] = await query
      .orderBy('remuneration.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { items, total };
  }

  async update(
    id: string,
    remuneration: Partial<Remuneration>,
  ): Promise<Remuneration> {
    const entity = await this.repository.findOneOrFail({
      where: { id },
    });
    Object.assign(entity, remuneration);
    return this.repository.save(entity);
  }
}
