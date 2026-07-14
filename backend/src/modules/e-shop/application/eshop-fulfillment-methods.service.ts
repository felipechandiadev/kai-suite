import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EShopFulfillmentMethod,
  type EShopFulfillmentMethodType,
} from '../domain/e-shop-fulfillment-method.entity';
import type { EShopFulfillmentMethodSnapshot } from '@modules/transactions/domain/transaction-eshop-order.metadata';
import { DeliveryCoverageService } from '@modules/e-shop-delivery/application/delivery-coverage.service';
import { DeliveryZoneService } from '@modules/e-shop-delivery/application/delivery-zone.service';
import { DeliveryOccurrenceService } from '@modules/e-shop-delivery/application/delivery-occurrence.service';

export const CANONICAL_FULFILLMENT_CODES = ['pickup', 'local-delivery'] as const;
export type CanonicalFulfillmentCode = (typeof CANONICAL_FULFILLMENT_CODES)[number];

export type FulfillmentMethodPublicRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: EShopFulfillmentMethodType;
  price: number;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  requiresAddress: boolean;
  requiresPhone: boolean;
  instructions: string | null;
};

export type CanonicalFulfillmentMethodRow = {
  id: string;
  code: CanonicalFulfillmentCode;
  name: string;
  description: string | null;
  type: EShopFulfillmentMethodType;
  isActive: boolean;
  instructions: string | null;
  sortOrder: number;
};

export type LocalDeliveryOperationalReadiness = {
  localDeliveryEnabled: boolean;
  depotConfigured: boolean;
  communesEnabled: boolean;
  zonesActive: boolean;
  occurrencesAvailable: boolean;
};

const CANONICAL_DEFS: Record<
  CanonicalFulfillmentCode,
  {
    name: string;
    description: string;
    type: EShopFulfillmentMethodType;
    requiresAddress: boolean;
    requiresPhone: boolean;
    instructions: string;
    defaultActive: boolean;
    sortOrder: number;
  }
> = {
  pickup: {
    name: 'Retiro en tienda',
    description: 'Retira tu pedido en nuestra boutique',
    type: 'PICKUP',
    requiresAddress: false,
    requiresPhone: false,
    instructions: 'Te avisaremos cuando tu pedido esté listo para retiro.',
    defaultActive: true,
    sortOrder: 0,
  },
  'local-delivery': {
    name: 'Reparto local',
    description: 'Entrega programada en la Región del Maule',
    type: 'LOCAL_DELIVERY',
    requiresAddress: true,
    requiresPhone: true,
    instructions: 'Selecciona dirección y franja de reparto disponible.',
    defaultActive: false,
    sortOrder: 1,
  },
};

function isCanonicalCode(code: string): code is CanonicalFulfillmentCode {
  return (CANONICAL_FULFILLMENT_CODES as readonly string[]).includes(code);
}

@Injectable()
export class EShopFulfillmentMethodsService {
  constructor(
    @InjectRepository(EShopFulfillmentMethod)
    private readonly repo: Repository<EShopFulfillmentMethod>,
    @Optional() private readonly deliveryCoverage?: DeliveryCoverageService,
    @Optional() private readonly deliveryZones?: DeliveryZoneService,
    @Optional() private readonly deliveryOccurrences?: DeliveryOccurrenceService,
  ) {}

