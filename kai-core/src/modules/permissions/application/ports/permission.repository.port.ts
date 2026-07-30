import { Permission } from '../../domain/permission.entity';

export interface PermissionRepositoryPort {
  save(permission: Permission): Promise<void>;
  findById(id: string): Promise<Permission | null>;
  findAll(
    userId?: string,
    ability?: string,
    limit?: number,
    offset?: number,
  ): Promise<[Permission[], number]>;
  delete(id: string): Promise<void>;
}
