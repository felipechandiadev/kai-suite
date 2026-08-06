import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthRepositoryPort } from '@modules/auth/application/ports/auth.repository.port';
import { User } from '@modules/users/domain/user.entity';

@Injectable()
export class TypeOrmAuthRepository implements AuthRepositoryPort {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findUserByUsername(userName: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { userName, deletedAt: null as never },
      relations: ['person'],
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, deletedAt: null as never },
    });
  }

  async saveUser(user: User): Promise<User> {
    return this.userRepository.save(user);
  }
}