import { HttpException, Inject, Logger, UnauthorizedException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { TenantContext } from '@common/tenant/tenant.context';
import { Branch } from '@modules/branches/domain/branch.entity';
import { DiningRoom } from '@modules/dining/domain/dining-room.entity';
import { DiningTable } from '@modules/dining/domain/dining-table.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { DiningService } from '@modules/dining/application/dining.service';
import { DiningRealtimePublisher } from './dining-realtime.publisher';
import {
  branchDiningRoom,
  kitchenUnitRoom,
  salonRoom,
  tableRoom,
  type DiningKitchenSnapshotPayload,
} from './dining-realtime.types';
import { WsDiningTenantService } from './ws-dining-tenant.service';

@WebSocketGateway({
  namespace: '/realtime/dining',
  cors: { origin: true, credentials: true },
})
export class DiningRealtimeGateway implements OnGatewayInit {
  private readonly logger = new Logger(DiningRealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly publisher: DiningRealtimePublisher,
    private readonly wsTenant: WsDiningTenantService,
    @Inject(forwardRef(() => DiningService))
    private readonly diningService: DiningService,
    @InjectRepository(DiningRoom)
    private readonly diningRoomRepository: Repository<DiningRoom>,
    @InjectRepository(DiningTable)
    private readonly diningTableRepository: Repository<DiningTable>,
    @InjectRepository(ProductionUnit)
    private readonly productionUnitRepository: Repository<ProductionUnit>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  afterInit() {
    this.publisher.attachServer(this.server);
  }

  async handleConnection(client: Socket) {
    const auth = (client.handshake.auth || {}) as Record<
      string,
      string | undefined
    >;
    try {
      const { activeCompanyId, currentUser } =
        await this.wsTenant.resolveSocketTenant({
          userId: auth.userId ?? auth.token,
          activeCompanyIdHeader:
            auth.activeCompanyId ?? auth['x-active-company-id'],
        });
      client.data.activeCompanyId = activeCompanyId;
      client.data.currentUser = currentUser;
      // Señala al cliente que ya puede subscribe* (evita race con handleConnection async).
      client.emit('dining.ready', { companyId: activeCompanyId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`WS dining rechazado: ${msg}`);
      const status = e instanceof HttpException ? e.getStatus() : null;
      if (e instanceof UnauthorizedException || status === 401) {
        try {
          client.emit('auth_error', { reason: 'unauthorized', message: msg });
        } catch {
          // ignore emit failures on half-open socket
        }
      }
      client.disconnect(true);
    }
  }

  @SubscribeMessage('subscribeSalon')
  async subscribeSalon(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { branchId?: string; salonId?: string },
  ) {
    const companyId = client.data.activeCompanyId as string | undefined;
    if (!companyId) {
      return { ok: false, error: 'unauthorized' };
    }

    const branchId = body?.branchId?.trim();
    const salonId = body?.salonId?.trim();
    if (!branchId || !salonId) {
      return { ok: false, error: 'branchId_and_salonId_required' };
    }

    const salon = await this.diningRoomRepository.findOne({
      where: { id: salonId, companyId, branchId },
      select: { id: true },
    });
    if (!salon) {
      return { ok: false, error: 'salon_not_found' };
    }

    const salonPrefix = `company:${companyId}:branch:${branchId}:salon:`;
    for (const room of [...client.rooms]) {
      if (room !== client.id && room.startsWith(salonPrefix)) {
        await client.leave(room);
      }
    }

    const room = salonRoom({ companyId, branchId, salonId });
    await client.join(room);
    return { ok: true, joined: room };
  }

  /**
   * Sincroniza rooms de mesa: join a `tableIds` del tenant y leave del resto.
   * Usado por el mesero solo para mesas que él tiene abiertas.
   */
  @SubscribeMessage('subscribeTables')
  async subscribeTables(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tableIds?: string[] },
  ) {
    const companyId = client.data.activeCompanyId as string | undefined;
    if (!companyId) {
      return { ok: false, error: 'unauthorized' };
    }

    const requested = Array.isArray(body?.tableIds)
      ? [
          ...new Set(
            body.tableIds
              .map((id) => (typeof id === 'string' ? id.trim() : ''))
              .filter(Boolean),
          ),
        ]
      : [];

    let allowedIds = new Set<string>();
    if (requested.length > 0) {
      const tables = await this.diningTableRepository
        .createQueryBuilder('t')
        .innerJoin('t.diningRoom', 'room')
        .select(['t.id'])
        .where('room.companyId = :companyId', { companyId })
        .andWhere('t.id IN (:...ids)', { ids: requested })
        .getMany();
      allowedIds = new Set(tables.map((t) => t.id));
    }

    const tablePrefix = `company:${companyId}:table:`;
    const desiredRooms = new Set(
      [...allowedIds].map((tableId) => tableRoom({ companyId, tableId })),
    );

    for (const room of [...client.rooms]) {
      if (room !== client.id && room.startsWith(tablePrefix) && !desiredRooms.has(room)) {
        await client.leave(room);
      }
    }

    const joined: string[] = [];
    for (const room of desiredRooms) {
      await client.join(room);
      joined.push(room);
    }

    return {
      ok: true,
      joined,
      skipped: requested.filter((id) => !allowedIds.has(id)),
    };
  }

  @SubscribeMessage('subscribeBranch')
  async subscribeBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { branchId?: string },
  ) {
    const companyId = client.data.activeCompanyId as string | undefined;
    if (!companyId) {
      return { ok: false, error: 'unauthorized' };
    }

    const branchId = body?.branchId?.trim();
    if (!branchId) {
      return { ok: false, error: 'branchId_required' };
    }

    const branch = await this.branchRepository.findOne({
      where: { id: branchId, companyId },
      select: { id: true },
    });
    if (!branch) {
      return { ok: false, error: 'branch_not_found' };
    }

    const diningPrefix = `company:${companyId}:branch:`;
    const diningSuffix = ':dining';
    for (const room of [...client.rooms]) {
      if (
        room !== client.id &&
        room.startsWith(diningPrefix) &&
        room.endsWith(diningSuffix)
      ) {
        await client.leave(room);
      }
    }

    const room = branchDiningRoom({ companyId, branchId });
    await client.join(room);
    return { ok: true, joined: room };
  }

  @SubscribeMessage('subscribeKitchenUnit')
  async subscribeKitchenUnit(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { unitId?: string; productionUnitId?: string },
  ) {
    const companyId = client.data.activeCompanyId as string | undefined;
    const currentUser = client.data.currentUser as
      | { id: string; rol: string }
      | undefined;
    if (!companyId || !currentUser) {
      return { ok: false, error: 'unauthorized' };
    }

    const unitId =
      body?.unitId?.trim() || body?.productionUnitId?.trim() || '';
    if (!unitId) {
      return { ok: false, error: 'unitId_required' };
    }

    const unit = await this.productionUnitRepository.findOne({
      where: { id: unitId, companyId },
      select: { id: true },
    });
    if (!unit) {
      return { ok: false, error: 'unit_not_found' };
    }

    const unitPrefix = `company:${companyId}:unit:`;
    for (const room of [...client.rooms]) {
      if (room !== client.id && room.startsWith(unitPrefix)) {
        await client.leave(room);
      }
    }

    const room = kitchenUnitRoom({ companyId, unitId });
    await client.join(room);

    const queue = await TenantContext.run(
      {
        userId: currentUser.id,
        activeCompanyId: companyId,
        rol: currentUser.rol,
      },
      () => this.diningService.getProductionUnitQueue(unitId),
    );

    const snapshot: DiningKitchenSnapshotPayload = {
      companyId,
      unitId,
      queue,
    };
    client.emit('dining.kitchen.snapshot', snapshot);

    return { ok: true, joined: room, queueSize: snapshot.queue.length };
  }
}
