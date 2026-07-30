import { Storage } from '@modules/storages/domain/storage.entity';
import {
  StorageDto,
  CreateStorageDto,
  UpdateStorageDto,
} from '../dto/storage.dto';

export const STORAGES_REPOSITORY = 'STORAGES_REPOSITORY';

export interface StoragesRepositoryPort {
  /**
   * Find all storages with optional filtering
   */
  findAll(options?: {
    activeOnly?: boolean;
    orderBy?: 'name' | 'code' | 'createdAt';
    limit?: number;
    offset?: number;
  }): Promise<StorageDto[]>;

  /**
   * Find storage by ID
   */
  findById(id: string): Promise<StorageDto | null>;

  /**
   * Create a new storage
   */
  create(data: CreateStorageDto): Promise<StorageDto>;

  /**
   * Update an existing storage
   */
  update(id: string, data: UpdateStorageDto): Promise<StorageDto>;

  /**
   * Delete (soft delete) a storage
   */
  delete(id: string): Promise<void>;

  /**
   * Check if storage exists by ID
   */
  exists(id: string): Promise<boolean>;
}
