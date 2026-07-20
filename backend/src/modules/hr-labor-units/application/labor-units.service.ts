import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { OrganizationalUnit } from '@modules/organizational-units/domain/organizational-unit.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import {
  HR_LABOR_UNIT_CODE_PREFIX,
  nextPrefixedSequenceCodeFromExisting,
} from '@shared/codes/prefixed-sequence-code.util';
import { HrLaborUnit } from '../domain/hr-labor-unit.entity';
import { HrLaborUnitStorage } from '../domain/hr-labor-unit-storage.entity';
import { HrLaborUnitBranch } from '../domain/hr-labor-unit-branch.entity';
import { HrLaborUnitOrganizationalUnit } from '../domain/hr-labor-unit-organizational-unit.entity';
import { HrLaborUnitProductionUnit } from '../domain/hr-labor-unit-production-unit.entity';

function requireCompanyId(): string {
  const companyId = TenantContext.getCompanyId();
  if (!companyId) throw new BadRequestException('Company context required');
  return companyId;
}

export type LaborUnitRow = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  branchIds: string[];
  branches: Array<{ id: string; name: string }>;
  storageIds: string[];
  storages: Array<{ id: string; name: string }>;
  organizationalUnitIds: string[];
  productionUnitIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class LaborUnitsService {
  constructor(
    @InjectRepository(HrLaborUnit)
    private readonly repo: Repository<HrLaborUnit>,
    @InjectRepository(HrLaborUnitStorage)
    private readonly storageBridgeRepo: Repository<HrLaborUnitStorage>,
    @InjectRepository(HrLaborUnitBranch)
    private readonly branchBridgeRepo: Repository<HrLaborUnitBranch>,
    @InjectRepository(HrLaborUnitOrganizationalUnit)
    private readonly ouBridgeRepo: Repository<HrLaborUnitOrganizationalUnit>,
    @InjectRepository(HrLaborUnitProductionUnit)
    private readonly puBridgeRepo: Repository<HrLaborUnitProductionUnit>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(OrganizationalUnit)
    private readonly ouRepo: Repository<OrganizationalUnit>,
    @InjectRepository(ProductionUnit)
    private readonly puRepo: Repository<ProductionUnit>,
  ) {}

  async list(opts?: {
    includeInactive?: boolean;
    branchId?: string | null;
  }): Promise<LaborUnitRow[]> {
    const companyId = requireCompanyId();
    const where: Record<string, unknown> = { companyId, deletedAt: IsNull() };
    if (!opts?.includeInactive) where.isActive = true;

    let rows: HrLaborUnit[];
    if (opts?.branchId) {
      const bridges = await this.branchBridgeRepo.find({
        where: { companyId, branchId: opts.branchId },
      });
      const ids = bridges.map((b) => b.laborUnitId);
      if (ids.length === 0) return [];
      rows = await this.repo.find({
        where: { ...where, id: In(ids) },
        order: { name: 'ASC' },
      });
    } else {
      rows = await this.repo.find({
        where,
        order: { name: 'ASC' },
      });
    }
    return this.enrichMany(companyId, rows);
  }

  async get(id: string): Promise<LaborUnitRow> {
    const companyId = requireCompanyId();
    const row = await this.repo.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('Unidad laboral no encontrada');
    const [enriched] = await this.enrichMany(companyId, [row]);
    return enriched!;
  }

  async create(input: {
    name: string;
    description?: string | null;
    isActive?: boolean;
  }): Promise<LaborUnitRow> {
    const companyId = requireCompanyId();
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('Nombre requerido');
    const code = await this.allocateNextCode(companyId);
    const saved = await this.repo.save(
      this.repo.create({
        companyId,
        code,
        name,
        description: input.description?.trim() || null,
        isActive: input.isActive !== false,
      }),
    );
    return this.get(saved.id);
  }

  async update(
    id: string,
    patch: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    },
  ): Promise<LaborUnitRow> {
    const companyId = requireCompanyId();
    const row = await this.repo.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('Unidad laboral no encontrada');
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new BadRequestException('Nombre requerido');
      row.name = name;
    }
    if (patch.description !== undefined) {
      row.description = patch.description?.trim() || null;
    }
    if (patch.isActive !== undefined) row.isActive = patch.isActive;
    await this.repo.save(row);
    return this.get(id);
  }

  /** @deprecated Prefer sync from storage owner; kept for API compatibility. */
  async setStorages(id: string, storageIds: string[]): Promise<LaborUnitRow> {
    const companyId = requireCompanyId();
    await this.get(id);
    await this.replaceBridgeFromOwnerSide(
      this.storageBridgeRepo,
      companyId,
      'laborUnitId',
      id,
      'storageId',
      storageIds,
      async (ids) => {
        const storages = await this.storageRepo.find({
          where: { id: In(ids), companyId },
        });
        if (storages.length !== ids.length) {
          throw new BadRequestException(
            'Uno o más almacenes no existen en la empresa',
          );
        }
      },
    );
    return this.get(id);
  }

  async syncStorageLaborUnits(
    storageId: string,
    laborUnitIds: string[],
  ): Promise<void> {
    const companyId = requireCompanyId();
    const storage = await this.storageRepo.findOne({
      where: { id: storageId, companyId },
    });
    if (!storage) throw new NotFoundException('Almacén no encontrado');
    await this.replaceOwnerLaborUnits(
      this.storageBridgeRepo,
      companyId,
      'storageId',
      storageId,
      laborUnitIds,
    );
  }

  async syncBranchLaborUnits(
    branchId: string,
    laborUnitIds: string[],
  ): Promise<void> {
    const companyId = requireCompanyId();
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, companyId },
    });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    await this.replaceOwnerLaborUnits(
      this.branchBridgeRepo,
      companyId,
      'branchId',
      branchId,
      laborUnitIds,
    );
  }

  async syncOrganizationalUnitLaborUnits(
    organizationalUnitId: string,
    laborUnitIds: string[],
  ): Promise<void> {
    const companyId = requireCompanyId();
    const ou = await this.ouRepo.findOne({
      where: { id: organizationalUnitId, companyId },
    });
    if (!ou) throw new NotFoundException('Unidad organizativa no encontrada');
    await this.replaceOwnerLaborUnits(
      this.ouBridgeRepo,
      companyId,
      'organizationalUnitId',
      organizationalUnitId,
      laborUnitIds,
    );
  }

  async syncProductionUnitLaborUnits(
    productionUnitId: string,
    laborUnitIds: string[],
  ): Promise<void> {
    const companyId = requireCompanyId();
    const pu = await this.puRepo.findOne({
      where: { id: productionUnitId, companyId },
    });
    if (!pu) throw new NotFoundException('Unidad productiva no encontrada');
    await this.replaceOwnerLaborUnits(
      this.puBridgeRepo,
      companyId,
      'productionUnitId',
      productionUnitId,
      laborUnitIds,
    );
  }

  async listLaborUnitIdsForStorage(storageId: string): Promise<string[]> {
    return this.listOwnerLaborUnitIds(
      this.storageBridgeRepo,
      'storageId',
      storageId,
    );
  }

  async listLaborUnitIdsForBranch(branchId: string): Promise<string[]> {
    return this.listOwnerLaborUnitIds(
      this.branchBridgeRepo,
      'branchId',
      branchId,
    );
  }

  async listLaborUnitIdsForOrganizationalUnit(
    organizationalUnitId: string,
  ): Promise<string[]> {
    return this.listOwnerLaborUnitIds(
      this.ouBridgeRepo,
      'organizationalUnitId',
      organizationalUnitId,
    );
  }

  async listLaborUnitIdsForProductionUnit(
    productionUnitId: string,
  ): Promise<string[]> {
    return this.listOwnerLaborUnitIds(
      this.puBridgeRepo,
      'productionUnitId',
      productionUnitId,
    );
  }

  async mapLaborUnitIdsByStorageIds(
    storageIds: string[],
  ): Promise<Map<string, string[]>> {
    return this.mapLaborUnitIdsByOwnerIds(
      this.storageBridgeRepo,
      'storageId',
      storageIds,
    );
  }

  async mapLaborUnitIdsByBranchIds(
    branchIds: string[],
  ): Promise<Map<string, string[]>> {
    return this.mapLaborUnitIdsByOwnerIds(
      this.branchBridgeRepo,
      'branchId',
      branchIds,
    );
  }

  async mapLaborUnitIdsByOrganizationalUnitIds(
    organizationalUnitIds: string[],
  ): Promise<Map<string, string[]>> {
    return this.mapLaborUnitIdsByOwnerIds(
      this.ouBridgeRepo,
      'organizationalUnitId',
      organizationalUnitIds,
    );
  }

  async mapLaborUnitIdsByProductionUnitIds(
    productionUnitIds: string[],
  ): Promise<Map<string, string[]>> {
    return this.mapLaborUnitIdsByOwnerIds(
      this.puBridgeRepo,
      'productionUnitId',
      productionUnitIds,
    );
  }

  private async listOwnerLaborUnitIds(
    repo: Repository<{ laborUnitId: string; companyId: string }>,
    ownerKey: string,
    ownerId: string,
  ): Promise<string[]> {
    const companyId = requireCompanyId();
    const rows = await repo.find({
      where: { companyId, [ownerKey]: ownerId } as any,
    });
    return rows.map((r) => r.laborUnitId);
  }

  private async mapLaborUnitIdsByOwnerIds(
    repo: Repository<{ laborUnitId: string; companyId: string }>,
    ownerKey: string,
    ownerIds: string[],
  ): Promise<Map<string, string[]>> {
    const companyId = requireCompanyId();
    const out = new Map<string, string[]>();
    if (ownerIds.length === 0) return out;
    const rows = await repo.find({
      where: { companyId, [ownerKey]: In(ownerIds) } as any,
    });
    for (const r of rows as any[]) {
      const ownerId = r[ownerKey] as string;
      const list = out.get(ownerId) ?? [];
      list.push(r.laborUnitId);
      out.set(ownerId, list);
    }
    return out;
  }

  private async replaceOwnerLaborUnits(
    repo: Repository<any>,
    companyId: string,
    ownerKey: string,
    ownerId: string,
    laborUnitIds: string[],
  ): Promise<void> {
    const uniqueIds = [...new Set(laborUnitIds.filter(Boolean))];
    if (uniqueIds.length > 0) {
      const units = await this.repo.find({
        where: {
          companyId,
          id: In(uniqueIds),
          deletedAt: IsNull(),
        },
      });
      if (units.length !== uniqueIds.length) {
        throw new BadRequestException(
          'Una o más unidades laborales no existen en la empresa',
        );
      }
    }
    await repo.delete({ companyId, [ownerKey]: ownerId } as any);
    if (uniqueIds.length === 0) return;
    await repo.save(
      uniqueIds.map((laborUnitId) =>
        repo.create({ companyId, laborUnitId, [ownerKey]: ownerId }),
      ),
    );
  }

  private async replaceBridgeFromOwnerSide(
    repo: Repository<any>,
    companyId: string,
    laborKey: string,
    laborUnitId: string,
    ownerKey: string,
    ownerIds: string[],
    validate: (ids: string[]) => Promise<void>,
  ): Promise<void> {
    const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
    if (uniqueIds.length > 0) await validate(uniqueIds);
    await repo.delete({ companyId, [laborKey]: laborUnitId } as any);
    if (uniqueIds.length === 0) return;
    await repo.save(
      uniqueIds.map((ownerId) =>
        repo.create({
          companyId,
          [laborKey]: laborUnitId,
          [ownerKey]: ownerId,
        }),
      ),
    );
  }

  private async allocateNextCode(companyId: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = await this.repo.find({
        where: { companyId },
        select: ['code'],
        withDeleted: true,
      });
      const candidate = nextPrefixedSequenceCodeFromExisting(
        HR_LABOR_UNIT_CODE_PREFIX,
        rows.map((r) => r.code),
      );
      const taken = await this.repo.exist({
        where: { companyId, code: candidate },
      });
      if (!taken) return candidate;
    }
    throw new ConflictException(
      'No se pudo generar un código único para la unidad laboral',
    );
  }

  private async enrichMany(
    companyId: string,
    rows: HrLaborUnit[],
  ): Promise<LaborUnitRow[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    const [storageBridges, branchBridges, ouBridges, puBridges] =
      await Promise.all([
        this.storageBridgeRepo.find({
          where: { companyId, laborUnitId: In(ids) },
        }),
        this.branchBridgeRepo.find({
          where: { companyId, laborUnitId: In(ids) },
        }),
        this.ouBridgeRepo.find({
          where: { companyId, laborUnitId: In(ids) },
        }),
        this.puBridgeRepo.find({
          where: { companyId, laborUnitId: In(ids) },
        }),
      ]);

    const storageIds = [...new Set(storageBridges.map((b) => b.storageId))];
    const branchIds = [...new Set(branchBridges.map((b) => b.branchId))];

    const [storages, branches] = await Promise.all([
      storageIds.length
        ? this.storageRepo.find({
            where: { id: In(storageIds), companyId },
            select: ['id', 'name'],
          })
        : Promise.resolve([] as Storage[]),
      branchIds.length
        ? this.branchRepo.find({
            where: { id: In(branchIds), companyId },
            select: ['id', 'name'],
          })
        : Promise.resolve([] as Branch[]),
    ]);

    const storageById = new Map(storages.map((s) => [s.id, s]));
    const branchById = new Map(branches.map((b) => [b.id, b]));

    const storagesByLu = new Map<string, string[]>();
    for (const b of storageBridges) {
      const list = storagesByLu.get(b.laborUnitId) ?? [];
      list.push(b.storageId);
      storagesByLu.set(b.laborUnitId, list);
    }
    const branchesByLu = new Map<string, string[]>();
    for (const b of branchBridges) {
      const list = branchesByLu.get(b.laborUnitId) ?? [];
      list.push(b.branchId);
      branchesByLu.set(b.laborUnitId, list);
    }
    const ouByLu = new Map<string, string[]>();
    for (const b of ouBridges) {
      const list = ouByLu.get(b.laborUnitId) ?? [];
      list.push(b.organizationalUnitId);
      ouByLu.set(b.laborUnitId, list);
    }
    const puByLu = new Map<string, string[]>();
    for (const b of puBridges) {
      const list = puByLu.get(b.laborUnitId) ?? [];
      list.push(b.productionUnitId);
      puByLu.set(b.laborUnitId, list);
    }

    return rows.map((r) => {
      const sIds = storagesByLu.get(r.id) ?? [];
      const bIds = branchesByLu.get(r.id) ?? [];
      return {
        id: r.id,
        companyId: r.companyId,
        code: r.code,
        name: r.name,
        description: r.description ?? null,
        isActive: r.isActive,
        branchIds: bIds,
        branches: bIds
          .map((bid) => branchById.get(bid))
          .filter(Boolean)
          .map((b) => ({ id: b!.id, name: b!.name })),
        storageIds: sIds,
        storages: sIds
          .map((sid) => storageById.get(sid))
          .filter(Boolean)
          .map((s) => ({ id: s!.id, name: s!.name })),
        organizationalUnitIds: ouByLu.get(r.id) ?? [],
        productionUnitIds: puByLu.get(r.id) ?? [],
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });
  }
}
