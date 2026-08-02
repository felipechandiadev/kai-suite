import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantsService } from '@modules/product-variants/application/product-variants.service';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { ProductionUnitPurpose } from '@modules/production-units/domain/production-unit.enums';
import { ProductModeService } from '@shared/product-mode/product-mode.service';
import { DiningRealtimePublisher } from '@modules/dining-realtime/dining-realtime.publisher';
import type {
  DiningKitchenItemUpdatedPayload,
  DiningKitchenSnapshotLinePayload,
  DiningSessionUpdatedPayload,
} from '@modules/dining-realtime/dining-realtime.types';
import { DiningRoom } from '../domain/dining-room.entity';
import { DiningTable } from '../domain/dining-table.entity';
import { DiningOrder, DiningOrderProfile } from '../domain/dining-order.entity';
import { DiningOrderLine } from '../domain/dining-order-line.entity';
import { DiningStationOrder } from '../domain/dining-station-order.entity';
import {
  DiningOrderKind,
  DiningOrderStatus,
  DiningStationOrderStatus,
  KitchenItemStatus,
  LineSource,
  TableShape,
} from '../domain/dining.enums';
import {
  canAddItems,
  canCancelLine,
  canIssueBillOrCharge,
  canMarkReady,
  canMarkReadyForPickup,
  canMarkServed,
  canRequestBill,
  reopenFromBilling,
  recomputeOrderStatusFromLines,
  selectLinesForKitchenFireReady,
  countPendingKitchenLines,
  selectReadyLinesForKitchenFire,
  effectiveKitchenFireId,
} from './dining-order-status.util';
import {
  deriveStationOrderStatus,
  itemPrepDurationMs,
  stationOrderPrepDurationMsForUnit,
} from './dining-station-order.util';
import {
  buildDiningOrderProfileOnOpen,
  mergeDiningOrderCustomerName,
} from './dining-order-profile.util';
import { DiningBackflushService } from './dining-backflush.service';
import { DiningMaterialReservationService } from './dining-material-reservation.service';
import { DiningOrderNumberService } from './dining-order-number.service';
import { DiningReadyNotificationService } from './dining-ready-notification.service';
import { DiningBoardService } from './dining-board.service';
import { WebPushSenderService } from '@modules/notifications/application/web-push-sender.service';
import { UpsertDiningTableDto } from './dto/upsert-dining-tables.dto';
import { RecipeCtpService } from '@modules/recipes/application/recipe-ctp.service';
import {
  kitchenVariantLabel,
  variantAttributesForKitchen,
} from './dining-kitchen-line.util';
import { diningBusinessPeriodKey } from './dining-business-period.util';

const ACTIVE_ORDER_STATUSES: DiningOrderStatus[] = [
  DiningOrderStatus.OPEN,
  DiningOrderStatus.SENT,
  DiningOrderStatus.PARTIAL_READY,
  DiningOrderStatus.READY,
  DiningOrderStatus.BILLING,
];

const PRODUCTION_UNIT_QUEUE_STATUSES: KitchenItemStatus[] = [
  KitchenItemStatus.SENT,
  KitchenItemStatus.PREPARING,
  /** Visible en KDS hasta completar el fire (ítems listos con check verde). */
  KitchenItemStatus.READY,
];

export type ProductionUnitHistoryItemDto = {
  id: string;
  quantity: number;
  notes: string | null;
  kitchenStatus: KitchenItemStatus;
  sentToKitchenAt: string | null;
  readyAt: string | null;
  prepDurationMs: number | null;
  productVariant: {
    id: string;
    name: string;
    attributes: Array<{ attributeValue: string }>;
  };
};

export type ProductionUnitHistoryOrderDto = {
  id: string;
  sequenceNumber: number;
  periodKey: string;
  status: DiningStationOrderStatus;
  sentAt: string;
  completedAt: string | null;
  diningOrderId: string;
  displayLabel: string;
  diningTableCode: string | null;
  prepDurationMs: number | null;
  items: ProductionUnitHistoryItemDto[];
};

@Injectable()
export class DiningService {
  constructor(
    @InjectRepository(DiningRoom)
    private readonly diningRoomRepository: Repository<DiningRoom>,
    @InjectRepository(DiningTable)
    private readonly diningTableRepository: Repository<DiningTable>,
    @InjectRepository(DiningOrder)
    private readonly diningOrderRepository: Repository<DiningOrder>,
    @InjectRepository(DiningOrderLine)
    private readonly diningOrderLineRepository: Repository<DiningOrderLine>,
    @InjectRepository(DiningStationOrder)
    private readonly diningStationOrderRepository: Repository<DiningStationOrder>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(ProductionUnit)
    private readonly productionUnitRepository: Repository<ProductionUnit>,
    private readonly productVariantsService: ProductVariantsService,
    private readonly productModeService: ProductModeService,
    private readonly diningRealtimePublisher: DiningRealtimePublisher,
    private readonly diningBackflushService: DiningBackflushService,
    private readonly diningMaterialReservation: DiningMaterialReservationService,
    private readonly diningOrderNumberService: DiningOrderNumberService,
    private readonly recipeCtpService: RecipeCtpService,
    private readonly diningReadyNotification: DiningReadyNotificationService,
    private readonly webPushSender: WebPushSenderService,
    private readonly diningBoardService: DiningBoardService,
  ) {}

