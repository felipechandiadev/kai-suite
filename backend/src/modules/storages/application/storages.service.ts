import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantContext } from '@common/tenant';
import { DeepPartial, Repository } from 'typeorm';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '../domain/storage.entity';

@Injectable()
export class StoragesService {
  constructor(
    @InjectRepository(Storage)
    private readonly storageRepository: Repository<Storage>,
  ) {}

  async getAllStorages(includeInactive: boolean) {
    const query = this.storageRepository
      .createQueryBuilder('storage')
      .leftJoinAndSelect('storage.branch', 'branch');

    if (!includeInactive) {
      query.where('storage.isActive = :isActive', { isActive: true });
    }

    const storages = await query.orderBy('storage.name', 'ASC').getMany();

    return storages.map((storage) => this.mapStorage(storage));
  }

  async getStorageById(id: string) {
    const storage = await this.storageRepository.findOne({
      where: { id },
      relations: ['branch'],
    });

    if (!storage) {
      return null;
    }

    return this.mapStorage(storage);
  }

  async createStorage(data: {
    name: string;
    code?: string | null;
    category?: StorageCategory | string;
    type?: StorageType | string;
    branchId?: string | null;
    capacity?: number | null;
    address?: string | null;
    location?: { lat: number; lng: number } | null;
    isDefault?: boolean;
    isActive?: boolean;
  }) {
    const companyId = TenantContext.getCompanyId();
    const wantDefault = !!data.isDefault;

    const saved = await this.storageRepository.manager.transaction(async (em) => {
      if (wantDefault && companyId) {
        await em.update(Storage, { companyId }, { isDefault: false });
      }

      const storage = em.create(Storage, {
        name: data.name,
        code: data.code ?? undefined,
        category: (data.category ?? StorageCategory.IN_BRANCH) as StorageCategory,
        type: (data.type ?? StorageType.WAREHOUSE) as StorageType,
        branchId: data.branchId ?? null,
        capacity: data.capacity ?? null,
        address: data.address ?? null,
        location: data.location ?? null,
        isDefault: wantDefault,
        isActive: data.isActive !== false,
      } as DeepPartial<Storage>);

      return em.save(storage);
    });

    const created = await this.getStorageById(saved.id);

    return { success: true, storage: created };
  }

  async updateStorage(
    id: string,
    data: Partial<{
      name: string;
      code: string | null;
      category: StorageCategory | string;
      type: StorageType | string;
      branchId: string | null;
      capacity: number | null;
      address: string | null;
      location: { lat: number; lng: number } | null;
      isDefault: boolean;
      isActive: boolean;
    }>,
  ) {
    const existing = await this.storageRepository.findOne({ where: { id } });

    if (!existing) {
      return { success: false, message: 'Storage not found', statusCode: 404 };
    }

    const patch: Record<string, unknown> = { ...data };

    if (patch.category) {
      patch.category = patch.category as StorageCategory;
    }
    if (patch.type) {
      patch.type = patch.type as StorageType;
    }

    await this.storageRepository.manager.transaction(async (em) => {
      const merged = em.merge(Storage, existing, patch as DeepPartial<Storage>);
      if (merged.isDefault && merged.companyId) {
        await em.update(Storage, { companyId: merged.companyId }, { isDefault: false });
      }
      await em.save(merged);
    });

    const updated = await this.getStorageById(id);
    if (!updated) {
      return { success: false, message: 'Storage not found', statusCode: 404 };
    }

    return { success: true, storage: updated };
  }

  async deleteStorage(id: string) {
    const result = await this.storageRepository.softDelete(id);

    if (!result.affected) {
      return { success: false, message: 'Storage not found', statusCode: 404 };
    }

    return { success: true };
  }

  private mapStorage(storage: Storage) {
    return {
      id: storage.id,
      name: storage.name,
      code: storage.code ?? null,
      category: storage.category,
      type: storage.type,
      branchId: storage.branchId ?? null,
      branch: storage.branch
        ? {
            id: storage.branch.id,
            name: storage.branch.name,
          }
        : null,
      address: storage.address ?? null,
      location: storage.location ?? null,
      capacity: storage.capacity ?? null,
      isDefault: storage.isDefault,
      isActive: storage.isActive,
      productionUnitId: storage.productionUnitId ?? null,
      createdAt: storage.createdAt,
      updatedAt: storage.updatedAt,
    };
  }
}
