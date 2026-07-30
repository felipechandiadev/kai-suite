import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EShopDeliveryZone } from '../domain/e-shop-delivery-zone.entity';
import { DeliveryZoneGeometryService } from './delivery-zone-geometry.service';
import type { GeoJsonPolygon } from '../domain/delivery.types';

@Injectable()
export class DeliveryZoneService {
  constructor(
    @InjectRepository(EShopDeliveryZone)
    private readonly zoneRepo: Repository<EShopDeliveryZone>,
    private readonly geometry: DeliveryZoneGeometryService,
  ) {}

  async listAdmin(companyId: string) {
    const rows = await this.zoneRepo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return Promise.all(
      rows.map(async (z) => ({
        id: z.id,
        name: z.name,
        shippingFee: Number(z.shippingFee) || 0,
        isActive: z.isActive,
        sortOrder: z.sortOrder,
        communeCode: z.communeCode,
        geometry: await this.geometry.readZoneGeometry(z.id),
      })),
    );
  }

  async save(
    companyId: string,
    input: {
      id?: string;
      name: string;
      shippingFee: number;
      isActive: boolean;
      sortOrder?: number;
      communeCode?: string | null;
      geometry?: GeoJsonPolygon | null;
    },
  ) {
    let row: EShopDeliveryZone;
    if (input.id) {
      const existing = await this.zoneRepo.findOne({ where: { companyId, id: input.id } });
      if (!existing) throw new Error('Zona no encontrada');
      existing.name = input.name.trim();
      existing.shippingFee = input.shippingFee;
      existing.isActive = input.isActive;
      existing.sortOrder = input.sortOrder ?? existing.sortOrder;
      existing.communeCode = input.communeCode ?? null;
      row = await this.zoneRepo.save(existing);
    } else {
      const maxSort = await this.zoneRepo
        .createQueryBuilder('z')
        .select('COALESCE(MAX(z.sortOrder), -1)', 'max')
        .where('z.companyId = :companyId', { companyId })
        .getRawOne<{ max: string }>();
      row = await this.zoneRepo.save(
        this.zoneRepo.create({
          companyId,
          name: input.name.trim(),
          shippingFee: input.shippingFee,
          isActive: input.isActive,
          sortOrder: input.sortOrder ?? Number(maxSort?.max ?? -1) + 1,
          communeCode: input.communeCode ?? null,
        }),
      );
    }

    if (input.geometry !== undefined) {
      await this.geometry.saveZoneGeometry(row.id, input.geometry);
    }

    return {
      id: row.id,
      name: row.name,
      shippingFee: Number(row.shippingFee) || 0,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      communeCode: row.communeCode,
      geometry: await this.geometry.readZoneGeometry(row.id),
    };
  }

  async remove(companyId: string, zoneId: string) {
    await this.zoneRepo.delete({ companyId, id: zoneId });
  }
}