  private requireCompanyId(): string {
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('No hay empresa activa en el contexto.');
    }
    return companyId;
  }

  private requireUserId(): string {
    const userId = TenantContext.getUserId();
    if (!userId) {
      throw new BadRequestException('No hay usuario en el contexto.');
    }
    return userId;
  }

  private async assertBranchInCompany(
    branchId: string,
    companyId: string,
  ): Promise<Branch> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId, companyId },
    });
    if (!branch) {
      throw new BadRequestException(
        'Sucursal no válida o no pertenece a la empresa.',
      );
    }
    return branch;
  }

  private async getRoomOrThrow(
    roomId: string,
    companyId: string,
    relations: string[] = [],
  ): Promise<DiningRoom> {
    const room = await this.diningRoomRepository.findOne({
      where: { id: roomId, companyId },
      relations,
    });
    if (!room) {
      throw new NotFoundException('Salón no encontrado.');
    }
    return room;
  }

  private async getOrderOrThrow(
    orderId: string,
    companyId: string,
  ): Promise<DiningOrder> {
    const order = await this.diningOrderRepository.findOne({
      where: { id: orderId, companyId },
      relations: ['lines', 'diningTable', 'diningRoom'],
    });
    if (!order) {
      throw new NotFoundException('Cuenta no encontrada.');
    }
    return order;
  }

  private async assertPreparadosReadyForBillOrCharge(
    order: DiningOrder,
    companyId: string,
  ): Promise<void> {
    const lines = (order.lines ?? []).filter(
      (l) => l.kitchenStatus !== KitchenItemStatus.CANCELLED,
    );
    if (lines.length === 0) return;

    const variantIds = [...new Set(lines.map((l) => l.productVariantId))];
    const variants = await this.productVariantRepository.find({
      where: { id: In(variantIds), companyId },
      relations: ['product'],
    });
    const productTypeByVariantId: Record<string, string | null | undefined> = {};
    for (const v of variants) {
      productTypeByVariantId[v.id] = v.product?.productType ?? null;
    }

    if (
      !canIssueBillOrCharge(
        lines.map((l) => ({
          productVariantId: l.productVariantId,
          kitchenStatus: l.kitchenStatus,
        })),
        productTypeByVariantId,
      )
    ) {
      throw new BadRequestException(
        'Hay productos PREPARADO pendientes de cocina. Espere a que estén listos antes de pedir cuenta o cobrar.',
      );
    }
  }

  private assertDiningItemProductType(productType: ProductType): void {
    this.productModeService.assertProductTypeAllowed(productType);
    if (!this.productModeService.isKaiFood()) {
      return;
    }
    const allowed =
      productType === ProductType.PREPARADO ||
      productType === ProductType.PHYSICAL ||
      productType === ProductType.ELABORADO ||
      productType === ProductType.MANUFACTURADO;
    if (!allowed) {
      throw new BadRequestException(
        'Solo productos PREPARADO, PHYSICAL, ELABORADO o MANUFACTURADO pueden agregarse a una cuenta de salón.',
      );
    }
  }

  /**
   * UP default de la variante en la sucursal (routing comanda).
   * Solo PREPARADO va a KDS y exige UP con purpose KITCHEN.
   * PHYSICAL / ELABORADO / MANUFACTURADO: null (cuenta sin cola cocina).
   */
  private async resolveProductionUnitId(
    variant: ProductVariant,
    branchId: string,
    companyId: string,
    productType: ProductType,
  ): Promise<string | null> {
    if (productType !== ProductType.PREPARADO) {
      return null;
    }

    const unitId =
      await this.productVariantsService.resolveDefaultProductionUnitId(
        variant.id,
        branchId,
        companyId,
      );
    if (!unitId) {
      throw new BadRequestException(
        'Falta unidad de producción para esta variante en la sucursal.',
      );
    }

    const unit = await this.productionUnitRepository.findOne({
      where: {
        id: unitId,
        companyId,
        isActive: true,
      },
    });
    if (!unit) {
      throw new BadRequestException(
        'La unidad de producción asignada a la variante no es válida o está inactiva.',
      );
    }
    if (unit.purpose !== ProductionUnitPurpose.KITCHEN) {
      throw new BadRequestException(
        'La unidad de producción de un PREPARADO debe ser de propósito Cocina (comanda / KDS).',
      );
    }
    return unit.id;
  }

  private lineSourceForOrder(kind: DiningOrderKind): LineSource {
    switch (kind) {
      case DiningOrderKind.TABLE:
        return LineSource.TABLE;
      case DiningOrderKind.COUNTER:
        return LineSource.COUNTER;
      case DiningOrderKind.TAKEAWAY:
        return LineSource.COUNTER;
      default:
        return LineSource.TABLE;
    }
  }

  private buildSessionPayload(order: DiningOrder): DiningSessionUpdatedPayload {
    return {
      companyId: order.companyId,
      branchId: order.branchId,
      salonId: order.diningRoomId ?? null,
      orderId: order.id,
      kind: order.kind,
      status: order.status,
      displayLabel: order.displayLabel,
      diningTableId: order.diningTableId ?? null,
      items: (order.lines ?? []).map((line) => ({
        id: line.id,
        productVariantId: line.productVariantId,
        quantity: Number(line.quantity),
        notes: line.notes ?? null,
        kitchenStatus: line.kitchenStatus,
        productionUnitId: line.productionUnitId ?? null,
        kitchenFireId: line.kitchenFireId ?? null,
        kitchenFireNumber: line.kitchenFireNumber ?? null,
      })),
    };
  }

  private buildKitchenItemPayload(
    order: DiningOrder,
    line: DiningOrderLine,
  ): DiningKitchenItemUpdatedPayload | null {
    if (!line.productionUnitId) {
      return null;
    }
    return {
      companyId: order.companyId,
      unitId: line.productionUnitId,
      orderId: order.id,
      lineId: line.id,
      kitchenStatus: line.kitchenStatus,
      kitchenFireId: line.kitchenFireId ?? null,
      kitchenFireNumber: line.kitchenFireNumber ?? null,
      displayLabel: order.displayLabel,
      diningTableId: order.diningTableId ?? null,
    };
  }

  private toSnapshotLine(line: DiningOrderLine): DiningKitchenSnapshotLinePayload {
    const variantLabel = kitchenVariantLabel(line.productVariant);
    const attributes = variantAttributesForKitchen(line.productVariant);
    return {
      id: line.id,
      diningOrderId: line.diningOrderId,
      productVariantId: line.productVariantId,
      quantity: Number(line.quantity),
      notes: line.notes ?? null,
      kitchenStatus: line.kitchenStatus,
      productionUnitId: line.productionUnitId ?? null,
      kitchenFireId: line.kitchenFireId ?? null,
      kitchenFireNumber: line.kitchenFireNumber ?? null,
      sentToKitchenAt: line.sentToKitchenAt?.toISOString() ?? null,
      displayLabel: line.diningOrder?.displayLabel,
      diningTableId: line.diningOrder?.diningTableId ?? null,
      diningTableCode: line.diningOrder?.diningTable?.code ?? null,
      productVariant: variantLabel
        ? {
            id: line.productVariant?.id ?? line.productVariantId,
            name: variantLabel,
            attributes,
          }
        : null,
    };
  }

  private publishSessionUpdated(order: DiningOrder): void {
    this.diningRealtimePublisher.emitSessionUpdated(
      this.buildSessionPayload(order),
    );
  }

  private publishKitchenItemUpdated(
    order: DiningOrder,
    line: DiningOrderLine,
  ): void {
    const payload = this.buildKitchenItemPayload(order, line);
    if (payload) {
      this.diningRealtimePublisher.emitKitchenItemUpdated(payload);
    }
  }

  private async publishKitchenSnapshotsForUnitIds(
    companyId: string,
    unitIds: Iterable<string | null | undefined>,
  ): Promise<void> {
    const uniqueUnitIds = [
      ...new Set(
        [...unitIds].filter((unitId): unitId is string => Boolean(unitId)),
      ),
    ];
    await Promise.all(
      uniqueUnitIds.map(async (unitId) => {
        const queue = await this.getKitchenQueue(unitId);
        this.diningRealtimePublisher.emitKitchenSnapshot({
          companyId,
          unitId,
          queue,
        });
      }),
    );
  }

  private async publishBoardForOrder(order: DiningOrder): Promise<void> {
    const kind = order.kind;
    if (
      kind !== DiningOrderKind.TAKEAWAY &&
      kind !== DiningOrderKind.COUNTER &&
      kind !== DiningOrderKind.TABLE
    ) {
      return;
    }
    try {
      await this.diningBoardService.publishBoardForBranch(
        order.companyId,
        order.branchId,
      );
    } catch (e) {
      // Board feed must not break kitchen/POS mutations.
      void e;
    }
  }

  private async assertCtpHardBlockAllowsFire(
    companyId: string,
    branchId: string,
    draftLines: DiningOrderLine[],
  ): Promise<void> {
    const qtyByVariant = new Map<string, number>();
    for (const line of draftLines) {
      const qty = Number(line.quantity) || 0;
      if (qty <= 0) continue;
      qtyByVariant.set(
        line.productVariantId,
        (qtyByVariant.get(line.productVariantId) ?? 0) + qty,
      );
    }
    if (qtyByVariant.size === 0) return;

    const results = await this.recipeCtpService.computeForVariants(
      companyId,
      [...qtyByVariant.keys()].map((variantId) => ({ variantId })),
      branchId,
    );
    const capByVariant = new Map(
      results.map((r) => [r.variantId, r.producibleQty] as const),
    );

    for (const [variantId, requestedQty] of qtyByVariant) {
      const cap = capByVariant.get(variantId);
      if (cap == null) continue;
      if (cap < requestedQty) {
        throw new BadRequestException(
          `CTP Hard Block: capacidad insuficiente para enviar a cocina (variante ${variantId}: Cap. ${cap}, pedido ${requestedQty}).`,
        );
      }
    }
  }

  private async assertNoActiveTableOrder(
    diningTableId: string,
    companyId: string,
  ): Promise<void> {
    const existing = await this.diningOrderRepository.findOne({
      where: {
        companyId,
        diningTableId,
        status: In(ACTIVE_ORDER_STATUSES),
      },
    });
    if (existing) {
      throw new ConflictException(
        'La mesa ya tiene una cuenta activa.',
      );
    }
  }

  // ─── F1: Rooms & tables ───────────────────────────────────────────────

  async findAllRooms(options?: {
    branchId?: string;
    includeInactive?: boolean;
  }): Promise<DiningRoom[]> {
    const companyId = this.requireCompanyId();
    const qb = this.diningRoomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.tables', 'tables')
      .where('room.companyId = :companyId', { companyId })
      .orderBy('room.name', 'ASC')
      .addOrderBy('tables.code', 'ASC');

    if (options?.branchId) {
      qb.andWhere('room.branchId = :branchId', { branchId: options.branchId });
    }
    if (!options?.includeInactive) {
      qb.andWhere('room.isActive = :isActive', { isActive: true });
    }

    return qb.getMany();
  }

  async findRoomById(id: string): Promise<DiningRoom | null> {
    const companyId = this.requireCompanyId();
    return this.diningRoomRepository.findOne({
      where: { id, companyId },
      relations: ['tables'],
      order: { tables: { code: 'ASC' } },
    });
  }

  async createRoom(data: {
    branchId: string;
    name: string;
    isActive?: boolean;
  }): Promise<DiningRoom> {
    const companyId = this.requireCompanyId();
    await this.assertBranchInCompany(data.branchId, companyId);

    const name = data.name.trim();
    if (!name) {
      throw new BadRequestException('El nombre del salón es obligatorio.');
    }

    const row = this.diningRoomRepository.create({
      companyId,
      branchId: data.branchId,
      name,
      isActive: data.isActive !== false,
      floorPlan: null,
    });
    return this.diningRoomRepository.save(row);
  }

  async updateRoom(
    id: string,
    data: Partial<{
      branchId: string;
      name: string;
      isActive: boolean;
    }>,
  ): Promise<DiningRoom> {
    const companyId = this.requireCompanyId();
    const room = await this.getRoomOrThrow(id, companyId);

    if (data.branchId !== undefined) {
      await this.assertBranchInCompany(data.branchId, companyId);
      room.branchId = data.branchId;
    }

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new BadRequestException('El nombre del salón es obligatorio.');
      }
      room.name = name;
    }

    if (data.isActive !== undefined) {
      room.isActive = data.isActive;
    }

    return this.diningRoomRepository.save(room);
  }

  async updateFloorPlan(
    roomId: string,
    floorPlan: Record<string, unknown> | null | undefined,
  ): Promise<DiningRoom> {
    const companyId = this.requireCompanyId();
    const room = await this.getRoomOrThrow(roomId, companyId);
    room.floorPlan = floorPlan ?? null;
    return this.diningRoomRepository.save(room);
  }

  async upsertTables(
    roomId: string,
    tables: UpsertDiningTableDto[],
  ): Promise<DiningRoom> {
    const companyId = this.requireCompanyId();
    const room = await this.getRoomOrThrow(roomId, companyId, ['tables']);

    const codes = tables.map((t) => t.code.trim());
    if (new Set(codes).size !== codes.length) {
      throw new BadRequestException(
        'Los códigos de mesa deben ser únicos dentro del salón.',
      );
    }

    const existingById = new Map(
      (room.tables ?? []).map((table) => [table.id, table]),
    );
    const incomingIds = new Set(
      tables.filter((t) => t.id).map((t) => t.id as string),
    );

    const toRemove = (room.tables ?? []).filter(
      (table) => !incomingIds.has(table.id),
    );
    if (toRemove.length > 0) {
      await this.diningTableRepository.remove(toRemove);
    }

    for (const dto of tables) {
      const code = dto.code.trim();
      const label = dto.label.trim();
      if (!code || !label) {
        throw new BadRequestException(
          'Código y etiqueta de mesa son obligatorios.',
        );
      }

      const payload = {
        diningRoomId: room.id,
        code,
        label,
        capacity: dto.capacity ?? 2,
        shape: dto.shape ?? TableShape.RECT,
        x: dto.x ?? 0,
        y: dto.y ?? 0,
        width: dto.width ?? 80,
        height: dto.height ?? 80,
        rotation: dto.rotation ?? 0,
        mergeGroupId: dto.mergeGroupId ?? null,
      };

      if (dto.id && existingById.has(dto.id)) {
        await this.diningTableRepository.update(dto.id, payload);
      } else {
        await this.diningTableRepository.save(
          this.diningTableRepository.create(payload),
        );
      }
    }

    return this.getRoomOrThrow(roomId, companyId, ['tables']);
  }

  // ─── F2: Orders ───────────────────────────────────────────────────────

  async openTable(data: {
    branchId: string;
    diningTableId: string;
    openedFrom: 'WAITER' | 'POS';
    profile?: DiningOrderProfile;
  }): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    await this.assertBranchInCompany(data.branchId, companyId);

    const settings = await this.diningOrderNumberService.getOrCreateSettings(
      data.branchId,
      companyId,
    );
    if (data.openedFrom === 'WAITER' && !settings.allowWaiterOpenTable) {
      throw new BadRequestException(
        'Esta sucursal no permite abrir mesas desde el mesero.',
      );
    }
    if (data.openedFrom === 'POS' && !settings.allowPosOpenTable) {
      throw new BadRequestException(
        'Esta sucursal no permite abrir mesas desde el POS.',
      );
    }

    const table = await this.diningTableRepository.findOne({
      where: { id: data.diningTableId },
      relations: ['diningRoom'],
    });
    if (!table?.diningRoom || table.diningRoom.companyId !== companyId) {
      throw new BadRequestException('Mesa no válida.');
    }
    if (table.diningRoom.branchId !== data.branchId) {
      throw new BadRequestException(
        'La mesa no pertenece a la sucursal indicada.',
      );
    }

    await this.assertNoActiveTableOrder(data.diningTableId, companyId);

    const displayLabel = `Mesa ${table.code}`;
    const order = this.diningOrderRepository.create({
      companyId,
      branchId: data.branchId,
      kind: DiningOrderKind.TABLE,
      diningTableId: table.id,
      diningRoomId: table.diningRoomId,
      displayLabel,
      openedByUserId: TenantContext.getUserId(),
      status: DiningOrderStatus.OPEN,
      profile: buildDiningOrderProfileOnOpen(displayLabel, data.profile),
      openedAt: new Date(),
    });

    const saved = await this.diningOrderRepository.save(order);
    this.publishSessionUpdated({ ...saved, lines: [] });
    return saved;
  }

  async openCounter(data: {
    branchId: string;
    profile?: DiningOrderProfile;
  }): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    await this.assertBranchInCompany(data.branchId, companyId);

    const allocated = await this.diningOrderNumberService.allocateNext(
      data.branchId,
      companyId,
      DiningOrderKind.COUNTER,
    );

    const order = this.diningOrderRepository.create({
      companyId,
      branchId: data.branchId,
      kind: DiningOrderKind.COUNTER,
      displayLabel: allocated.displayLabel,
      sequenceNumber: allocated.sequenceNumber,
      sequencePeriodKey: allocated.periodKey,
      openedByUserId: TenantContext.getUserId(),
      status: DiningOrderStatus.OPEN,
      profile: buildDiningOrderProfileOnOpen(allocated.displayLabel, data.profile),
      openedAt: new Date(),
    });

    const saved = await this.diningOrderRepository.save(order);
    this.publishSessionUpdated({ ...saved, lines: [] });
    return saved;
  }

  async openTakeaway(data: {
    branchId: string;
    profile?: DiningOrderProfile;
  }): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    await this.assertBranchInCompany(data.branchId, companyId);

    const allocated = await this.diningOrderNumberService.allocateNext(
      data.branchId,
      companyId,
      DiningOrderKind.TAKEAWAY,
    );

    const order = this.diningOrderRepository.create({
      companyId,
      branchId: data.branchId,
      kind: DiningOrderKind.TAKEAWAY,
      displayLabel: allocated.displayLabel,
      sequenceNumber: allocated.sequenceNumber,
      sequencePeriodKey: allocated.periodKey,
      openedByUserId: TenantContext.getUserId(),
      status: DiningOrderStatus.OPEN,
      profile: buildDiningOrderProfileOnOpen(allocated.displayLabel, data.profile),
      openedAt: new Date(),
    });

    const saved = await this.diningOrderRepository.save(order);
    this.publishSessionUpdated({ ...saved, lines: [] });
    return saved;
  }

  async getNumberingSettings(branchId: string) {
    const companyId = this.requireCompanyId();
    await this.assertBranchInCompany(branchId, companyId);
    const settings = await this.diningOrderNumberService.getOrCreateSettings(
      branchId,
      companyId,
    );
    return this.mapNumberingSettingsResponse(settings, companyId);
  }

  async updateNumberingSettings(
    branchId: string,
    patch: {
      timezone?: string;
      resetTimeLocal?: string;
      allowWaiterOpenTable?: boolean;
      allowPosOpenTable?: boolean;
      posAccountsMenuCategoryIds?: string[];
    },
  ) {
    const companyId = this.requireCompanyId();
    await this.assertBranchInCompany(branchId, companyId);
    if (patch.posAccountsMenuCategoryIds !== undefined) {
      await this.assertCategoriesInCompany(
        patch.posAccountsMenuCategoryIds,
        companyId,
      );
    }
    try {
      const settings = await this.diningOrderNumberService.updateSettings(
        branchId,
        companyId,
        patch,
      );
      return this.mapNumberingSettingsResponse(settings, companyId);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Configuración inválida';
      throw new BadRequestException(message);
    }
  }

  private async assertCategoriesInCompany(
    categoryIds: string[],
    companyId: string,
  ): Promise<void> {
    const ids = [
      ...new Set(
        categoryIds
          .map((id) => String(id ?? '').trim())
          .filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
      ),
    ];
    if (ids.length === 0) return;
    const found = await this.categoryRepository.find({
      where: { companyId, id: In(ids) },
      select: ['id'],
    });
    if (found.length !== ids.length) {
      throw new BadRequestException(
        'Una o más categorías no pertenecen a la empresa.',
      );
    }
  }

  private async mapNumberingSettingsResponse(
    settings: {
      branchId: string;
      companyId: string;
      timezone: string;
      resetTimeLocal: string;
      allowWaiterOpenTable: boolean;
      allowPosOpenTable: boolean;
      posAccountsMenuCategoryIds?: string[] | null;
    },
    companyId: string,
  ) {
    const configuredIds = Array.isArray(settings.posAccountsMenuCategoryIds)
      ? settings.posAccountsMenuCategoryIds
          .map((id) => String(id ?? '').trim())
          .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
      : [];

    const categoryQb = this.categoryRepository
      .createQueryBuilder('c')
      .where('c.companyId = :companyId', { companyId })
      .andWhere('c.deletedAt IS NULL')
      .andWhere('c.isActive = true')
      .orderBy('c.sortOrder', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .select(['c.id', 'c.name']);

    if (configuredIds.length > 0) {
      categoryQb.andWhere('c.id IN (:...configuredIds)', { configuredIds });
    }

    const categories = await categoryQb.getMany();
    const posAccountsMenuCategories = categories.map((c) => ({
      id: c.id,
      name: c.name,
    }));

    return {
      branchId: settings.branchId,
      companyId: settings.companyId,
      timezone: settings.timezone,
      resetTimeLocal: settings.resetTimeLocal,
      allowWaiterOpenTable: settings.allowWaiterOpenTable !== false,
      allowPosOpenTable: settings.allowPosOpenTable === true,
      posAccountsMenuCategoryIds: configuredIds,
      posAccountsMenuCategories,
    };
  }

  async updateOrderProfile(
    orderId: string,
    data: { customerName?: string },
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);

    if (order.status === DiningOrderStatus.CLOSED) {
      throw new BadRequestException(
        'No se puede renombrar una cuenta cerrada.',
      );
    }

    order.profile = mergeDiningOrderCustomerName(
      order.profile,
      data.customerName,
      order.displayLabel,
    );

    const saved = await this.diningOrderRepository.save(order);
    const detailed = await this.getOrderOrThrow(saved.id, companyId);
    this.publishSessionUpdated(detailed);
    await this.publishBoardForOrder(detailed);
    return detailed;
  }

  async addOrderItems(
    orderId: string,
    items: Array<{
      productVariantId: string;
      quantity: number;
      notes?: string;
    }>,
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);

    if (!canAddItems(order.status)) {
      throw new BadRequestException(
        `No se pueden agregar ítems a la cuenta en estado ${order.status}.`,
      );
    }

    const variantIds = items.map((item) => item.productVariantId);
    const variants = await this.productVariantRepository.find({
      where: { id: In(variantIds), companyId },
      relations: ['product'],
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const lines: DiningOrderLine[] = [];
    for (const item of items) {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new BadRequestException('Cantidad inválida.');
      }

      const variant = variantById.get(item.productVariantId);
      if (!variant?.product) {
        throw new BadRequestException(
          `Variante ${item.productVariantId} no encontrada.`,
        );
      }

      const productType = variant.product.productType;
      this.assertDiningItemProductType(productType);

      const activeInBranch =
        await this.productVariantsService.isVariantActiveInBranch(
          variant.id,
          order.branchId,
          companyId,
        );
      if (!activeInBranch) {
        throw new BadRequestException(
          'La variante no está activa en esta sucursal.',
        );
      }

      const productionUnitId = await this.resolveProductionUnitId(
        variant,
        order.branchId,
        companyId,
        productType,
      );

      lines.push(
        this.diningOrderLineRepository.create({
          diningOrderId: order.id,
          productVariantId: variant.id,
          quantity: qty,
          notes: item.notes?.trim() || null,
          productionUnitId,
          kitchenStatus: KitchenItemStatus.DRAFT,
          lineSource: this.lineSourceForOrder(order.kind),
        }),
      );
    }

    await this.diningOrderLineRepository.save(lines);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    return updated;
  }

  async sendToKitchen(
    orderId: string,
    lineIds?: string[],
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);
    const lines = order.lines ?? [];

    const draftLines = lines.filter((line) => {
      if (line.kitchenStatus !== KitchenItemStatus.DRAFT) return false;
      if (!line.productionUnitId) return false;
      if (!lineIds?.length) return true;
      return lineIds.includes(line.id);
    });

    if (draftLines.length === 0) {
      throw new BadRequestException(
        lineIds?.length
          ? 'Ninguna de las líneas indicadas está en borrador para enviar a cocina.'
          : 'No hay ítems en borrador para enviar a cocina.',
      );
    }

    await this.assertCtpHardBlockAllowsFire(companyId, order.branchId, draftLines);

    const allocated = await this.diningOrderNumberService.allocateNextKitchenFire(
      order.branchId,
      companyId,
    );
    const now = new Date();
    const stationOrderId = randomUUID();
    const sentByUserId = TenantContext.getUserId() ?? null;
    const stationOrder = this.diningStationOrderRepository.create({
      id: stationOrderId,
      companyId,
      branchId: order.branchId,
      diningOrderId: order.id,
      periodKey: allocated.periodKey,
      sequenceNumber: allocated.sequenceNumber,
      status: DiningStationOrderStatus.OPEN,
      sentAt: now,
      sentByUserId,
      completedAt: null,
    });
    await this.diningStationOrderRepository.save(stationOrder);

    for (const line of draftLines) {
      line.kitchenStatus = KitchenItemStatus.SENT;
      line.sentToKitchenAt = now;
      line.stationOrderId = stationOrderId;
      line.kitchenFireId = stationOrderId;
      line.kitchenFireNumber = allocated.sequenceNumber;
    }
    await this.diningOrderLineRepository.save(draftLines);

    order.status = recomputeOrderStatusFromLines(order.status, lines);
    await this.diningOrderRepository.save(order);

    try {
      const userId = this.requireUserId();
      await this.diningMaterialReservation.reserveForFiredLines(
        order,
        draftLines,
        userId,
      );
    } catch (err) {
      // Fire no bloqueante: la comanda ya está SENT.
    }

    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    for (const line of draftLines) {
      const refreshed = (updated.lines ?? []).find((l) => l.id === line.id) ?? line;
      this.publishKitchenItemUpdated(updated, refreshed);
    }
    await this.publishKitchenSnapshotsForUnitIds(
      companyId,
      draftLines.map((line) => line.productionUnitId),
    );
    await this.publishBoardForOrder(updated);

    const fireNumber =
      draftLines.find((l) => typeof l.kitchenFireNumber === 'number')
        ?.kitchenFireNumber ?? null;
    const itemCount = draftLines.length;
    void this.webPushSender
      .sendToCompanyClient({
        companyId,
        clientApp: 'kds',
        productionUnitIds: draftLines.map((l) => l.productionUnitId),
        payload: {
          title: `Nuevo pedido · ${updated.displayLabel}`,
          body:
            fireNumber != null
              ? `Pedido #${fireNumber} · ${itemCount} ítem(s)`
              : `${itemCount} ítem(s) a preparar`,
          data: {
            url: '/queue',
            kind: 'dining.kitchen.sent',
            orderId: updated.id,
            kitchenFireNumber: fireNumber,
          },
        },
      })
      .catch(() => {});

    return updated;
  }

  async markKitchenItemReady(
    orderId: string,
    lineId: string,
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);
    const line = (order.lines ?? []).find((l) => l.id === lineId);
    if (!line) {
      throw new NotFoundException('Línea de comanda no encontrada.');
    }
    const unitId = line.productionUnitId?.trim();
    if (!unitId) {
      throw new BadRequestException(
        'La línea no tiene unidad de producción; no se puede marcar listo.',
      );
    }
    return this.markKitchenLinesReady(orderId, [lineId], unitId);
  }

  /**
   * Marca varias líneas READY en un gesto y publica **una** notificación:
   * item_ready si quedan pendientes en el fire+UP; order_ready si era el último.
   */
  async markKitchenLinesReady(
    orderId: string,
    lineIds: string[],
    productionUnitId: string,
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const unitId = productionUnitId?.trim();
    if (!unitId) {
      throw new BadRequestException('productionUnitId es obligatorio.');
    }
    const ids = [
      ...new Set(
        (lineIds ?? []).map((id) => String(id).trim()).filter(Boolean),
      ),
    ];
    if (ids.length === 0) {
      throw new BadRequestException('lineIds es obligatorio.');
    }

    const order = await this.getOrderOrThrow(orderId, companyId);
    const targets = (order.lines ?? []).filter((l) => ids.includes(l.id));
    if (targets.length !== ids.length) {
      throw new NotFoundException(
        'Una o más líneas de comanda no pertenecen a esta cuenta.',
      );
    }
    for (const line of targets) {
      if (line.productionUnitId !== unitId) {
        throw new BadRequestException(
          'Todas las líneas deben pertenecer a la misma unidad de producción.',
        );
      }
      if (!canMarkReady(line.kitchenStatus)) {
        throw new BadRequestException(
          'Un ítem no puede marcarse como listo en su estado actual.',
        );
      }
    }

    const fireIds = new Set(
      targets.map((l) => effectiveKitchenFireId(l)),
    );
    if (fireIds.size !== 1) {
      throw new BadRequestException(
        'Las líneas deben pertenecer al mismo pedido (tanda) de cocina.',
      );
    }
    const fireId = [...fireIds][0]!;

    const now = new Date();
    for (const line of targets) {
      line.kitchenStatus = KitchenItemStatus.READY;
      line.readyAt = now;
    }
    await this.diningOrderLineRepository.save(targets);

    await this.syncStationOrderStatusFromLines(
      targets[0]?.stationOrderId ?? targets[0]?.kitchenFireId ?? fireId,
    );

    order.status = recomputeOrderStatusFromLines(
      order.status,
      order.lines ?? [],
    );
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    for (const line of targets) {
      const refreshed =
        (updated.lines ?? []).find((l) => l.id === line.id) ?? line;
      this.publishKitchenItemUpdated(updated, refreshed);
    }
    await this.publishKitchenSnapshotsForUnitIds(companyId, [unitId]);

    await this.emitKitchenReadyNotification({
      companyId,
      order: updated,
      productionUnitId: unitId,
      fireId,
      markedLineIds: ids,
      forceOrderReady: false,
    });
    await this.publishBoardForOrder(updated);

    return updated;
  }

  async markKitchenFireReady(
    orderId: string,
    fireId: string,
    productionUnitId: string,
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const unitId = productionUnitId?.trim();
    if (!unitId) {
      throw new BadRequestException('productionUnitId es obligatorio.');
    }
    const order = await this.getOrderOrThrow(orderId, companyId);
    const targets = selectLinesForKitchenFireReady(
      order.lines ?? [],
      fireId,
      unitId,
    );
    if (targets.length === 0) {
      throw new BadRequestException(
        'No hay ítems de este pedido pendientes de listo en la unidad de producción.',
      );
    }

    const now = new Date();
    for (const line of targets) {
      line.kitchenStatus = KitchenItemStatus.READY;
      line.readyAt = now;
    }
    await this.diningOrderLineRepository.save(targets);

    await this.syncStationOrderStatusFromLines(
      targets[0]?.stationOrderId ??
        targets[0]?.kitchenFireId ??
        fireId,
    );

    order.status = recomputeOrderStatusFromLines(
      order.status,
      order.lines ?? [],
    );
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    for (const line of targets) {
      const refreshed =
        (updated.lines ?? []).find((l) => l.id === line.id) ?? line;
      this.publishKitchenItemUpdated(updated, refreshed);
    }
    await this.publishKitchenSnapshotsForUnitIds(companyId, [unitId]);

    const resolvedFireId = effectiveKitchenFireId(targets[0]!);
    await this.emitKitchenReadyNotification({
      companyId,
      order: updated,
      productionUnitId: unitId,
      fireId: resolvedFireId,
      markedLineIds: targets.map((l) => l.id),
      forceOrderReady: true,
    });
    await this.publishBoardForOrder(updated);
    return updated;
  }

  /**
   * POS / pickup: promote fire lines READY → READY_FOR_PICKUP (Kai Board + TTS).
   */
  async markKitchenFireReadyForPickup(
    orderId: string,
    fireId: string,
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const targetFire = fireId?.trim();
    if (!targetFire) {
      throw new BadRequestException('fireId es obligatorio.');
    }
    const order = await this.getOrderOrThrow(orderId, companyId);
    const targets = (order.lines ?? []).filter(
      (l) =>
        effectiveKitchenFireId(l) === targetFire &&
        canMarkReadyForPickup(l.kitchenStatus),
    );
    if (targets.length === 0) {
      throw new BadRequestException(
        'No hay ítems listos en cocina para marcar listo para retirar.',
      );
    }

    for (const line of targets) {
      line.kitchenStatus = KitchenItemStatus.READY_FOR_PICKUP;
    }
    await this.diningOrderLineRepository.save(targets);

    await this.syncStationOrderStatusFromLines(
      targets[0]?.stationOrderId ?? targets[0]?.kitchenFireId ?? targetFire,
    );

    order.status = recomputeOrderStatusFromLines(
      order.status,
      order.lines ?? [],
    );
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    for (const line of targets) {
      const refreshed =
        (updated.lines ?? []).find((l) => l.id === line.id) ?? line;
      this.publishKitchenItemUpdated(updated, refreshed);
    }
    await this.publishKitchenSnapshotsForUnitIds(
      companyId,
      targets.map((l) => l.productionUnitId),
    );

    await this.publishBoardForOrder(updated);
    return updated;
  }

  /**
   * POS: marca entregado (SERVED) todas las líneas READY_FOR_PICKUP de un fire → sale de Kai Board.
   */
  async markKitchenFireDelivered(
    orderId: string,
    fireId: string,
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const targetFire = fireId?.trim();
    if (!targetFire) {
      throw new BadRequestException('fireId es obligatorio.');
    }
    const order = await this.getOrderOrThrow(orderId, companyId);
    const targets = (order.lines ?? []).filter(
      (l) =>
        effectiveKitchenFireId(l) === targetFire &&
        canMarkServed(l.kitchenStatus, order.kind),
    );
    if (targets.length === 0) {
      const hasKitchenReady = (order.lines ?? []).some(
        (l) =>
          effectiveKitchenFireId(l) === targetFire &&
          l.kitchenStatus === KitchenItemStatus.READY,
      );
      if (
        hasKitchenReady &&
        order.kind !== DiningOrderKind.TABLE
      ) {
        throw new BadRequestException(
          'Marcá primero listo para retirar antes de entregar (mostrador / para llevar).',
        );
      }
      throw new BadRequestException(
        'No hay ítems listos para marcar como entregados en este pedido.',
      );
    }

    const now = new Date();
    for (const line of targets) {
      line.kitchenStatus = KitchenItemStatus.SERVED;
      line.servedAt = now;
    }
    await this.diningOrderLineRepository.save(targets);

    await this.syncStationOrderStatusFromLines(
      targets[0]?.stationOrderId ?? targets[0]?.kitchenFireId ?? targetFire,
    );

    order.status = recomputeOrderStatusFromLines(
      order.status,
      order.lines ?? [],
    );
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    for (const line of targets) {
      const refreshed =
        (updated.lines ?? []).find((l) => l.id === line.id) ?? line;
      this.publishKitchenItemUpdated(updated, refreshed);
    }
    await this.publishKitchenSnapshotsForUnitIds(
      companyId,
      targets.map((l) => l.productionUnitId),
    );
    await this.publishBoardForOrder(updated);
    return updated;
  }

  private async emitKitchenReadyNotification(params: {
    companyId: string;
    order: DiningOrder;
    productionUnitId: string;
    fireId: string;
    markedLineIds: string[];
    forceOrderReady: boolean;
  }): Promise<void> {
    const lines = params.order.lines ?? [];
    const pendingLeft = countPendingKitchenLines(
      lines,
      params.fireId,
      params.productionUnitId,
    );
    const asOrder = params.forceOrderReady || pendingLeft === 0;

    const summarySourceLines = asOrder
      ? selectReadyLinesForKitchenFire(
          lines,
          params.fireId,
          params.productionUnitId,
        )
      : lines.filter((l) => params.markedLineIds.includes(l.id));

    const withVariants = await this.loadLinesWithVariants(
      summarySourceLines.map((l) => l.id),
    );
    const items =
      this.diningReadyNotification.buildKitchenItemSummaries(withVariants);
    const fireNumber =
      summarySourceLines.find((l) => typeof l.kitchenFireNumber === 'number')
        ?.kitchenFireNumber ??
      lines.find((l) => effectiveKitchenFireId(l) === params.fireId)
        ?.kitchenFireNumber ??
      null;
    const actorUserId = TenantContext.getUserId() ?? null;
    let sentByUserId: string | null = null;
    const fireId = params.fireId?.trim();
    if (fireId) {
      const station = await this.diningStationOrderRepository.findOne({
        where: { id: fireId, companyId: params.companyId },
      });
      sentByUserId = station?.sentByUserId?.trim() || null;
    }

    if (asOrder) {
      await this.diningReadyNotification.publishOrderReady({
        companyId: params.companyId,
        order: params.order,
        productionUnitId: params.productionUnitId,
        fireId: params.fireId,
        fireNumber,
        items,
        actorUserId,
        sentByUserId,
      });
      return;
    }

    await this.diningReadyNotification.publishItemReady({
      companyId: params.companyId,
      order: params.order,
      productionUnitId: params.productionUnitId,
      fireId: params.fireId,
      fireNumber,
      items,
      actorUserId,
      sentByUserId,
    });
  }

  private async loadLinesWithVariants(
    lineIds: string[],
  ): Promise<DiningOrderLine[]> {
    const ids = [...new Set(lineIds.filter(Boolean))];
    if (ids.length === 0) return [];
    return this.diningOrderLineRepository.find({
      where: { id: In(ids) },
      relations: ['productVariant', 'productVariant.product'],
    });
  }

  async markItemServed(
    orderId: string,
    lineId: string,
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);
    const line = (order.lines ?? []).find((l) => l.id === lineId);
    if (!line) {
      throw new NotFoundException('Línea de comanda no encontrada.');
    }
    if (!canMarkServed(line.kitchenStatus, order.kind)) {
      throw new BadRequestException(
        'El ítem no puede marcarse como servido en su estado actual.',
      );
    }

    line.kitchenStatus = KitchenItemStatus.SERVED;
    line.servedAt = new Date();
    await this.diningOrderLineRepository.save(line);

    order.status = recomputeOrderStatusFromLines(
      order.status,
      order.lines ?? [],
    );
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    const updatedLine = (updated.lines ?? []).find((l) => l.id === lineId);
    if (updatedLine) {
      this.publishKitchenItemUpdated(updated, updatedLine);
      await this.publishKitchenSnapshotsForUnitIds(companyId, [
        updatedLine.productionUnitId ?? line.productionUnitId,
      ]);
    }
    await this.publishBoardForOrder(updated);
    return updated;
  }

  async requestBill(orderId: string): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);

    if (order.status === DiningOrderStatus.BILLING) {
      return order;
    }

    if (!canRequestBill(order.status)) {
      throw new BadRequestException(
        'La cuenta no puede pasar a cobro en su estado actual.',
      );
    }

    await this.assertPreparadosReadyForBillOrCharge(order, companyId);

    order.status = DiningOrderStatus.BILLING;
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    return updated;
  }

  async reopenOrder(orderId: string): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);

    if (order.status !== DiningOrderStatus.BILLING) {
      throw new BadRequestException(
        'Solo se puede reabrir una cuenta en estado Por cobrar.',
      );
    }

    order.status = reopenFromBilling(order.lines ?? []);
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    return updated;
  }

  /**
   * Cierra una cuenta vacía (sin ítems activos): libera mesa o elimina
   * cuenta de barra / para llevar sin pasar por cobro.
   */
  async abandonEmptyOrder(orderId: string): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);

    if (order.status === DiningOrderStatus.CLOSED) {
      throw new BadRequestException('La cuenta ya está cerrada.');
    }
    if (
      order.status !== DiningOrderStatus.OPEN &&
      order.status !== DiningOrderStatus.SENT
    ) {
      throw new BadRequestException(
        'Solo se puede cerrar o eliminar una cuenta vacía en estado abierta.',
      );
    }

    const activeLines = (order.lines ?? []).filter(
      (line) => line.kitchenStatus !== KitchenItemStatus.CANCELLED,
    );
    if (activeLines.length > 0) {
      throw new BadRequestException(
        'La cuenta tiene ítems. Quitá todos los productos antes de cerrarla o eliminarla.',
      );
    }

    order.status = DiningOrderStatus.CLOSED;
    order.closedAt = new Date();
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    return updated;
  }

  async updateOrderLineNotes(
    orderId: string,
    lineId: string,
    data: { notes?: string | null },
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);

    if (order.status === DiningOrderStatus.CLOSED) {
      throw new BadRequestException('La cuenta está cerrada.');
    }
    if (!canAddItems(order.status)) {
      throw new BadRequestException(
        `No se pueden editar notas en estado ${order.status}.`,
      );
    }

    const line = (order.lines ?? []).find((l) => l.id === lineId);
    if (!line) {
      throw new NotFoundException('Línea de comanda no encontrada.');
    }
    if (line.kitchenStatus !== KitchenItemStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden editar notas de ítems en borrador.',
      );
    }

    const raw = data.notes;
    line.notes =
      raw == null ? null : String(raw).trim() ? String(raw).trim() : null;
    await this.diningOrderLineRepository.save(line);

    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    return updated;
  }

  async cancelOrderItem(
    orderId: string,
    lineId: string,
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);
    const line = (order.lines ?? []).find((l) => l.id === lineId);
    if (!line) {
      throw new NotFoundException('Línea de comanda no encontrada.');
    }
    if (!canCancelLine(line.kitchenStatus)) {
      throw new BadRequestException(
        'El ítem no puede cancelarse en su estado actual.',
      );
    }

    try {
      await this.diningMaterialReservation.releaseForLine(line);
    } catch {
      // Continuar con cancel operativo.
    }

    line.kitchenStatus = KitchenItemStatus.CANCELLED;
    await this.diningOrderLineRepository.save(line);

    await this.syncStationOrderStatusFromLines(
      line.stationOrderId ?? line.kitchenFireId ?? null,
    );

    order.status = recomputeOrderStatusFromLines(
      order.status,
      order.lines ?? [],
    );
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    const updatedLine = (updated.lines ?? []).find((l) => l.id === lineId);
    this.publishSessionUpdated(updated);
    if (updatedLine) {
      this.publishKitchenItemUpdated(updated, updatedLine);
      await this.publishKitchenSnapshotsForUnitIds(companyId, [
        updatedLine.productionUnitId ?? line.productionUnitId,
      ]);
    }
    await this.publishBoardForOrder(updated);
    return updated;
  }

  async transferCartLine(data: {
    diningOrderId: string;
    productVariantId: string;
    quantity: number;
    notes?: string;
  }): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(data.diningOrderId, companyId);

    if (!canAddItems(order.status)) {
      throw new BadRequestException(
        `La cuenta destino no acepta ítems en estado ${order.status}.`,
      );
    }

    const qty = Number(data.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new BadRequestException('Cantidad inválida.');
    }

    const variant = await this.productVariantRepository.findOne({
      where: { id: data.productVariantId, companyId },
      relations: ['product'],
    });
    if (!variant?.product) {
      throw new BadRequestException('Variante no encontrada.');
    }

    this.assertDiningItemProductType(variant.product.productType);

    const activeInBranch =
      await this.productVariantsService.isVariantActiveInBranch(
        variant.id,
        order.branchId,
        companyId,
      );
    if (!activeInBranch) {
      throw new BadRequestException(
        'La variante no está activa en esta sucursal.',
      );
    }

    const productionUnitId = await this.resolveProductionUnitId(
      variant,
      order.branchId,
      companyId,
      variant.product.productType,
    );

    await this.diningOrderLineRepository.save(
      this.diningOrderLineRepository.create({
        diningOrderId: order.id,
        productVariantId: variant.id,
        quantity: qty,
        notes: data.notes?.trim() || null,
        productionUnitId,
        kitchenStatus: KitchenItemStatus.DRAFT,
        lineSource: LineSource.COUNTER,
      }),
    );

    const updated = await this.getOrderOrThrow(data.diningOrderId, companyId);
    this.publishSessionUpdated(updated);
    return updated;
  }

  async closeDiningOrder(
    orderId: string,
    linkedTransactionId?: string,
  ): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);

    if (order.status === DiningOrderStatus.CLOSED) {
      throw new BadRequestException('La cuenta ya está cerrada.');
    }

    await this.assertPreparadosReadyForBillOrCharge(order, companyId);

    order.status = DiningOrderStatus.CLOSED;
    order.closedAt = new Date();
    if (linkedTransactionId) {
      order.linkedTransactionId = linkedTransactionId;
      const userId = this.requireUserId();
      await this.diningBackflushService.backflushForClosedOrder(
        order,
        linkedTransactionId,
        userId,
      );
    }

    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    return updated;
  }

  async listActiveOrders(options?: {
    branchId?: string;
    kind?: DiningOrderKind;
    status?: DiningOrderStatus;
  }): Promise<DiningOrder[]> {
    const companyId = this.requireCompanyId();
    const qb = this.diningOrderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.lines', 'lines')
      .leftJoinAndSelect('order.diningTable', 'diningTable')
      .leftJoinAndSelect('order.diningRoom', 'diningRoom')
      .where('order.companyId = :companyId', { companyId })
      .orderBy('order.openedAt', 'DESC');

    if (options?.branchId) {
      qb.andWhere('order.branchId = :branchId', {
        branchId: options.branchId,
      });
    }
    if (options?.kind) {
      qb.andWhere('order.kind = :kind', { kind: options.kind });
    }
    if (options?.status) {
      qb.andWhere('order.status = :status', { status: options.status });
    } else {
      qb.andWhere('order.status != :closed', {
        closed: DiningOrderStatus.CLOSED,
      });
    }

    return qb.getMany();
  }

  async getOrderDetail(orderId: string): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    return this.getOrderOrThrow(orderId, companyId);
  }

  async getKitchenQueue(
    productionUnitId: string,
  ): Promise<DiningKitchenSnapshotLinePayload[]> {
    return this.getProductionUnitQueue(productionUnitId);
  }

  async getProductionUnitQueue(
    productionUnitId: string,
  ): Promise<DiningKitchenSnapshotLinePayload[]> {
    const companyId = this.requireCompanyId();

    const unit = await this.productionUnitRepository.findOne({
      where: { id: productionUnitId, companyId },
    });
    if (!unit) {
      throw new NotFoundException('Unidad de producción no encontrada.');
    }

    const lines = await this.diningOrderLineRepository
      .createQueryBuilder('line')
      .leftJoinAndSelect('line.diningOrder', 'order')
      .leftJoinAndSelect('order.diningTable', 'diningTable')
      .leftJoinAndSelect('line.productVariant', 'productVariant')
      .leftJoinAndSelect('productVariant.product', 'product')
      .where('line.productionUnitId = :productionUnitId', { productionUnitId })
      .andWhere('line.kitchenStatus IN (:...statuses)', {
        statuses: PRODUCTION_UNIT_QUEUE_STATUSES,
      })
      .andWhere('order.companyId = :companyId', { companyId })
      .andWhere('order.status != :closed', {
        closed: DiningOrderStatus.CLOSED,
      })
      .orderBy('line.sentToKitchenAt', 'ASC', 'NULLS LAST')
      .getMany();

    // READY solo se muestra mientras el fire+UP aún tenga pendientes (SENT/PREPARING).
    const pendingFireIds = new Set(
      lines
        .filter(
          (l) =>
            l.kitchenStatus === KitchenItemStatus.SENT ||
            l.kitchenStatus === KitchenItemStatus.PREPARING,
        )
        .map((l) => l.stationOrderId?.trim() || l.kitchenFireId?.trim() || l.id),
    );
    const visible = lines.filter((l) => {
      if (
        l.kitchenStatus === KitchenItemStatus.SENT ||
        l.kitchenStatus === KitchenItemStatus.PREPARING
      ) {
        return true;
      }
      if (l.kitchenStatus === KitchenItemStatus.READY) {
        return pendingFireIds.has(
          l.stationOrderId?.trim() || l.kitchenFireId?.trim() || l.id,
        );
      }
      return false;
    });

    return visible.map((line) => this.toSnapshotLine(line));
  }

  async getProductionUnitHistory(
    productionUnitId: string,
  ): Promise<ProductionUnitHistoryOrderDto[]> {
    const companyId = this.requireCompanyId();
    const unit = await this.productionUnitRepository.findOne({
      where: { id: productionUnitId, companyId },
    });
    if (!unit) {
      throw new NotFoundException('Unidad de producción no encontrada.');
    }

    const branchId = unit.branchId?.trim() || null;

    let periodKey: string | null = null;
    if (branchId) {
      const settings =
        await this.diningOrderNumberService.getOrCreateSettings(
          branchId,
          companyId,
        );
      periodKey = diningBusinessPeriodKey(
        new Date(),
        settings.timezone,
        settings.resetTimeLocal,
      );
    } else {
      // Fallback: infer branch from a recent line of this UP.
      const sampleLine = await this.diningOrderLineRepository.findOne({
        where: { productionUnitId },
        relations: ['diningOrder'],
        order: { sentToKitchenAt: 'DESC' },
      });
      const inferredBranch = sampleLine?.diningOrder?.branchId?.trim();
      if (inferredBranch) {
        const settings =
          await this.diningOrderNumberService.getOrCreateSettings(
            inferredBranch,
            companyId,
          );
        periodKey = diningBusinessPeriodKey(
          new Date(),
          settings.timezone,
          settings.resetTimeLocal,
        );
      }
    }

    const qb = this.diningStationOrderRepository
      .createQueryBuilder('so')
      .innerJoinAndSelect('so.diningOrder', 'order')
      .leftJoinAndSelect('order.diningTable', 'diningTable')
      .innerJoinAndSelect(
        'so.lines',
        'line',
        'line.productionUnitId = :productionUnitId',
        { productionUnitId },
      )
      .leftJoinAndSelect('line.productVariant', 'productVariant')
      .leftJoinAndSelect('productVariant.product', 'product')
      .where('so.companyId = :companyId', { companyId })
      .andWhere('line.kitchenStatus != :draft', {
        draft: KitchenItemStatus.DRAFT,
      })
      .orderBy('so.sentAt', 'DESC');

    if (periodKey) {
      qb.andWhere('so.periodKey = :periodKey', { periodKey });
    }

    const stationOrders = await qb.getMany();

    return stationOrders.map((so) => {
      const unitLines = (so.lines ?? []).filter(
        (l) => l.productionUnitId === productionUnitId,
      );
      const items: ProductionUnitHistoryItemDto[] = unitLines.map((line) => ({
        id: line.id,
        quantity: Number(line.quantity),
        notes: line.notes ?? null,
        kitchenStatus: line.kitchenStatus,
        sentToKitchenAt: line.sentToKitchenAt?.toISOString() ?? null,
        readyAt: line.readyAt?.toISOString() ?? null,
        prepDurationMs: itemPrepDurationMs({
          sentToKitchenAt: line.sentToKitchenAt,
          readyAt: line.readyAt,
        }),
        productVariant: {
          id: line.productVariantId,
          name:
            kitchenVariantLabel(line.productVariant) ?? line.productVariantId,
          attributes: variantAttributesForKitchen(line.productVariant),
        },
      }));

      return {
        id: so.id,
        sequenceNumber: so.sequenceNumber,
        periodKey: so.periodKey,
        status: so.status,
        sentAt: so.sentAt.toISOString(),
        completedAt: so.completedAt?.toISOString() ?? null,
        diningOrderId: so.diningOrderId,
        displayLabel: so.diningOrder?.displayLabel ?? 'Cuenta',
        diningTableCode: so.diningOrder?.diningTable?.code ?? null,
        prepDurationMs: stationOrderPrepDurationMsForUnit(unitLines),
        items,
      };
    });
  }

  /**
   * Actualiza status/completedAt del pedido de estación según todas sus líneas.
   */
  private async syncStationOrderStatusFromLines(
    stationOrderId: string | null | undefined,
  ): Promise<void> {
    const id = stationOrderId?.trim();
    if (!id) return;

    const stationOrder = await this.diningStationOrderRepository.findOne({
      where: { id },
    });
    if (!stationOrder) return;

    const lines = await this.diningOrderLineRepository.find({
      where: [{ stationOrderId: id }, { kitchenFireId: id }],
    });
    // Deduplicate by id (OR query may overlap).
    const byId = new Map(lines.map((l) => [l.id, l]));
    const unique = [...byId.values()];
    if (unique.length === 0) return;

    const nextStatus = deriveStationOrderStatus(
      unique.map((l) => l.kitchenStatus),
    );
    stationOrder.status = nextStatus;
    if (
      nextStatus === DiningStationOrderStatus.COMPLETED ||
      nextStatus === DiningStationOrderStatus.CANCELLED
    ) {
      stationOrder.completedAt = stationOrder.completedAt ?? new Date();
    } else {
      stationOrder.completedAt = null;
    }
    await this.diningStationOrderRepository.save(stationOrder);
  }
}
