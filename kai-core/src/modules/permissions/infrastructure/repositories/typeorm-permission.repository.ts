import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionRepositoryPort } from '../../application/ports/permission.repository.port';
import { Permission } from '../../domain/permission.entity';
import { PermissionOrmEntity } from '../orm-entities/permission.orm-entity';
import { PermissionOrmMapper } from '../orm-mappers/permission.orm-mapper';

@Injectable()
export class TypeOrmPermissionRepository implements PermissionRepositoryPort {
  constructor(
    @InjectRepository(PermissionOrmEntity)
    private readonly permissionRepository: Repository<PermissionOrmEntity>,
  ) {}

  async save(permission: Permission): Promise<void> {
    const ormEntity = PermissionOrmMapper.toOrmEntity(permission);
    await this.permissionRepository.save(ormEntity);
  }

  async findById(id: string): Promise<Permission | null> {
    const ormEntity = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!ormEntity) {
      return null;
    }

    return PermissionOrmMapper.toDomainEntity(ormEntity);
  }

  async findAll(
    userId?: string,
    ability?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<[Permission[], number]> {
    const queryBuilder =
      this.permissionRepository.createQueryBuilder('permission');

    if (userId) {
      queryBuilder.andWhere('permission.userId = :userId', { userId });
    }

    if (ability) {
      queryBuilder.andWhere('permission.ability = :ability', { ability });
    }

    queryBuilder
      .orderBy('permission.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [ormEntities, total] = await queryBuilder.getManyAndCount();

    const domainEntities = ormEntities.map((ormEntity) =>
      PermissionOrmMapper.toDomainEntity(ormEntity),
    );

    return [domainEntities, total];
  }

  async delete(id: string): Promise<void> {
    await this.permissionRepository.delete(id);
  }
}
