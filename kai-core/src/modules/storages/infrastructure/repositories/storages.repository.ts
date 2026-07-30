import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageOrmEntity } from '@modules/storages/infrastructure/orm-mappers/storage.orm-entity';
import { StoragesRepositoryPort } from '@modules/storages/application/ports/storages.repository.port';
import {
  StorageDto,
  CreateStorageDto,
  UpdateStorageDto,
} from '@modules/storages/application/dto/storage.dto';

@Injectable()
export class StoragesRepository implements StoragesRepositoryPort {
  private readonly logger = new Logger(StoragesRepository.name);

  constructor(
    @InjectRepository(StorageOrmEntity)
    private readonly repository: Repository<StorageOrmEntity>,
  ) {}

  async findAll(options?: {
    activeOnly?: boolean;
    orderBy?: 'name' | 'code' | 'createdAt';
    limit?: number;
    offset?: number;
  }): Promise<StorageDto[]> {
    const query = this.repository
      .createQueryBuilder('storage')
      .leftJoinAndSelect('storage.branch', 'branch');

    if (options?.activeOnly) {
      query.where('storage.isActive = :isActive', { isActive: true });
    }

    const orderField = options?.orderBy || 'name';
    query.orderBy(`storage.${orderField}`, 'ASC');

    if (options?.limit) {
      query.take(options.limit);
    }
    if (options?.offset) {
      query.skip(options.offset);
    }

    const storages = await query.getMany();
    return storages.map((storage) => this.toDto(storage));
  }

  async findById(id: string): Promise<StorageDto | null> {
    const storage = await this.repository.findOne({
      where: { id },
      relations: ['branch'],
    });

    if (!storage) {
      return null;
    }

    return this.toDto(storage);
  }

  async create(data: CreateStorageDto): Promise<StorageDto> {
    const storage = this.repository.create(data);
    const saved = await this.repository.save(storage);

    this.logger.debug(`[StoragesRepository] Storage created: ${saved.id}`);
    return this.toDto(saved);
  }

  async update(id: string, data: UpdateStorageDto): Promise<StorageDto> {
    const storage = await this.repository.findOne({ where: { id } });

    if (!storage) {
      throw new NotFoundException(`Storage with id ${id} not found`);
    }

    Object.assign(storage, data);
    const updated = await this.repository.save(storage);

    this.logger.debug(`[StoragesRepository] Storage updated: ${id}`);
    return this.toDto(updated);
  }

  async delete(id: string): Promise<void> {
    const storage = await this.repository.findOne({ where: { id } });

    if (!storage) {
      throw new NotFoundException(`Storage with id ${id} not found`);
    }

    // Soft delete using isActive flag
    storage.isActive = false;
    storage.deletedAt = new Date();
    await this.repository.save(storage);

    this.logger.debug(`[StoragesRepository] Storage soft deleted: ${id}`);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { id, isActive: true },
    });
    return count > 0;
  }

  private toDto(storage: StorageOrmEntity): StorageDto {
    return {
      id: storage.id,
      branchId: storage.branchId ?? undefined,
      name: storage.name,
      code: storage.code,
      type: storage.type,
      category: storage.category,
      capacity: storage.capacity,
      address: storage.address ?? null,
      location: storage.location ?? null,
      isDefault: storage.isDefault,
      isActive: storage.isActive,
      createdAt: storage.createdAt,
      updatedAt: storage.updatedAt,
      deletedAt: storage.deletedAt,
      branch: (storage as any).branch
        ? {
            id: (storage as any).branch.id,
            name: (storage as any).branch.name,
          }
        : undefined,
    };
  }
}