  async listActive(companyId: string): Promise<FulfillmentMethodPublicRow[]> {
    const rows = await this.repo.find({
      where: { companyId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return rows.map((r) => this.toPublicRow(r, 0));
  }

  async listActiveWithPricing(
    companyId: string,
    subtotal: number,
    globalFreeThreshold: number | null,
    options?: { localDeliveryEnabled?: boolean },
  ): Promise<FulfillmentMethodPublicRow[]> {
    const rows = await this.repo.find({
      where: { companyId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const localDeliveryEnabled = options?.localDeliveryEnabled !== false;
    return rows
      .filter((r) => {
        if (r.type === 'LOCAL_DELIVERY' && !localDeliveryEnabled) return false;
        return true;
      })
      .map((r) =>
        this.toPublicRow(
          r,
          this.calculateShippingCost(r, subtotal, globalFreeThreshold),
        ),
      );
  }

  async listAdmin(companyId: string): Promise<EShopFulfillmentMethod[]> {
    return this.repo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async listCanonicalAdmin(companyId: string): Promise<{
    methods: CanonicalFulfillmentMethodRow[];
    localDeliveryReadiness: LocalDeliveryOperationalReadiness;
  }> {
    await this.ensureCanonicalMethods(companyId);
    const rows = await this.repo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const byCode = new Map(rows.map((r) => [r.code, r]));
    const methods: CanonicalFulfillmentMethodRow[] = CANONICAL_FULFILLMENT_CODES.map(
      (code) => {
        const row = byCode.get(code)!;
        return {
          id: row.id,
          code,
          name: row.name,
          description: row.description ?? null,
          type: row.type,
          isActive: row.isActive,
          instructions: row.instructions ?? null,
          sortOrder: row.sortOrder,
        };
      },
    );
    const localDeliveryReadiness = await this.getLocalDeliveryReadiness(companyId);
    return { methods, localDeliveryReadiness };
  }

  async setCanonicalMethodEnabled(
    companyId: string,
    code: string,
    enabled: boolean,
  ): Promise<CanonicalFulfillmentMethodRow> {
    if (!isCanonicalCode(code)) {
      throw new BadRequestException(
        `Código de método no canónico: ${code}. Use: ${CANONICAL_FULFILLMENT_CODES.join(', ')}`,
      );
    }
    await this.ensureCanonicalMethods(companyId);
    const row = await this.repo.findOne({ where: { companyId, code } });
    if (!row) {
      throw new BadRequestException(`Método canónico ${code} no encontrado`);
    }
    row.isActive = enabled;
    const saved = await this.repo.save(row);

    if (code === 'local-delivery' && this.deliveryCoverage) {
      await this.deliveryCoverage.updateSettings(companyId, {
        localDeliveryEnabled: enabled,
      });
    }

    return {
      id: saved.id,
      code,
      name: saved.name,
      description: saved.description ?? null,
      type: saved.type,
      isActive: saved.isActive,
      instructions: saved.instructions ?? null,
      sortOrder: saved.sortOrder,
    };
  }

  async findActiveById(
    companyId: string,
    id: string,
  ): Promise<EShopFulfillmentMethod | null> {
    return this.repo.findOne({
      where: { companyId, id, isActive: true },
    });
  }

  async findById(companyId: string, id: string): Promise<EShopFulfillmentMethod | null> {
    return this.repo.findOne({ where: { companyId, id } });
  }

  async create(
    companyId: string,
    data: Partial<EShopFulfillmentMethod>,
  ): Promise<EShopFulfillmentMethod> {
    const maxSort = await this.repo
      .createQueryBuilder('m')
      .select('COALESCE(MAX(m.sortOrder), -1)', 'max')
      .where('m.companyId = :companyId', { companyId })
      .getRawOne<{ max: string }>();
    const row = this.repo.create({
      companyId,
      code: data.code!.trim(),
      name: data.name!.trim(),
      description: data.description?.trim() || null,
      type: data.type!,
      priceFlat: data.priceFlat ?? null,
      freeShippingThreshold: data.freeShippingThreshold ?? null,
      estimatedDaysMin: data.estimatedDaysMin ?? null,
      estimatedDaysMax: data.estimatedDaysMax ?? null,
      requiresAddress: data.requiresAddress === true,
      requiresPhone: data.requiresPhone === true,
      instructions: data.instructions?.trim() || null,
      pickupBranchId: data.pickupBranchId ?? null,
      isActive: data.isActive !== false,
      sortOrder: data.sortOrder ?? Number(maxSort?.max ?? -1) + 1,
    });
    return this.repo.save(row);
  }

  async update(
    companyId: string,
    id: string,
    data: Partial<EShopFulfillmentMethod>,
  ): Promise<EShopFulfillmentMethod> {
    const row = await this.findById(companyId, id);
    if (!row) throw new Error('Método de entrega no encontrado');
    if (data.code != null) row.code = data.code.trim();
    if (data.name != null) row.name = data.name.trim();
    if (data.description !== undefined) row.description = data.description?.trim() || null;
    if (data.type != null) row.type = data.type;
    if (data.priceFlat !== undefined) row.priceFlat = data.priceFlat;
    if (data.freeShippingThreshold !== undefined) {
      row.freeShippingThreshold = data.freeShippingThreshold;
    }
    if (data.estimatedDaysMin !== undefined) row.estimatedDaysMin = data.estimatedDaysMin;
    if (data.estimatedDaysMax !== undefined) row.estimatedDaysMax = data.estimatedDaysMax;
    if (data.requiresAddress !== undefined) row.requiresAddress = data.requiresAddress;
    if (data.requiresPhone !== undefined) row.requiresPhone = data.requiresPhone;
    if (data.instructions !== undefined) row.instructions = data.instructions?.trim() || null;
    if (data.pickupBranchId !== undefined) row.pickupBranchId = data.pickupBranchId;
    if (data.isActive !== undefined) row.isActive = data.isActive;
    if (data.sortOrder !== undefined) row.sortOrder = data.sortOrder;
    return this.repo.save(row);
  }

  async remove(companyId: string, id: string): Promise<void> {
    await this.repo.delete({ companyId, id });
  }

  async reorder(companyId: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.repo.update({ companyId, id: orderedIds[i] }, { sortOrder: i });
    }
  }

  /**
   * Idempotent: ensures pickup + local-delivery exist even when other methods already exist.
   */
  async ensureCanonicalMethods(companyId: string): Promise<void> {
    for (const code of CANONICAL_FULFILLMENT_CODES) {
      const existing = await this.repo.findOne({ where: { companyId, code } });
      if (existing) continue;
      const def = CANONICAL_DEFS[code];
      await this.create(companyId, {
        code,
        name: def.name,
        description: def.description,
        type: def.type,
        requiresAddress: def.requiresAddress,
        requiresPhone: def.requiresPhone,
        instructions: def.instructions,
        isActive: def.defaultActive,
        sortOrder: def.sortOrder,
      } as EShopFulfillmentMethod);
    }
  }

  /** @deprecated Prefer ensureCanonicalMethods — only seeds when company has zero methods. */
  async ensureDefaults(companyId: string): Promise<void> {
    const existing = await this.repo.count({ where: { companyId } });
    if (existing > 0) {
      await this.ensureCanonicalMethods(companyId);
      return;
    }
    await this.ensureCanonicalMethods(companyId);
    await this.create(companyId, {
      code: 'coordinate',
      name: 'Envío a coordinar',
      description: 'Coordinamos el envío contigo tras confirmar el pedido',
      type: 'MANUAL_QUOTE',
      requiresAddress: true,
      requiresPhone: true,
      instructions: 'Nos contactaremos para acordar dirección y costo de envío.',
      isActive: false,
      sortOrder: 2,
    } as EShopFulfillmentMethod);
  }

  async getLocalDeliveryReadiness(
    companyId: string,
  ): Promise<LocalDeliveryOperationalReadiness> {
    if (!this.deliveryCoverage) {
      return {
        localDeliveryEnabled: false,
        depotConfigured: false,
        communesEnabled: false,
        zonesActive: false,
        occurrencesAvailable: false,
      };
    }

    const settings = await this.deliveryCoverage.getSettings(companyId);
    const communes = await this.deliveryCoverage.listCommunes(companyId);
    const zones = this.deliveryZones
      ? await this.deliveryZones.listAdmin(companyId)
      : [];
    const occurrences = this.deliveryOccurrences
      ? await this.deliveryOccurrences.listAdmin(companyId)
      : [];

    return {
      localDeliveryEnabled: settings.localDeliveryEnabled === true,
      depotConfigured:
        settings.depotLat != null &&
        settings.depotLng != null &&
        Boolean(settings.depotAddress?.trim()),
      communesEnabled: communes.some((c) => c.isEnabled),
      zonesActive: zones.some((z) => z.isActive),
      occurrencesAvailable: occurrences.some((o) => !o.isCancelled),
    };
  }

  calculateShippingCost(
    method: EShopFulfillmentMethod,
    subtotal: number,
    globalFreeThreshold: number | null,
  ): number {
    switch (method.type) {
      case 'PICKUP':
      case 'MANUAL_QUOTE':
        return 0;
      case 'LOCAL_DELIVERY':
        return Math.max(0, Number(method.priceFlat) || 0);
      case 'FLAT_RATE':
        return Math.max(0, Number(method.priceFlat) || 0);
      case 'FREE_OVER_THRESHOLD': {
        const threshold =
          method.freeShippingThreshold != null
            ? Number(method.freeShippingThreshold)
            : globalFreeThreshold != null
              ? Number(globalFreeThreshold)
              : null;
        if (threshold != null && threshold > 0 && subtotal >= threshold) {
          return 0;
        }
        return Math.max(0, Number(method.priceFlat) || 0);
      }
      default:
        return 0;
    }
  }

  toSnapshot(
    method: EShopFulfillmentMethod,
    price: number,
  ): EShopFulfillmentMethodSnapshot {
    return {
      id: method.id,
      code: method.code,
      name: method.name,
      type: method.type,
      price,
      instructions: method.instructions ?? null,
    };
  }

  private toPublicRow(
    method: EShopFulfillmentMethod,
    price: number,
  ): FulfillmentMethodPublicRow {
    return {
      id: method.id,
      code: method.code,
      name: method.name,
      description: method.description ?? null,
      type: method.type,
      price,
      estimatedDaysMin: method.estimatedDaysMin ?? null,
      estimatedDaysMax: method.estimatedDaysMax ?? null,
      requiresAddress: method.requiresAddress,
      requiresPhone: method.requiresPhone,
      instructions: method.instructions ?? null,
    };
  }
}
