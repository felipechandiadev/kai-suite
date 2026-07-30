import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { PointOfSaleFolioAllocation } from '../domain/point-of-sale-folio-allocation.entity';
import { FiscalCaf } from '../domain/fiscal-caf.entity';
import { SiiEnvironment } from '../domain/fiscal.enums';
import { FiscalCafPackageService } from './fiscal-caf-package.service';

export type PosFolioAllocationItem = {
  id: string;
  pointOfSaleId: string;
  cafId: string;
  subPackCode: string;
  label: string | null;
  packageCode: string | null;
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolio: number;
  environment: string;
  isActive: boolean;
  availableFolios: number;
  isCurrent: boolean;
  isExhausted: boolean;
};

export type UpsertPosFolioAllocationInput = {
  dteType: number;
  rangeFrom: number;
  rangeTo: number;
  nextFolio?: number;
  environment?: SiiEnvironment;
  isActive?: boolean;
};

export type CreateSubPackInput = {
  pointOfSaleId: string;
  rangeFrom: number;
  rangeTo: number;
  label?: string;
};

export type UpdateSubPackInput = {
  rangeFrom?: number;
  rangeTo?: number;
  label?: string;
};

@Injectable()
export class PosFolioAllocationService {
  constructor(
    @InjectRepository(PointOfSaleFolioAllocation)
    private readonly allocationRepo: Repository<PointOfSaleFolioAllocation>,
    @InjectRepository(FiscalCaf)
    private readonly cafRepo: Repository<FiscalCaf>,
    @InjectRepository(PointOfSale)
    private readonly posRepo: Repository<PointOfSale>,
    private readonly dataSource: DataSource,
    private readonly cafPackageService: FiscalCafPackageService,
  ) {}

  async listByPos(posId: string): Promise<PosFolioAllocationItem[]> {
    const rows = await this.allocationRepo.find({
      where: { pointOfSaleId: posId },
      order: { dteType: 'ASC', rangeFrom: 'ASC', createdAt: 'ASC' },
    });
    const cafIds = [...new Set(rows.map((r) => r.cafId))];
    const cafs =
      cafIds.length > 0
        ? await this.cafRepo.find({ where: cafIds.map((id) => ({ id })) })
        : [];
    const cafById = new Map(cafs.map((c) => [c.id, c]));
    const currentIds = this.resolveCurrentAllocationIds(rows);
    return rows.map((r) =>
      this.toItem(r, cafById.get(r.cafId)?.packageCode ?? null, currentIds.has(r.id)),
    );
  }

  async replaceAllocationsForPos(
    posId: string,
    items: UpsertPosFolioAllocationInput[],
  ): Promise<never> {
    throw new BadRequestException(
      'La asignación de folios se gestiona desde Configuración SII → Folios. Use sub-paquetes allí.',
    );
  }

  async createSubPack(
    companyId: string,
    cafId: string,
    input: CreateSubPackInput,
  ): Promise<PosFolioAllocationItem> {
    const caf = await this.cafPackageService.requirePackage(companyId, cafId);
    const pos = await this.requirePosInCompany(input.pointOfSaleId, companyId);
    const rangeFrom = Number(input.rangeFrom);
    const rangeTo = Number(input.rangeTo);
    if (!Number.isFinite(rangeFrom) || !Number.isFinite(rangeTo)) {
      throw new BadRequestException('Rango de folios inválido');
    }

    await this.validateWithinCaf(companyId, cafId, rangeFrom, rangeTo);
    await this.validateNoOverlap(companyId, cafId, { from: rangeFrom, to: rangeTo });

    const subPackCode = await this.generateSubPackCode(companyId, caf.packageCode);
    const saved = await this.allocationRepo.save(
      this.allocationRepo.create({
        companyId,
        cafId,
        subPackCode,
        label: input.label?.trim() || null,
        pointOfSaleId: pos.id,
        dteType: caf.dteType,
        rangeFrom,
        rangeTo,
        nextFolio: rangeFrom,
        environment: caf.environment,
        isActive: true,
      }),
    );
    const current = await this.getCurrentAllocationForPos(
      pos.id,
      caf.dteType,
      caf.environment,
    );
    return this.toItem(saved, caf.packageCode, current?.id === saved.id);
  }

