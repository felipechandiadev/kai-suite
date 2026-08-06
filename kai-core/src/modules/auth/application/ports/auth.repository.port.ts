import { User } from '@modules/users/domain/user.entity';

export const AUTH_REPOSITORY = 'AuthRepositoryPort';

export interface AuthRepositoryPort {
  findUserByUsername(userName: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  saveUser(user: User): Promise<User>;
}