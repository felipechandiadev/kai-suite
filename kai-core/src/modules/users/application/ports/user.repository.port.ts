import { User } from '../../domain/user.entity';

export interface UserRepositoryPort {
  save(user: User): Promise<User>;
  findById(userId: string): Promise<User | null>;
  findByUsername(userName: string): Promise<User | null>;
  findAll(params: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: User[]; total: number }>;
  delete(userId: string): Promise<void>;
}