  async updateSubPack(
    companyId: string,
    allocationId: string,
    input: UpdateSubPackInput,
  ): Promise<PosFolioAllocationItem> {
    const row = await this.allocationRepo.findOne({ where: { id: allocationId, companyId } });
    if (!row) throw new NotFoundException('Sub-paquete no encontrado');
    if (row.nextFolio !== row.rangeFrom) {
      throw new BadRequestException('No se puede editar un sub-paquete con folios consumidos');
    }

    const rangeFrom = input.rangeFrom != null ? Number(input.rangeFrom) : row.rangeFrom;
    const rangeTo = input.rangeTo != null ? Number(input.rangeTo) : row.rangeTo;
    await this.validateWithinCaf(companyId, row.cafId, rangeFrom, rangeTo);
    await this.validateNoOverlap(companyId, row.cafId, { from: rangeFrom, to: rangeTo }, row.id);

    row.rangeFrom = rangeFrom;
    row.rangeTo = rangeTo;
    row.nextFolio = rangeFrom;
    if (input.label !== undefined) row.label = input.label?.trim() || null;
    const saved = await this.allocationRepo.save(row);
    const caf = await this.cafRepo.findOne({ where: { id: row.cafId } });
    const current = await this.getCurrentAllocationForPos(
      row.pointOfSaleId,
      row.dteType,
      row.environment as SiiEnvironment,
    );
    return this.toItem(saved, caf?.packageCode ?? null, current?.id === saved.id);
  }

  async deleteSubPack(companyId: string, allocationId: string): Promise<void> {
    const row = await this.allocationRepo.findOne({ where: { id: allocationId, companyId } });
    if (!row) throw new NotFoundException('Sub-paquete no encontrado');
    if (row.nextFolio !== row.rangeFrom) {
      throw new BadRequestException('No se puede eliminar un sub-paquete con folios consumidos');
    }
    await this.allocationRepo.remove(row);
  }

  async deleteAllocation(id: string, companyId: string): Promise<void> {
    return this.deleteSubPack(companyId, id);
  }

  isExhausted(allocation: PointOfSaleFolioAllocation): boolean {
    return allocation.nextFolio > allocation.rangeTo;
  }

  getAvailableCount(allocation: PointOfSaleFolioAllocation): number {
    if (!allocation.isActive) return 0;
    return Math.max(0, allocation.rangeTo - allocation.nextFolio + 1);
  }

