import { Permission } from '../../domain/permission.entity';
import { PermissionOrmEntity } from '../orm-entities/permission.orm-entity';

export class PermissionOrmMapper {
  static toOrmEntity(domainEntity: Permission): PermissionOrmEntity {
    const ormEntity = new PermissionOrmEntity();
    ormEntity.id = domainEntity.id;
    ormEntity.ability = domainEntity.ability;
    ormEntity.userId = domainEntity.userId || null;
    ormEntity.description = domainEntity.description || null;
    ormEntity.createdAt = domainEntity.createdAt;
    ormEntity.updatedAt = domainEntity.updatedAt;
    return ormEntity;
  }

  static toDomainEntity(ormEntity: PermissionOrmEntity): Permission {
    return new Permission(
      ormEntity.id,
      ormEntity.ability,
      ormEntity.userId || undefined,
      ormEntity.description || undefined,
      ormEntity.createdAt,
      ormEntity.updatedAt,
    );
  }
}
