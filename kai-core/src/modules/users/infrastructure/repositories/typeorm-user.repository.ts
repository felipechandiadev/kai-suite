import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepositoryPort } from '../../application/ports/user.repository.port';
import { User } from '../../domain/user.entity';

@Injectable()
export class TypeOrmUserRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['person'],
    });
  }

  async findByUsername(userName: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { userName, deletedAt: null as any },
      relations: ['person'],
    });
  }

  async findAll(params: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: User[]; total: number }> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.person', 'person');

    if (params.search && params.search.trim().length > 0) {
      const q = `%${params.search.trim().toLowerCase()}%`;
      query.andWhere(
        `(
          LOWER(user.userName) LIKE :q OR
          LOWER(user.mail) LIKE :q OR
          LOWER(person.firstName) LIKE :q OR
          LOWER(person.lastName) LIKE :q OR
          LOWER(person.businessName) LIKE :q OR
          LOWER(person.documentNumber) LIKE :q
        )`,
        { q },
      );
    }

    const [data, total] = await query
      .orderBy('user.userName', 'ASC')
      .take(params.limit ?? 50)
      .skip(params.offset ?? 0)
      .getManyAndCount();

    return { data, total };
  }

  async delete(userId: string): Promise<void> {
    await this.userRepository.softDelete(userId);
  }
}
