import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkipTenant } from '@common/tenant';
import { User, UserRole } from '@modules/users/domain/user.entity';
import * as bcrypt from 'bcryptjs';
import { DeliveryDispatchService } from '../application/delivery-dispatch.service';
import { DeliveryOrderService } from '../application/delivery-order.service';
import { EShopDeliveryDispatch } from '../domain/e-shop-delivery-dispatch.entity';
import { EShopDeliveryStop } from '../domain/e-shop-delivery-stop.entity';

@Controller('courier')
@SkipTenant()
export class CourierController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(EShopDeliveryDispatch)
    private readonly dispatchRepo: Repository<EShopDeliveryDispatch>,
    @InjectRepository(EShopDeliveryStop)
    private readonly stopRepo: Repository<EShopDeliveryStop>,
    private readonly dispatchService: DeliveryDispatchService,
    private readonly deliveryOrderService: DeliveryOrderService,
  ) {}

  @Post('login')
  async login(@Body() body: { userName: string; password: string; companyId: string }) {
    const companyId = typeof body.companyId === 'string' ? body.companyId.trim() : '';
    if (!companyId) {
      throw new BadRequestException('companyId es obligatorio');
    }
    const user = await this.userRepo.findOne({
      where: { userName: body.userName },
      relations: { person: true },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (user.rol !== UserRole.COURIER) {
      throw new ForbiddenException(
        'Esta cuenta no es de repartidor. Usa un usuario con rol repartidor.',
      );
    }
    if (user.companyId && companyId !== user.companyId) {
      throw new ForbiddenException('Usuario no pertenece a esta empresa');
    }
    const valid = user.pass?.startsWith('$2')
      ? await bcrypt.compare(body.password, user.pass)
      : false;
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');
    return {
      userId: user.id,
      companyId: user.companyId,
      userName: user.userName,
      email: user.mail,
      displayName: user.person
        ? [user.person.firstName, user.person.lastName].filter(Boolean).join(' ')
        : user.userName,
    };
  }

  @Post('repartos')
  async listRepartos(@Body() body: { userId: string; companyId: string; date?: string }) {
    const date = body.date ?? this.todayIsoSantiago();
    return this.dispatchService.listForCourier(body.companyId, body.userId, date);
  }

  /** Día calendario Chile (evita desfase UTC cerca de medianoche). */
  private todayIsoSantiago(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const m = parts.find((p) => p.type === 'month')?.value ?? '01';
    const d = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${d}`;
  }

  @Post('repartos/:id/stops')
  async listStops(
    @Param('id') id: string,
    @Body() body: { companyId: string; userId: string },
  ) {
    const dispatch = await this.dispatchRepo.findOne({
      where: { id, companyId: body.companyId, driverUserId: body.userId },
    });
    if (!dispatch) throw new ForbiddenException('Despacho no asignado');
    const stops = await this.dispatchService.listStops(body.companyId, id);
    const startReadiness = dispatch.occurrenceId
      ? await this.dispatchService.evaluateStartReadiness(body.companyId, dispatch.occurrenceId)
      : { canStart: false, reason: 'Despacho sin reparto asociado' };
    const orderIds = stops.map((s) => s.deliveryOrderId);
    const orders =
      orderIds.length > 0
        ? await this.deliveryOrderService.findByIds(body.companyId, orderIds)
        : [];
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    return {
      dispatch: {
        id: dispatch.id,
        label: dispatch.label,
        status: dispatch.status,
        startedAt: dispatch.startedAt,
        routeGeometry: dispatch.routeGeometry ?? null,
        totalDistanceM: dispatch.totalDistanceM,
        totalDurationS: dispatch.totalDurationS,
        startReadiness: {
          canStart: startReadiness.canStart,
          reason: startReadiness.reason,
        },
      },
      stops: stops.map((s) => {
        const order = orderMap.get(s.deliveryOrderId);
        return {
          ...s,
          customerName: order?.customerName ?? null,
          customerPhone: order?.customerPhone ?? null,
          addressLine1: order?.addressLine1 ?? null,
          commune: order?.commune ?? null,
          notes: order?.notes ?? null,
        };
      }),
    };
  }

  @Post('repartos/:id/start')
  async start(
    @Param('id') id: string,
    @Body() body: { companyId: string; userId: string },
  ) {
    const dispatch = await this.dispatchRepo.findOne({
      where: { id, companyId: body.companyId, driverUserId: body.userId },
    });
    if (!dispatch) throw new ForbiddenException('Despacho no asignado');
    return this.dispatchService.startForCourier(body.companyId, id);
  }

  @Post('stops/:id/complete')
  async completeStop(
    @Param('id') id: string,
    @Body() body: { companyId: string; userId: string; issueNote?: string },
  ) {
    const stop = await this.stopRepo.findOne({ where: { id, companyId: body.companyId } });
    if (!stop) throw new ForbiddenException('Parada no encontrada');
    const dispatch = await this.dispatchRepo.findOne({
      where: { id: stop.dispatchId, driverUserId: body.userId },
    });
    if (!dispatch) throw new ForbiddenException('Despacho no asignado');

    stop.stopStatus = body.issueNote ? 'skipped' : 'visited';
    stop.issueNote = body.issueNote ?? null;
    stop.visitedAt = new Date();
    await this.stopRepo.save(stop);

    await this.deliveryOrderService.completeCourierStop(
      body.companyId,
      stop.deliveryOrderId,
      body.issueNote ? 'ISSUE' : 'DELIVERED',
    );
    return stop;
  }
}
