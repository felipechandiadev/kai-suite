import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { EShopDeliveryOccurrence } from '../domain/e-shop-delivery-occurrence.entity';
import { EShopDeliveryOccurrenceZone } from '../domain/e-shop-delivery-occurrence-zone.entity';
import { EShopDeliveryOrder } from '../domain/e-shop-delivery-order.entity';
import { EShopDeliveryZone } from '../domain/e-shop-delivery-zone.entity';
import type {
  DeliveryOccurrenceAdminRow,
  SaveDeliveryOccurrenceInput,
  UpdateDeliveryOccurrenceInput,
} from '../domain/delivery.types';

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

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    throw new BadRequestException('Hora inválida (usa HH:mm)');
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) {
    throw new BadRequestException('Hora inválida (usa HH:mm)');
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new BadRequestException('Fecha inválida (usa YYYY-MM-DD)');
  }
  return trimmed;
}

function displayTime(value: string): string {
  return value.slice(0, 5);
}

function timeToMinutes(value: string): number {
  const [h, m] = displayTime(value).split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

const LOCKED_ROUTE_STATUSES = new Set(['out', 'completed']);

@Injectable()
export class DeliveryOccurrenceService {
  constructor(
    @InjectRepository(EShopDeliveryOccurrence)
    private readonly occurrenceRepo: Repository<EShopDeliveryOccurrence>,
    @InjectRepository(EShopDeliveryOccurrenceZone)
    private readonly occurrenceZoneRepo: Repository<EShopDeliveryOccurrenceZone>,
    @InjectRepository(EShopDeliveryOrder)
    private readonly deliveryOrderRepo: Repository<EShopDeliveryOrder>,
    @InjectRepository(EShopDeliveryZone)
    private readonly zoneRepo: Repository<EShopDeliveryZone>,
  ) {}

  async listAdmin(
    companyId: string,
    from?: string,
    to?: string,
  ): Promise<DeliveryOccurrenceAdminRow[]> {
    const start = from ?? toChileDate(new Date());
    const end =
      to ??
      toChileDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    const rows = await this.occurrenceRepo.find({
      where: { companyId, occurrenceDate: Between(start, end) },
      order: { occurrenceDate: 'ASC', departureTime: 'ASC' },
    });

    if (rows.length === 0) return [];

    const occurrenceIds = rows.map((r) => r.id);
    const links = await this.occurrenceZoneRepo.find({
      where: { companyId, occurrenceId: In(occurrenceIds) },
    });
    const zoneIds = [...new Set(links.map((l) => l.zoneId))];
    const zones =
      zoneIds.length > 0
        ? await this.zoneRepo.find({ where: { companyId, id: In(zoneIds) } })
        : [];
    const zoneById = new Map(zones.map((z) => [z.id, z]));

    const orderCounts = await this.deliveryOrderRepo
      .createQueryBuilder('o')
      .select('o.delivery_occurrence_id', 'occurrenceId')
      .addSelect('COUNT(*)', 'count')
      .where('o.company_id = :companyId', { companyId })
      .andWhere('o.delivery_occurrence_id IN (:...ids)', { ids: occurrenceIds })
      .groupBy('o.delivery_occurrence_id')
      .getRawMany<{ occurrenceId: string; count: string }>();

    const countByOccurrence = new Map(
      orderCounts.map((r) => [r.occurrenceId, Number(r.count) || 0]),
    );

    const zonesByOccurrence = new Map<string, string[]>();
    for (const link of links) {
      const list = zonesByOccurrence.get(link.occurrenceId) ?? [];
      list.push(link.zoneId);
      zonesByOccurrence.set(link.occurrenceId, list);
    }

    return rows.map((row) => {
      const linkedZoneIds = zonesByOccurrence.get(row.id) ?? [];
      const orderCount = countByOccurrence.get(row.id) ?? 0;
      return this.toAdminRow(row, linkedZoneIds, zoneById, orderCount);
    });
  }

  async create(
    companyId: string,
    input: SaveDeliveryOccurrenceInput,
  ): Promise<DeliveryOccurrenceAdminRow> {
    const validated = await this.validateInput(companyId, input);
    const row = await this.occurrenceRepo.save(
      this.occurrenceRepo.create({
        companyId,
        name: validated.name,
        occurrenceDate: validated.occurrenceDate,
        departureTime: validated.departureTime,
        orderCutoffTime: validated.orderCutoffTime,
        maxOrders: validated.maxOrders,
        driverUserId: validated.driverUserId,
        isCancelled: false,
        routeStatus: 'planned',
      }),
    );

    if (validated.zoneIds.length > 0) {
      await this.occurrenceZoneRepo.save(
        validated.zoneIds.map((zoneId) =>
          this.occurrenceZoneRepo.create({
            companyId,
            occurrenceId: row.id,
            zoneId,
          }),
        ),
      );
    }

    return this.getAdminRow(companyId, row.id);
  }

  async update(
    companyId: string,
    occurrenceId: string,
    input: UpdateDeliveryOccurrenceInput,
  ): Promise<DeliveryOccurrenceAdminRow> {
    const existing = await this.occurrenceRepo.findOne({
      where: { companyId, id: occurrenceId },
    });
    if (!existing) throw new NotFoundException('Franja de reparto no encontrada');

    this.assertMutable(existing);

    const merged: SaveDeliveryOccurrenceInput = {
      name: input.name ?? existing.name,
      occurrenceDate: input.occurrenceDate ?? existing.occurrenceDate,
      departureTime: input.departureTime ?? displayTime(existing.departureTime),
      orderCutoffTime:
        input.orderCutoffTime ?? displayTime(existing.orderCutoffTime),
      maxOrders:
        input.maxOrders !== undefined ? input.maxOrders : existing.maxOrders,
      driverUserId:
        input.driverUserId !== undefined
          ? input.driverUserId
          : existing.driverUserId,
      zoneIds:
        input.zoneIds !== undefined
          ? input.zoneIds
          : await this.getZoneIds(companyId, occurrenceId),
      isCancelled:
        input.isCancelled !== undefined
          ? input.isCancelled
          : existing.isCancelled,
    };

    const orderCount = await this.deliveryOrderRepo.count({
      where: { companyId, deliveryOccurrenceId: occurrenceId },
    });

    const validated = await this.validateInput(companyId, merged, {
      orderCount,
      occurrenceId,
      previousZoneIds: await this.getZoneIds(companyId, occurrenceId),
    });

    existing.name = validated.name;
    existing.occurrenceDate = validated.occurrenceDate;
    existing.departureTime = validated.departureTime;
    existing.orderCutoffTime = validated.orderCutoffTime;
    existing.maxOrders = validated.maxOrders;
    existing.driverUserId = validated.driverUserId;
    if (validated.isCancelled) {
      existing.isCancelled = true;
      existing.routeStatus = 'cancelled';
    } else if (existing.isCancelled && validated.isCancelled === false) {
      existing.isCancelled = false;
      if (existing.routeStatus === 'cancelled') {
        existing.routeStatus = 'planned';
      }
    }

    await this.occurrenceRepo.save(existing);
    await this.replaceZones(companyId, occurrenceId, validated.zoneIds);

    return this.getAdminRow(companyId, occurrenceId);
  }

  async cancel(
    companyId: string,
    occurrenceId: string,
  ): Promise<DeliveryOccurrenceAdminRow> {
    const existing = await this.occurrenceRepo.findOne({
      where: { companyId, id: occurrenceId },
    });
    if (!existing) throw new NotFoundException('Franja de reparto no encontrada');
    this.assertMutable(existing);

    existing.isCancelled = true;
    existing.routeStatus = 'cancelled';
    await this.occurrenceRepo.save(existing);
    return this.getAdminRow(companyId, occurrenceId);
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
        departureTime: displayTime(o.departureTime),
        orderCutoffTime: displayTime(o.orderCutoffTime),
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
    const rows = await this.occurrenceZoneRepo.find({
      where: { companyId, occurrenceId },
    });
    return rows.map((r) => r.zoneId);
  }

  private assertMutable(row: EShopDeliveryOccurrence) {
    if (LOCKED_ROUTE_STATUSES.has(row.routeStatus)) {
      throw new BadRequestException(
        `No se puede modificar una franja en estado "${row.routeStatus}"`,
      );
    }
  }

  private async validateInput(
    companyId: string,
    input: SaveDeliveryOccurrenceInput,
    opts?: {
      orderCount?: number;
      occurrenceId?: string;
      previousZoneIds?: string[];
    },
  ) {
    const name = input.name?.trim() ?? '';
    if (!name) throw new BadRequestException('El nombre es obligatorio');

    const occurrenceDate = normalizeDate(input.occurrenceDate);
    const departureTime = normalizeTime(input.departureTime);
    const orderCutoffTime = normalizeTime(input.orderCutoffTime);

    if (timeToMinutes(orderCutoffTime) >= timeToMinutes(departureTime)) {
      throw new BadRequestException(
        'El horario de corte debe ser anterior a la hora de salida',
      );
    }

    let maxOrders: number | null = null;
    if (input.maxOrders != null && input.maxOrders !== undefined) {
      const n = Number(input.maxOrders);
      if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
        throw new BadRequestException('Cupos máximos inválidos');
      }
      maxOrders = n;
    }

    const orderCount = opts?.orderCount ?? 0;
    if (maxOrders != null && maxOrders < orderCount) {
      throw new BadRequestException(
        `No puedes fijar cupos (${maxOrders}) por debajo de pedidos ya asignados (${orderCount})`,
      );
    }

    const zoneIds = [...new Set((input.zoneIds ?? []).filter(Boolean))];
    if (zoneIds.length === 0) {
      throw new BadRequestException('Selecciona al menos una zona');
    }

    const zones = await this.zoneRepo.find({
      where: { companyId, id: In(zoneIds) },
    });
    if (zones.length !== zoneIds.length) {
      throw new BadRequestException('Una o más zonas no existen');
    }
    const inactive = zones.filter((z) => !z.isActive);
    if (inactive.length > 0) {
      throw new BadRequestException(
        `Zonas inactivas: ${inactive.map((z) => z.name).join(', ')}`,
      );
    }

    if (opts?.occurrenceId && opts.previousZoneIds) {
      const removed = opts.previousZoneIds.filter((id) => !zoneIds.includes(id));
      if (removed.length > 0) {
        const orphanOrders = await this.deliveryOrderRepo.count({
          where: {
            companyId,
            deliveryOccurrenceId: opts.occurrenceId,
            deliveryZoneId: In(removed),
          },
        });
        if (orphanOrders > 0) {
          throw new BadRequestException(
            'No puedes quitar zonas que ya tienen pedidos asignados a esta franja',
          );
        }
      }
    }

    return {
      name,
      occurrenceDate,
      departureTime,
      orderCutoffTime,
      maxOrders,
      driverUserId: input.driverUserId ?? null,
      zoneIds,
      isCancelled: Boolean(input.isCancelled),
    };
  }

  private async replaceZones(
    companyId: string,
    occurrenceId: string,
    zoneIds: string[],
  ) {
    await this.occurrenceZoneRepo.delete({ companyId, occurrenceId });
    if (zoneIds.length === 0) return;
    await this.occurrenceZoneRepo.save(
      zoneIds.map((zoneId) =>
        this.occurrenceZoneRepo.create({ companyId, occurrenceId, zoneId }),
      ),
    );
  }

  private async getAdminRow(
    companyId: string,
    occurrenceId: string,
  ): Promise<DeliveryOccurrenceAdminRow> {
    const rows = await this.listAdmin(
      companyId,
      '1970-01-01',
      '2999-12-31',
    );
    const row = rows.find((r) => r.id === occurrenceId);
    if (!row) throw new NotFoundException('Franja de reparto no encontrada');
    return row;
  }

  private toAdminRow(
    row: EShopDeliveryOccurrence,
    zoneIds: string[],
    zoneById: Map<string, EShopDeliveryZone>,
    orderCount: number,
  ): DeliveryOccurrenceAdminRow {
    const locked = LOCKED_ROUTE_STATUSES.has(row.routeStatus);
    return {
      id: row.id,
      name: row.name,
      occurrenceDate: row.occurrenceDate,
      departureTime: displayTime(row.departureTime),
      orderCutoffTime: displayTime(row.orderCutoffTime),
      maxOrders: row.maxOrders,
      driverUserId: row.driverUserId,
      isCancelled: row.isCancelled,
      routeStatus: row.routeStatus,
      zoneIds,
      zones: zoneIds
        .map((id) => zoneById.get(id))
        .filter((z): z is EShopDeliveryZone => Boolean(z))
        .map((z) => ({ id: z.id, name: z.name })),
      orderCount,
      availableSlots:
        row.maxOrders != null ? Math.max(0, row.maxOrders - orderCount) : null,
      canEdit: !locked && !row.isCancelled,
      canCancel: !locked && !row.isCancelled,
    };
  }
}