  sortAllocationsForPos(rows: PointOfSaleFolioAllocation[]): PointOfSaleFolioAllocation[] {
    return [...rows].sort(
      (a, b) =>
        a.rangeFrom - b.rangeFrom ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  resolveCurrentAllocationIds(rows: PointOfSaleFolioAllocation[]): Set<string> {
    const currentIds = new Set<string>();
    const groups = new Map<string, PointOfSaleFolioAllocation[]>();
    for (const row of rows) {
      if (!row.isActive) continue;
      const key = `${row.pointOfSaleId}:${row.dteType}:${row.environment}`;
      const bucket = groups.get(key) ?? [];
      bucket.push(row);
      groups.set(key, bucket);
    }
    for (const group of groups.values()) {
      const current = this.pickCurrentFromOrdered(this.sortAllocationsForPos(group));
      if (current) currentIds.add(current.id);
    }
    return currentIds;
  }

  pickCurrentFromOrdered(
    ordered: PointOfSaleFolioAllocation[],
  ): PointOfSaleFolioAllocation | null {
    return ordered.find((row) => row.isActive && !this.isExhausted(row)) ?? null;
  }

  pickNextStandbyAllocation(
    ordered: PointOfSaleFolioAllocation[],
    currentId: string | null,
  ): PointOfSaleFolioAllocation | null {
    const activeOrdered = ordered.filter((row) => row.isActive);
    const currentIndex =
      currentId != null ? activeOrdered.findIndex((row) => row.id === currentId) : -1;
    const start = currentIndex >= 0 ? currentIndex + 1 : 0;
    for (let i = start; i < activeOrdered.length; i += 1) {
      const row = activeOrdered[i];
      if (!this.isExhausted(row)) return row;
    }
    return null;
  }

  async listOrderedActiveForPos(
    posId: string,
    dteType: number,
    environment: SiiEnvironment = SiiEnvironment.PRODUCTION,
    manager?: EntityManager,
  ): Promise<PointOfSaleFolioAllocation[]> {
    const repo = manager
      ? manager.getRepository(PointOfSaleFolioAllocation)
      : this.allocationRepo;
    const rows = await repo.find({
      where: { pointOfSaleId: posId, dteType, environment, isActive: true },
      order: { rangeFrom: 'ASC', createdAt: 'ASC' },
    });
    return this.sortAllocationsForPos(rows);
  }

  async getCurrentAllocationForPos(
    posId: string,
    dteType: number,
    environment: SiiEnvironment = SiiEnvironment.PRODUCTION,
    manager?: EntityManager,
  ): Promise<PointOfSaleFolioAllocation | null> {
    const ordered = await this.listOrderedActiveForPos(posId, dteType, environment, manager);
    return this.pickCurrentFromOrdered(ordered);
  }

  async getNextStandbyAllocationForPos(
    posId: string,
    dteType: number,
    environment: SiiEnvironment = SiiEnvironment.PRODUCTION,
    manager?: EntityManager,
  ): Promise<PointOfSaleFolioAllocation | null> {
    const ordered = await this.listOrderedActiveForPos(posId, dteType, environment, manager);
    const current = this.pickCurrentFromOrdered(ordered);
    return this.pickNextStandbyAllocation(ordered, current?.id ?? null);
  }

  async getAvailableFoliosForPos(
    posId: string,
    dteType: number,
    environment: SiiEnvironment = SiiEnvironment.PRODUCTION,
  ): Promise<number> {
    const ordered = await this.listOrderedActiveForPos(posId, dteType, environment);
    return ordered.reduce((sum, row) => sum + this.getAvailableCount(row), 0);
  }

  async getActiveAllocation(
    posId: string,
    dteType: number,
    environment: SiiEnvironment = SiiEnvironment.PRODUCTION,
  ): Promise<PointOfSaleFolioAllocation | null> {
    return this.getCurrentAllocationForPos(posId, dteType, environment);
  }

  async reserveFolio(
    posId: string,
    dteType: number,
    manager?: EntityManager,
  ): Promise<{ folio: number; allocationId: string; cafId: string }> {
    if (manager) {
      return this.reserveFolioInManager(manager, posId, dteType);
    }
    return this.dataSource.transaction((txManager) =>
      this.reserveFolioInManager(txManager, posId, dteType),
    );
  }

  async reserveFolioInManager(
    manager: EntityManager,
    posId: string,
    dteType: number,
  ): Promise<{ folio: number; allocationId: string; cafId: string }> {
    const pos = await manager.getRepository(PointOfSale).findOne({
      where: { id: posId, deletedAt: IsNull() },
    });
    if (!pos?.companyId) {
      throw new NotFoundException('Punto de venta no encontrado');
    }

    const ordered = await this.listOrderedActiveForPos(
      posId,
      dteType,
      SiiEnvironment.PRODUCTION,
      manager,
    );
    if (ordered.length === 0) {
      throw new ConflictException('El POS no tiene folios asignados para este tipo de documento');
    }

    const allocationRepo = manager.getRepository(PointOfSaleFolioAllocation);
    for (const candidate of ordered) {
      const allocation = await allocationRepo.findOne({
        where: { id: candidate.id, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!allocation || this.isExhausted(allocation)) {
        continue;
      }

      const caf = await manager.getRepository(FiscalCaf).findOne({
        where: { id: allocation.cafId, companyId: pos.companyId },
      });
      if (!caf) {
        throw new BadRequestException('CAF del sub-paquete no encontrado');
      }
      if (
        allocation.nextFolio < allocation.rangeFrom ||
        allocation.nextFolio > allocation.rangeTo ||
        allocation.nextFolio < caf.rangeFrom ||
        allocation.nextFolio > caf.rangeTo
      ) {
        throw new ConflictException('Folio fuera del rango CAF o asignación POS');
      }

      const folio = allocation.nextFolio;
      allocation.nextFolio = folio + 1;
      await allocationRepo.save(allocation);
      return { folio, allocationId: allocation.id, cafId: caf.id };
    }

    throw new ConflictException('Sin folios disponibles en el POS');
  }

  /** Reconcilia folio consumido offline sin reservar de nuevo. */
  async reconcileOfflineFolioInManager(
    manager: EntityManager,
    allocationId: string,
    cafId: string,
    folio: number,
  ): Promise<void> {
    const allocation = await manager.getRepository(PointOfSaleFolioAllocation).findOne({
      where: { id: allocationId, isActive: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!allocation) {
      throw new ConflictException('Sub-paquete de folios no encontrado');
    }
    if (allocation.cafId !== cafId) {
      throw new ConflictException('CAF no coincide con la asignación POS');
    }
    if (folio < allocation.rangeFrom || folio > allocation.rangeTo) {
      throw new ConflictException('Folio offline fuera del rango asignado al POS');
    }
    allocation.nextFolio = Math.max(allocation.nextFolio, folio + 1);
    await manager.getRepository(PointOfSaleFolioAllocation).save(allocation);
  }

  async validateNoOverlap(
    companyId: string,
    cafId: string,
    range: { from: number; to: number },
    excludeId?: string,
  ): Promise<void> {
    if (range.from > range.to) {
      throw new BadRequestException('rangeFrom debe ser menor o igual a rangeTo');
    }
    const rows = await this.allocationRepo.find({
      where: { companyId, cafId, isActive: true },
    });
    for (const row of rows) {
      if (excludeId && row.id === excludeId) continue;
      const overlaps = range.from <= row.rangeTo && range.to >= row.rangeFrom;
      if (overlaps) {
        throw new ConflictException(
          `El rango se solapa con otro sub-paquete (${row.rangeFrom}–${row.rangeTo})`,
        );
      }
    }
  }

  async validateWithinCaf(
    companyId: string,
    cafId: string,
    rangeFrom: number,
    rangeTo: number,
  ): Promise<FiscalCaf> {
    if (rangeFrom > rangeTo) {
      throw new BadRequestException('rangeFrom debe ser menor o igual a rangeTo');
    }
    const caf = await this.cafRepo.findOne({ where: { id: cafId, companyId } });
    if (!caf) {
      throw new BadRequestException('Paquete CAF no encontrado');
    }
    if (rangeFrom < caf.rangeFrom || rangeTo > caf.rangeTo) {
      throw new BadRequestException(
        `El rango debe estar contenido en el paquete (${caf.rangeFrom}–${caf.rangeTo})`,
      );
    }
    return caf;
  }

  async getCompanyFolioSummary(companyId: string, dteType: number) {
    const environment = SiiEnvironment.PRODUCTION;
    const caf = await this.cafRepo.findOne({
      where: { companyId, dteType, environment, isActive: true },
      order: { uploadedAt: 'DESC' },
    });
    const allocations = await this.allocationRepo.find({
      where: { companyId, dteType, environment, isActive: true },
    });
    const assignedCount = allocations.reduce(
      (sum, a) => sum + Math.max(0, a.rangeTo - a.rangeFrom + 1),
      0,
    );
    const cafTotal = caf ? Math.max(0, caf.rangeTo - caf.rangeFrom + 1) : 0;
    const unassigned = caf ? Math.max(0, cafTotal - assignedCount) : 0;
    return {
      dteType,
      caf: caf
        ? {
            id: caf.id,
            packageCode: caf.packageCode,
            rangeFrom: caf.rangeFrom,
            rangeTo: caf.rangeTo,
            nextFolio: caf.nextFolio,
            available: Math.max(0, caf.rangeTo - caf.nextFolio + 1),
          }
        : null,
      assignedToPos: assignedCount,
      unassigned,
      allocations: allocations.map((a) => ({
        id: a.id,
        subPackCode: a.subPackCode,
        cafId: a.cafId,
        pointOfSaleId: a.pointOfSaleId,
        rangeFrom: a.rangeFrom,
        rangeTo: a.rangeTo,
        nextFolio: a.nextFolio,
        availableFolios: this.getAvailableCount(a),
      })),
    };
  }

  private async generateSubPackCode(companyId: string, packageCode: string): Promise<string> {
    const prefix = `${packageCode}-SUB-`;
    const existing = await this.allocationRepo
      .createQueryBuilder('a')
      .select('a.sub_pack_code', 'subPackCode')
      .where('a.company_id = :companyId', { companyId })
      .andWhere('a.sub_pack_code LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('a.created_at', 'DESC')
      .getRawMany<{ subPackCode: string }>();

    let seq = 1;
    const used = new Set(existing.map((r) => r.subPackCode));
    while (used.has(`${prefix}${String(seq).padStart(3, '0')}`)) {
      seq += 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
  }

  private async requirePosInCompany(posId: string, companyId: string): Promise<PointOfSale> {
    const pos = await this.posRepo.findOne({
      where: { id: posId, companyId, deletedAt: IsNull() },
    });
    if (!pos) throw new NotFoundException('Punto de venta no encontrado');
    return pos;
  }

  private toItem(
    row: PointOfSaleFolioAllocation,
    packageCode: string | null,
    isCurrent: boolean,
  ): PosFolioAllocationItem {
    return {
      id: row.id,
      pointOfSaleId: row.pointOfSaleId,
      cafId: row.cafId,
      subPackCode: row.subPackCode,
      label: row.label ?? null,
      packageCode,
      dteType: row.dteType,
      rangeFrom: row.rangeFrom,
      rangeTo: row.rangeTo,
      nextFolio: row.nextFolio,
      environment: row.environment,
      isActive: row.isActive,
      availableFolios: this.getAvailableCount(row),
      isCurrent,
      isExhausted: this.isExhausted(row),
    };
  }
}
