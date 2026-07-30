import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CashHub } from '../domain/cash-hub.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Transaction, TransactionStatus, TransactionType } from '@modules/transactions/domain/transaction.entity';
import type { CreateCashHubBodyDto } from './dto/cash-hub.dto';
import type { UpdateCashHubBodyDto } from './dto/cash-hub.dto';
import { nextCashHubCodeFromExisting } from './cash-hub-code.util';

@Injectable()
export class CashHubsService {
  constructor(
    @InjectRepository(CashHub)
    private readonly hubRepo: Repository<CashHub>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(PointOfSale)
    private readonly posRepo: Repository<PointOfSale>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async listByCompany(
    companyId: string,
  ): Promise<Array<CashHub & { currentBalance: number }>> {
    const hubs = await this.hubRepo.find({
      where: { companyId },
      relations: ['branches', 'pointsOfSale'],
      order: { name: 'ASC' },
    });

    if (hubs.length === 0) {
      return [] as Array<CashHub & { currentBalance: number }>;
    }

    const raw = await this.txRepo
      .createQueryBuilder('tx')
      .select('tx.cashHubId', 'cashHubId')
      .addSelect(
        `SUM(CASE
          WHEN tx.transactionType = :inType THEN tx.total
          WHEN tx.transactionType = :bankToHub THEN tx.total
          WHEN tx.transactionType = :capitalIn THEN tx.total
          WHEN tx.transactionType = :outType THEN -tx.total
          WHEN tx.transactionType = :depositFromSession THEN -tx.total
          WHEN tx.transactionType = :openingFromHub AND tx.cashHubId IS NOT NULL THEN -tx.total
          ELSE 0
        END)`,
        'balance',
      )
      .where('tx.cashHubId IS NOT NULL')
      .andWhere('tx.cashHubId IN (:...hubIds)', { hubIds: hubs.map((h) => h.id) })
      .andWhere('tx.status = :status', { status: TransactionStatus.CONFIRMED })
      .setParameters({
        inType: TransactionType.CASH_SESSION_TO_HUB_TRANSFER,
        bankToHub: TransactionType.BANK_TO_CASH_TRANSFER,
        capitalIn: TransactionType.CAPITAL_CONTRIBUTION,
        outType: TransactionType.CASH_DEPOSIT,
        depositFromSession: TransactionType.CASH_SESSION_DEPOSIT,
        openingFromHub: TransactionType.CASH_SESSION_OPENING,
      })
      .groupBy('tx.cashHubId')
      .getRawMany<{ cashHubId: string; balance: string | null }>();

    const byId = new Map<string, number>();
    for (const r of raw) {
      const id = String((r as any).cashHubId || '').trim();
      const n = Number((r as any).balance ?? 0);
      if (id) byId.set(id, Number.isFinite(n) ? n : 0);
    }

    return hubs.map((h) => Object.assign(h, { currentBalance: byId.get(h.id) ?? 0 }));
  }

  /**
   * Saldo efectivo del centro de acopio: entradas por traslado desde sesión de caja y aportes;
   * salidas por depósito bancario, ingreso a sesión POS y apertura de caja desde el hub.
   */
  async getHubBalance(companyId: string, hubId: string): Promise<number> {
    await this.getOne(hubId, companyId);
    const row = await this.txRepo
      .createQueryBuilder('tx')
      .select(
        `COALESCE(SUM(CASE
          WHEN tx.transactionType = :inType THEN tx.total
          WHEN tx.transactionType = :bankToHub THEN tx.total
          WHEN tx.transactionType = :capitalIn THEN tx.total
          WHEN tx.transactionType = :outType THEN -tx.total
          WHEN tx.transactionType = :depositFromSession THEN -tx.total
          WHEN tx.transactionType = :openingFromHub AND tx.cashHubId IS NOT NULL THEN -tx.total
          ELSE 0
        END), 0)`,
        'balance',
      )
      .where('tx.cashHubId = :hubId', { hubId })
      .andWhere('tx.status = :status', { status: TransactionStatus.CONFIRMED })
      .setParameters({
        inType: TransactionType.CASH_SESSION_TO_HUB_TRANSFER,
        bankToHub: TransactionType.BANK_TO_CASH_TRANSFER,
        capitalIn: TransactionType.CAPITAL_CONTRIBUTION,
        outType: TransactionType.CASH_DEPOSIT,
        depositFromSession: TransactionType.CASH_SESSION_DEPOSIT,
        openingFromHub: TransactionType.CASH_SESSION_OPENING,
      })
      .getRawOne<{ balance: string | null }>();
    const n = Number(row?.balance ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  async getOne(id: string, companyId: string): Promise<CashHub> {
    const hub = await this.hubRepo.findOne({
      where: { id, companyId },
      relations: ['branches', 'pointsOfSale'],
    });
    if (!hub) {
      throw new NotFoundException('Centro de acopio no encontrado');
    }
    return hub;
  }

  async create(dto: CreateCashHubBodyDto): Promise<CashHub> {
    await this.assertPosExclusive(dto.companyId, null, dto.pointOfSaleIds);
    await this.assertPosBelongsToCompanyBranches(dto.companyId, dto.branchIds ?? [], dto.pointOfSaleIds);

    const code = await this.allocateNextCashHubCode(dto.companyId);
    const hub = this.hubRepo.create({
      companyId: dto.companyId,
      name: dto.name.trim(),
      code,
      notes: dto.notes?.trim() || null,
      isActive: dto.isActive ?? true,
    });
    await this.hubRepo.save(hub);
    await this.applyRelations(hub, dto.branchIds ?? [], dto.pointOfSaleIds);
    return this.getOne(hub.id, dto.companyId);
  }

  async update(id: string, companyId: string, dto: UpdateCashHubBodyDto): Promise<CashHub> {
    const hub = await this.getOne(id, companyId);
    if (dto.name != null) hub.name = dto.name.trim();
    if (dto.notes !== undefined) hub.notes = dto.notes?.trim() || null;
    if (dto.isActive != null) hub.isActive = dto.isActive;

    if (dto.pointOfSaleIds) {
      await this.assertPosExclusive(companyId, hub.id, dto.pointOfSaleIds);
      await this.assertPosBelongsToCompanyBranches(companyId, dto.branchIds ?? hub.branches?.map((b) => b.id) ?? [], dto.pointOfSaleIds);
    }

    await this.hubRepo.save(hub);

    if (dto.branchIds || dto.pointOfSaleIds) {
      const branchIds = dto.branchIds ?? hub.branches?.map((b) => b.id) ?? [];
      const posIds = dto.pointOfSaleIds ?? hub.pointsOfSale?.map((p) => p.id) ?? [];
      if (posIds.length === 0) {
        throw new BadRequestException('Un centro de acopio debe mantener al menos un punto de venta.');
      }
      await this.applyRelations(hub, branchIds, posIds);
    }

    return this.getOne(hub.id, companyId);
  }

  /**
   * Hub por defecto para un POS: `defaultCashHubId` o vínculo en `cash_hub_points_of_sale`.
   */
  async resolveDefaultHubForPos(
    companyId: string,
    pointOfSaleId: string,
  ): Promise<string | null> {
    const pos = await this.posRepo.findOne({ where: { id: pointOfSaleId } });
    if (!pos) return null;
    if (pos.defaultCashHubId) {
      const h = await this.hubRepo.findOne({
        where: { id: pos.defaultCashHubId, companyId, isActive: true },
      });
      if (h) return h.id;
    }
    const linked = await this.hubRepo
      .createQueryBuilder('hub')
      .innerJoin('hub.pointsOfSale', 'pos')
      .where('hub.companyId = :companyId', { companyId })
      .andWhere('hub.isActive = true')
      .andWhere('pos.id = :pointOfSaleId', { pointOfSaleId })
      .getOne();
    return linked?.id ?? null;
  }

  /** Valida que el hub pertenezca a la empresa y esté vinculado al POS (tabla de unión o default en POS). */
  async validateHubForPos(
    companyId: string,
    pointOfSaleId: string,
    hubId: string,
  ): Promise<boolean> {
    const hub = await this.hubRepo.findOne({
      where: { id: hubId, companyId, isActive: true },
      relations: ['pointsOfSale'],
    });
    if (!hub) return false;
    if (hub.pointsOfSale?.some((p) => p.id === pointOfSaleId)) return true;
    const pos = await this.posRepo.findOne({ where: { id: pointOfSaleId } });
    return pos?.defaultCashHubId === hubId;
  }

  private async assertPosExclusive(
    companyId: string,
    excludeHubId: string | null,
    posIds: string[],
  ): Promise<void> {
    const qb = this.hubRepo
      .createQueryBuilder('hub')
      .innerJoin('hub.pointsOfSale', 'pos')
      .where('hub.companyId = :companyId', { companyId })
      .andWhere('pos.id IN (:...posIds)', { posIds });
    if (excludeHubId) {
      qb.andWhere('hub.id != :excludeHubId', { excludeHubId });
    }
    const conflict = await qb.getOne();
    if (conflict) {
      throw new ConflictException(
        'Uno o más puntos de venta ya están asignados a otro centro de acopio.',
      );
    }
  }

  /** Si se indican sucursales, cada POS debe pertenecer a una de esas sucursales de la misma empresa. */
  private async assertPosBelongsToCompanyBranches(
    companyId: string,
    branchIds: string[],
    posIds: string[],
  ): Promise<void> {
    if (!branchIds.length) return;
    const branches = await this.branchRepo.find({
      where: { id: In(branchIds), companyId },
    });
    if (branches.length !== branchIds.length) {
      throw new BadRequestException('Sucursal inválida para esta empresa.');
    }
    const poses = await this.posRepo.find({ where: { id: In(posIds) } });
    const allowed = new Set(branchIds);
    for (const p of poses) {
      if (!p.branchId || !allowed.has(p.branchId)) {
        throw new BadRequestException(
          `El punto de venta «${p.name}» no pertenece a las sucursales seleccionadas.`,
        );
      }
    }
  }

  private async allocateNextCashHubCode(companyId: string): Promise<string> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const rows = await this.hubRepo.find({
        where: { companyId },
        select: ['code'],
      });
      const candidate = nextCashHubCodeFromExisting(rows.map((r) => r.code));
      const taken = await this.hubRepo.exist({
        where: { companyId, code: candidate },
      });
      if (!taken) {
        return candidate;
      }
    }
    throw new ConflictException(
      'No se pudo generar un código único para el centro de efectivo. Intente de nuevo.',
    );
  }

  private async applyRelations(
    hub: CashHub,
    branchIds: string[],
    pointOfSaleIds: string[],
  ): Promise<void> {
    const branches =
      branchIds.length > 0
        ? await this.branchRepo.findBy({ id: In(branchIds) })
        : [];
    const poses = await this.posRepo.findBy({ id: In(pointOfSaleIds) });
    if (poses.length !== pointOfSaleIds.length) {
      throw new BadRequestException('Punto de venta inválido.');
    }
    hub.branches = branches;
    hub.pointsOfSale = poses;
    await this.hubRepo.save(hub);
  }
}
