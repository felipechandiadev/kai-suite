import { Injectable, Inject } from '@nestjs/common';
import { PriceList, PriceListType } from '../domain/price-list.entity';
import { PriceListRepositoryPort } from './ports/price-list.repository.port';

@Injectable()
export class PriceListsService {
  constructor(
    @Inject('PriceListRepositoryPort')
    private readonly priceListRepository: PriceListRepositoryPort,
  ) {}

  async getAllPriceLists(includeInactive: boolean) {
    const priceLists = await this.priceListRepository.findAll(includeInactive);
    return priceLists.map((priceList) => this.mapPriceList(priceList));
  }

  async getPriceListById(id: string) {
    const priceList = await this.priceListRepository.findById(id);
    if (!priceList) {
      return null;
    }
    return this.mapPriceList(priceList);
  }

  async createPriceList(data: {
    name: string;
    priceListType: PriceListType | string;
    currency?: string;
    validFrom?: Date | string;
    validUntil?: Date | string;
    priority?: number;
    isDefault?: boolean;
    isActive?: boolean;
    description?: string | null;
  }) {
    // No asignar `id: ''` — eso provoca uuid inválido en PostgreSQL. El PK lo genera la BD.
    const priceList = {
      name: data.name.trim(),
      priceListType: data.priceListType as PriceListType,
      currency: data.currency ?? 'CLP',
      validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      priority: data.priority ?? 0,
      isDefault: !!data.isDefault,
      isActive: data.isActive !== false,
      description: data.description ?? undefined,
    } as PriceList;

    const saved = await this.priceListRepository.save(priceList);
    const created = await this.getPriceListById(saved.id);

    return { success: true, priceList: created };
  }

  async updatePriceList(
    id: string,
    data: Partial<{
      name: string;
      priceListType: PriceListType | string;
      currency: string;
      validFrom?: Date | string | null;
      validUntil?: Date | string | null;
      priority: number;
      isDefault: boolean;
      isActive: boolean;
      description: string | null;
    }>,
  ) {
    const updateData: Partial<PriceList> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.priceListType !== undefined) updateData.priceListType = data.priceListType as PriceListType;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom ? new Date(data.validFrom) : undefined;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil ? new Date(data.validUntil) : undefined;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.description !== undefined) updateData.description = data.description || undefined;

    await this.priceListRepository.update(id, updateData);
    const updated = await this.getPriceListById(id);

    if (!updated) {
      return {
        success: false,
        message: 'Price list not found',
        statusCode: 404,
      };
    }

    return { success: true, priceList: updated };
  }

  async deletePriceList(id: string) {
    const priceList = await this.priceListRepository.findById(id);
    if (!priceList) {
      return {
        success: false,
        message: 'Price list not found',
        statusCode: 404,
      };
    }
    if (priceList.nonDeletable) {
      return {
        success: false,
        message: 'This price list cannot be deleted',
        statusCode: 403,
      };
    }
    try {
      await this.priceListRepository.delete(id);
      return { success: true };
    } catch {
      return {
        success: false,
        message: 'Price list not found',
        statusCode: 404,
      };
    }
  }

  private mapPriceList(priceList: PriceList) {
    return {
      id: priceList.id,
      name: priceList.name,
      priceListType: priceList.priceListType,
      currency: priceList.currency,
      validFrom: priceList.validFrom,
      validUntil: priceList.validUntil,
      priority: priceList.priority,
      isDefault: priceList.isDefault,
      isActive: priceList.isActive,
      nonDeletable: priceList.nonDeletable === true,
      description: priceList.description ?? null,
      createdAt: priceList.createdAt,
      updatedAt: priceList.updatedAt,
    };
  }
}
