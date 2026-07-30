import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Branch } from '@modules/branches/domain/branch.entity';
import { DiningRealtimePublisher } from '@modules/dining-realtime/dining-realtime.publisher';
import { DiningBoardDisplay } from '../domain/dining-board-display.entity';
import { DiningOrder } from '../domain/dining-order.entity';
import {
  DiningOrderKind,
  DiningOrderStatus,
} from '../domain/dining.enums';
import {
  buildDiningBoardSnapshot,
  type DiningBoardSnapshotDto,
} from './dining-board-snapshot.util';
import {
  generateDiningBoardDisplayToken,
  hashDiningBoardDisplayToken,
  normalizeDiningBoardDisplayToken,
} from './dining-board-token.util';

export type DiningBoardDisplayPublicRow = {
  id: string;
  companyId: string;
  branchId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

@Injectable()
export class DiningBoardService {
  constructor(
    @InjectRepository(DiningBoardDisplay)
    private readonly displayRepo: Repository<DiningBoardDisplay>,
    @InjectRepository(DiningOrder)
    private readonly orderRepo: Repository<DiningOrder>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly diningRealtimePublisher: DiningRealtimePublisher,
  ) {}

  private requireCompanyId(): string {
    const companyId = TenantContext.getCompanyId()?.trim();
    if (!companyId) {
      throw new BadRequestException('Empresa activa requerida');
    }
    return companyId;
  }

  async findActiveByRawToken(
    rawToken: string,
  ): Promise<DiningBoardDisplay | null> {
    const token = normalizeDiningBoardDisplayToken(rawToken);
    if (!token) return null;
    const tokenHash = hashDiningBoardDisplayToken(token);
    return this.displayRepo.findOne({
      where: {
        tokenHash,
        isActive: true,
        revokedAt: IsNull(),
      },
    });
  }

  async touchLastSeen(displayId: string): Promise<void> {
    await this.displayRepo.update(
      { id: displayId },
      { lastSeenAt: new Date() },
    );
  }

  async listDisplays(branchId?: string): Promise<DiningBoardDisplayPublicRow[]> {
    const companyId = this.requireCompanyId();
    const qb = this.displayRepo
      .createQueryBuilder('d')
      .where('d.company_id = :companyId', { companyId })
      .orderBy('d.created_at', 'DESC');
    if (branchId?.trim()) {
      qb.andWhere('d.branch_id = :branchId', { branchId: branchId.trim() });
    }
    const rows = await qb.getMany();
    return rows.map((d) => this.toPublicRow(d));
  }

  async createDisplay(input: {
    branchId: string;
    name: string;
  }): Promise<DiningBoardDisplayPublicRow & { token: string }> {
    const companyId = this.requireCompanyId();
    const branchId = input.branchId?.trim();
    const name = String(input.name ?? '').trim();
    if (!branchId) {
      throw new BadRequestException('branchId es obligatorio');
    }
    if (name.length < 2) {
      throw new BadRequestException('Indique un nombre para la pantalla');
    }
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, companyId },
    });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    let token = '';
    let tokenHash = '';
    for (let attempt = 0; attempt < 24; attempt++) {
      token = generateDiningBoardDisplayToken();
      tokenHash = hashDiningBoardDisplayToken(token);
      const clash = await this.displayRepo.findOne({
        where: { tokenHash },
      });
      if (!clash) break;
      token = '';
    }
    if (!token) {
      throw new BadRequestException(
        'No se pudo generar un código único. Intente de nuevo.',
      );
    }

    const entity = this.displayRepo.create({
      companyId,
      branchId,
      name,
      tokenHash,
      isActive: true,
      revokedAt: null,
    });
    const saved = await this.displayRepo.save(entity);
    return { ...this.toPublicRow(saved), token };
  }

  async revokeDisplay(displayId: string): Promise<DiningBoardDisplayPublicRow> {
    const companyId = this.requireCompanyId();
    const display = await this.displayRepo.findOne({
      where: { id: displayId, companyId },
    });
    if (!display) {
      throw new NotFoundException('Pantalla no encontrada');
    }
    display.isActive = false;
    display.revokedAt = new Date();
    const saved = await this.displayRepo.save(display);
    return this.toPublicRow(saved);
  }

  async getSnapshotForDisplay(
    display: DiningBoardDisplay,
  ): Promise<DiningBoardSnapshotDto> {
    return this.buildSnapshot(display.companyId, display.branchId);
  }

  async buildSnapshot(
    companyId: string,
    branchId: string,
  ): Promise<DiningBoardSnapshotDto> {
    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.lines', 'lines')
      .where('order.companyId = :companyId', { companyId })
      .andWhere('order.branchId = :branchId', { branchId })
      .andWhere('order.status != :closed', {
        closed: DiningOrderStatus.CLOSED,
      })
      .andWhere('order.kind IN (:...kinds)', {
        kinds: [
          DiningOrderKind.TAKEAWAY,
          DiningOrderKind.COUNTER,
          DiningOrderKind.TABLE,
        ],
      })
      .orderBy('order.openedAt', 'DESC')
      .getMany();

    return buildDiningBoardSnapshot({
      companyId,
      branchId,
      orders,
    });
  }

  async publishBoardForBranch(
    companyId: string,
    branchId: string,
  ): Promise<void> {
    const snapshot = await this.buildSnapshot(companyId, branchId);
    this.diningRealtimePublisher.emitBoardSnapshot(snapshot);
  }

  private toPublicRow(d: DiningBoardDisplay): DiningBoardDisplayPublicRow {
    return {
      id: d.id,
      companyId: d.companyId,
      branchId: d.branchId,
      name: d.name,
      isActive: d.isActive,
      createdAt: d.createdAt?.toISOString?.() ?? new Date().toISOString(),
      lastSeenAt: d.lastSeenAt?.toISOString?.() ?? null,
      revokedAt: d.revokedAt?.toISOString?.() ?? null,
    };
  }
}
