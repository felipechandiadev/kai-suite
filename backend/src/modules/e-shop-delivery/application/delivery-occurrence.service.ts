import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { EShopDeliveryOccurrence } from '../domain/e-shop-delivery-occurrence.entity';
import { EShopDeliveryOccurrenceZone } from '../domain/e-shop-delivery-occurrence-zone.entity';
import { EShopDeliveryOrder } from '../domain/e-shop-delivery-order.entity';

function toChileDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

function toChileTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

@Injectable()
export class DeliveryOccurrenceService {
  constructor(
    @InjectRepository(EShopDeliveryOccurrence)
    private readonly occurrenceRepo: Repository<EShopDeliveryOccurrence>,
    @InjectRepository(EShopDeliveryOccurrenceZone)
    private readonly occurrenceZoneRepo: Repository<EShopDeliveryOccurrenceZone>,
    @InjectRepository(EShopDeliveryOrder)
    private readonly deliveryOrderRepo: Repository<EShopDeliveryOrder>,
  ) {}

  async listAdmin(companyId: string, from?: string, to?: string) {
    const start = from ?? toChileDate(new Date());
    const end =
      to ??
      toChileDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    return this.occurrenceRepo.find({
      where: { companyId, occurrenceDate: Between(start, end) },
      order: { occurrenceDate: 'ASC', departureTime: 'ASC' },
    });
  }

  async create(
    companyId: string,
    input: {
      name: string;
      occurrenceDate: string;
      departureTime: string;
      orderCutoffTime: string;
      maxOrders?: number | null;
      driverUserId?: string | null;
      zoneIds?: string[];
    },
  ) {
    const row = await this.occurrenceRepo.save(
      this.occurrenceRepo.create({
        companyId,
        name: input.name.trim(),
        occurrenceDate: input.occurrenceDate,
        departureTime: input.departureTime,
        orderCutoffTime: input.orderCutoffTime,
        maxOrders: input.maxOrders ?? null,
        driverUserId: input.driverUserId ?? null,
        isCancelled: false,
        routeStatus: 'planned',
      }),
    );
    if (input.zoneIds?.length) {
      await this.occurrenceZoneRepo.save(
        input.zoneIds.map((zoneId) =>
          this.occurrenceZoneRepo.create({ companyId, occurrenceId: row.id, zoneId }),
        ),
      );
    }
    return row;
  }

  async listAvailableForZone(companyId: string, zoneId: string, at = new Date()) {
    const today = toChileDate(at);
    const nowTime = toChileTime(at);
    const end = toChileDate(new Date(at.getTime() + 7 * 24 * 60 * 60 * 1000));

    const occurrences = await this.occurrenceRepo
      .createQueryBuilder('o')
      .innerJoin(
        EShopDeliveryOccurrenceZone,
        'oz',
        'oz.occurrence_id = o.id AND oz.zone_id = :zoneId',
        { zoneId },
      )
      .where('o.company_id = :companyId', { companyId })
      .andWhere('o.is_cancelled = false')
      .andWhere('o.occurrence_date BETWEEN :today AND :end', { today, end })
      .orderBy('o.occurrence_date', 'ASC')
      .addOrderBy('o.departure_time', 'ASC')
      .getMany();

    const result: Array<{
      id: string;
      name: string;
      occurrenceDate: string;
      departureTime: string;
      orderCutoffTime: string;
      availableSlots: number | null;
    }> = [];
    for (const o of occurrences) {
      if (o.occurrenceDate === today && o.orderCutoffTime < nowTime) continue;
      const count = await this.deliveryOrderRepo.count({
        where: { companyId, deliveryOccurrenceId: o.id },
      });
      if (o.maxOrders != null && count >= o.maxOrders) continue;
      result.push({
        id: o.id,
        name: o.name,
        occurrenceDate: o.occurrenceDate,
        departureTime: o.departureTime,
        orderCutoffTime: o.orderCutoffTime,
        availableSlots: o.maxOrders != null ? Math.max(0, o.maxOrders - count) : null,
      });
    }
    return result;
  }

  async assertOccurrenceAvailable(
    companyId: string,
    occurrenceId: string,
    zoneId: string,
  ) {
    const link = await this.occurrenceZoneRepo.findOne({
      where: { companyId, occurrenceId, zoneId },
    });
    if (!link) throw new BadRequestException('La franja no atiende esta zona');

    const occurrence = await this.occurrenceRepo.findOne({
      where: { companyId, id: occurrenceId, isCancelled: false },
    });
    if (!occurrence) throw new BadRequestException('Franja de reparto no disponible');

    const now = new Date();
    if (
      occurrence.occurrenceDate === toChileDate(now) &&
      occurrence.orderCutoffTime < toChileTime(now)
    ) {
      throw new BadRequestException('El horario de corte ya pasó para esta franja');
    }

    if (occurrence.maxOrders != null) {
      const count = await this.deliveryOrderRepo.count({
        where: { companyId, deliveryOccurrenceId: occurrenceId },
      });
      if (count >= occurrence.maxOrders) {
        throw new BadRequestException('No quedan cupos en esta franja');
      }
    }
    return occurrence;
  }

  async getZoneIds(companyId: string, occurrenceId: string) {
    const rows = await this.occurrenceZoneRepo.find({ where: { companyId, occurrenceId } });
    return rows.map((r) => r.zoneId);
  }
}
