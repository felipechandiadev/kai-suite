import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Tax, TaxType } from '../domain/tax.entity';

function assertPositiveTaxRate(rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new BadRequestException('La tasa del impuesto debe ser mayor a 0%');
  }
  if (rate > 999.99) {
    throw new BadRequestException('La tasa del impuesto está fuera de rango');
  }
}

@Injectable()
export class TaxesService {
  constructor(
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
  ) {}

  async getAllTaxes(includeInactive: boolean, isActive?: boolean) {
    const query = this.taxRepository.createQueryBuilder('tax');

    if (typeof isActive === 'boolean') {
      query.where('tax.isActive = :isActive', { isActive });
    } else if (!includeInactive) {
      query.where('tax.isActive = :isActive', { isActive: true });
    }

    const taxes = await query.orderBy('tax.name', 'ASC').getMany();
    return taxes.map((tax) => this.mapTax(tax));
  }

  async getTaxById(id: string) {
    const tax = await this.taxRepository.findOne({ where: { id } });
    if (!tax) {
      return null;
    }
    return this.mapTax(tax);
  }

  async createTax(data: {
    companyId: string;
    name: string;
    code?: string | null;
    taxType?: TaxType | string;
    rate: number;
    description?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  }) {
    assertPositiveTaxRate(Number(data.rate));
    const code =
      data.code != null && String(data.code).trim() !== ''
        ? String(data.code).trim().slice(0, 20)
        : null;
    const tax = this.taxRepository.create({
      companyId: data.companyId,
      name: data.name,
      code,
      taxType: (data.taxType as TaxType) ?? TaxType.IVA,
      rate: data.rate,
      description: data.description ?? undefined,
      isDefault: !!data.isDefault,
      isActive: data.isActive !== false,
      nonDeletable: false,
    } as DeepPartial<Tax>);

    const saved = await this.taxRepository.save(tax);
    const created = await this.getTaxById(saved.id);

    return { success: true, tax: created };
  }

  async updateTax(
    id: string,
    data: Partial<{
      name: string;
      code: string | null;
      taxType: TaxType | string;
      rate: number;
      description: string | null;
      isDefault: boolean;
      isActive: boolean;
    }>,
  ) {
    if (data.rate != null) {
      assertPositiveTaxRate(Number(data.rate));
    }
    const updateData: Record<string, unknown> = { ...data };
    if ('code' in data) {
      const raw = data.code;
      updateData.code =
        raw != null && String(raw).trim() !== ''
          ? String(raw).trim().slice(0, 20)
          : null;
    }
    if (updateData.taxType) {
      updateData.taxType = updateData.taxType as TaxType;
    }

    await this.taxRepository.update(id, updateData as DeepPartial<Tax>);
    const updated = await this.getTaxById(id);

    if (!updated) {
      return { success: false, message: 'Tax not found', statusCode: 404 };
    }

    return { success: true, tax: updated };
  }

  async deleteTax(id: string) {
    const tax = await this.taxRepository.findOne({ where: { id } });
    if (!tax) {
      return { success: false, message: 'Tax not found', statusCode: 404 };
    }
    if (tax.nonDeletable) {
      return {
        success: false,
        message: 'This tax cannot be deleted',
        statusCode: 403,
      };
    }
    const result = await this.taxRepository.softDelete(id);
    if (!result.affected) {
      return { success: false, message: 'Tax not found', statusCode: 404 };
    }
    return { success: true };
  }

  private mapTax(tax: Tax) {
    return {
      id: tax.id,
      companyId: tax.companyId,
      name: tax.name,
      code: tax.code,
      taxType: tax.taxType,
      rate: Number(tax.rate),
      description: tax.description ?? null,
      isDefault: tax.isDefault,
      isActive: tax.isActive,
      nonDeletable: tax.nonDeletable,
      createdAt: tax.createdAt,
      updatedAt: tax.updatedAt,
    };
  }
}
