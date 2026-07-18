import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantsService } from '@modules/product-variants/application/product-variants.service';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
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
import {
  DiningOrderKind,
  DiningOrderStatus,
  KitchenItemStatus,
  LineSource,
  TableShape,
} from '../domain/dining.enums';
import {
  canAddItems,
  canCancelLine,
  canMarkReady,
  canMarkServed,
  canRequestBill,
  reopenFromBilling,
  recomputeOrderStatusFromLines,
} from './dining-order-status.util';
import {
  buildDiningOrderProfileOnOpen,
  mergeDiningOrderCustomerName,
} from './dining-order-profile.util';
import { DiningBackflushService } from './dining-backflush.service';
import { DiningOrderNumberService } from './dining-order-number.service';
import { UpsertDiningTableDto } from './dto/upsert-dining-tables.dto';

const ACTIVE_ORDER_STATUSES: DiningOrderStatus[] = [
  DiningOrderStatus.OPEN,
  DiningOrderStatus.SENT,
  DiningOrderStatus.PARTIAL_READY,
  DiningOrderStatus.READY,
  DiningOrderStatus.BILLING,
];

const KITCHEN_QUEUE_STATUSES: KitchenItemStatus[] = [
  KitchenItemStatus.SENT,
  KitchenItemStatus.PREPARING,
];

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
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(ProductionUnit)
    private readonly productionUnitRepository: Repository<ProductionUnit>,
    private readonly productVariantsService: ProductVariantsService,
    private readonly productModeService: ProductModeService,
    private readonly diningRealtimePublisher: DiningRealtimePublisher,
    private readonly diningBackflushService: DiningBackflushService,
    private readonly diningOrderNumberService: DiningOrderNumberService,
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
      displayLabel: order.displayLabel,
      diningTableId: order.diningTableId ?? null,
    };
  }

  private toSnapshotLine(line: DiningOrderLine): DiningKitchenSnapshotLinePayload {
    return {
      id: line.id,
      diningOrderId: line.diningOrderId,
      productVariantId: line.productVariantId,
      quantity: Number(line.quantity),
      notes: line.notes ?? null,
      kitchenStatus: line.kitchenStatus,
      productionUnitId: line.productionUnitId ?? null,
      sentToKitchenAt: line.sentToKitchenAt?.toISOString() ?? null,
      displayLabel: line.diningOrder?.displayLabel,
      diningTableId: line.diningOrder?.diningTableId ?? null,
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
          queue: queue.map((line) => this.toSnapshotLine(line)),
        });
      }),
    );
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
    return {
      branchId: settings.branchId,
      companyId: settings.companyId,
      timezone: settings.timezone,
      resetTimeLocal: settings.resetTimeLocal,
      allowWaiterOpenTable: settings.allowWaiterOpenTable !== false,
      allowPosOpenTable: settings.allowPosOpenTable === true,
    };
  }

  async updateNumberingSettings(
    branchId: string,
    patch: {
      timezone?: string;
      resetTimeLocal?: string;
      allowWaiterOpenTable?: boolean;
      allowPosOpenTable?: boolean;
    },
  ) {
    const companyId = this.requireCompanyId();
    await this.assertBranchInCompany(branchId, companyId);
    try {
      const settings = await this.diningOrderNumberService.updateSettings(
        branchId,
        companyId,
        patch,
      );
      return {
        branchId: settings.branchId,
        companyId: settings.companyId,
        timezone: settings.timezone,
        resetTimeLocal: settings.resetTimeLocal,
        allowWaiterOpenTable: settings.allowWaiterOpenTable !== false,
        allowPosOpenTable: settings.allowPosOpenTable === true,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Configuración inválida';
      throw new BadRequestException(message);
    }
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

    const wasBilling = order.status === DiningOrderStatus.BILLING;

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
    let updated = await this.getOrderOrThrow(orderId, companyId);
    if (wasBilling) {
      updated.status = reopenFromBilling(updated.lines ?? []);
      await this.diningOrderRepository.save(updated);
      updated = await this.getOrderOrThrow(orderId, companyId);
    }
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

    const now = new Date();
    for (const line of draftLines) {
      line.kitchenStatus = KitchenItemStatus.SENT;
      line.sentToKitchenAt = now;
    }
    await this.diningOrderLineRepository.save(draftLines);

    order.status = recomputeOrderStatusFromLines(order.status, lines);
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
    for (const line of draftLines) {
      this.publishKitchenItemUpdated(updated, line);
    }
    await this.publishKitchenSnapshotsForUnitIds(
      companyId,
      draftLines.map((line) => line.productionUnitId),
    );
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
    if (!canMarkReady(line.kitchenStatus)) {
      throw new BadRequestException(
        'El ítem no puede marcarse como listo en su estado actual.',
      );
    }

    line.kitchenStatus = KitchenItemStatus.READY;
    line.readyAt = new Date();
    await this.diningOrderLineRepository.save(line);

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
        updatedLine.productionUnitId,
      ]);
    }
    return updated;
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
    if (!canMarkServed(line.kitchenStatus)) {
      throw new BadRequestException(
        'El ítem no puede marcarse como servido en su estado actual.',
      );
    }

    line.kitchenStatus = KitchenItemStatus.SERVED;
    line.servedAt = new Date();
    await this.diningOrderLineRepository.save(line);
    return this.getOrderOrThrow(orderId, companyId);
  }

  async requestBill(orderId: string): Promise<DiningOrder> {
    const companyId = this.requireCompanyId();
    const order = await this.getOrderOrThrow(orderId, companyId);

    if (!canRequestBill(order.status)) {
      throw new BadRequestException(
        'La cuenta no puede pasar a cobro en su estado actual.',
      );
    }

    order.status = DiningOrderStatus.BILLING;
    await this.diningOrderRepository.save(order);
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

    line.kitchenStatus = KitchenItemStatus.CANCELLED;
    await this.diningOrderLineRepository.save(line);

    order.status = recomputeOrderStatusFromLines(
      order.status,
      order.lines ?? [],
    );
    await this.diningOrderRepository.save(order);
    const updated = await this.getOrderOrThrow(orderId, companyId);
    this.publishSessionUpdated(updated);
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

    const wasBilling = order.status === DiningOrderStatus.BILLING;
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

    let updated = await this.getOrderOrThrow(data.diningOrderId, companyId);
    if (wasBilling) {
      updated.status = reopenFromBilling(updated.lines ?? []);
      await this.diningOrderRepository.save(updated);
      updated = await this.getOrderOrThrow(data.diningOrderId, companyId);
    }
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

  async getKitchenQueue(productionUnitId: string): Promise<DiningOrderLine[]> {
    const companyId = this.requireCompanyId();

    const unit = await this.productionUnitRepository.findOne({
      where: { id: productionUnitId, companyId },
    });
    if (!unit) {
      throw new NotFoundException('Unidad de producción no encontrada.');
    }

    return this.diningOrderLineRepository
      .createQueryBuilder('line')
      .leftJoinAndSelect('line.diningOrder', 'order')
      .leftJoinAndSelect('order.diningTable', 'diningTable')
      .leftJoinAndSelect('line.productVariant', 'productVariant')
      .where('line.productionUnitId = :productionUnitId', { productionUnitId })
      .andWhere('line.kitchenStatus IN (:...statuses)', {
        statuses: KITCHEN_QUEUE_STATUSES,
      })
      .andWhere('order.companyId = :companyId', { companyId })
      .andWhere('order.status != :closed', {
        closed: DiningOrderStatus.CLOSED,
      })
      .orderBy('line.sentToKitchenAt', 'ASC', 'NULLS LAST')
      .getMany();
  }
}
