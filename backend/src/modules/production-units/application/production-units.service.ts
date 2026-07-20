import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Branch } from '@modules/branches/domain/branch.entity';
import {
  Storage,
  StorageCategory,
} from '@modules/storages/domain/storage.entity';
import { ProductionUnit } from '../domain/production-unit.entity';
import {
  ProductionUnitInventoryMode,
  ProductionUnitPurpose,
  ProductionUnitScope,
} from '../domain/production-unit.enums';
import { nextProductionUnitCodeFromExisting } from './production-unit-code.util';
import { LaborUnitsService } from '@modules/hr-labor-units/application/labor-units.service';

export type ProductionUnitView = ProductionUnit & {
  laborUnitIds: string[];
};

@Injectable()
export class ProductionUnitsService {
  constructor(
    @InjectRepository(ProductionUnit)
    private readonly productionUnitRepository: Repository<ProductionUnit>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Storage)
    private readonly storageRepository: Repository<Storage>,
    private readonly laborUnitsService: LaborUnitsService,
  ) {}

  private requireCompanyId(): string {
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('No hay empresa activa en el contexto.');
    }
    return companyId;
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

  private async assertStorageInCompany(
    storageId: string,
    companyId: string,
  ): Promise<Storage> {
    const storage = await this.storageRepository.findOne({
      where: { id: storageId, companyId },
    });
    if (!storage) {
      throw new BadRequestException(
        'Almacén no válido o no pertenece a la empresa.',
      );
    }
    if (!storage.isActive) {
      throw new BadRequestException(
        `El almacén «${storage.name}» está inactivo.`,
      );
    }
    return storage;
  }

  private normalizeScope(raw?: string | null): ProductionUnitScope {
    if (raw === ProductionUnitScope.COMPANY) {
      return ProductionUnitScope.COMPANY;
    }
    return ProductionUnitScope.BRANCH;
  }

  private normalizeInventoryMode(
    raw?: string | null,
  ): ProductionUnitInventoryMode {
    if (raw === ProductionUnitInventoryMode.AUTONOMOUS) {
      return ProductionUnitInventoryMode.AUTONOMOUS;
    }
    return ProductionUnitInventoryMode.DEPENDENT;
  }

  private normalizePurpose(raw?: string | null): ProductionUnitPurpose {
    if (raw === ProductionUnitPurpose.BATCH) {
      return ProductionUnitPurpose.BATCH;
    }
    return ProductionUnitPurpose.KITCHEN;
  }

  private assertScopeBranchConsistency(
    scope: ProductionUnitScope,
    branchId: string | null | undefined,
  ): string | null {
    if (scope === ProductionUnitScope.COMPANY) {
      return null;
    }
    if (!branchId?.trim()) {
      throw new BadRequestException(
        'Las unidades de alcance sucursal requieren una sucursal.',
      );
    }
    return branchId.trim();
  }

  private assertStorageBranchScope(
    storage: Storage,
    scope: ProductionUnitScope,
    branchId: string | null,
    role: 'insumos' | 'salida',
  ): void {
    if (scope === ProductionUnitScope.COMPANY) {
      if (storage.branchId) {
        throw new BadRequestException(
          `El almacén de ${role} de una unidad empresa no puede pertenecer a una sucursal.`,
        );
      }
      return;
    }
    if (storage.branchId && storage.branchId !== branchId) {
      throw new BadRequestException(
        `El almacén de ${role} debe pertenecer a la misma sucursal de la unidad.`,
      );
    }
  }

  private async assertInventoryStorages(data: {
    companyId: string;
    scope: ProductionUnitScope;
    branchId: string | null;
    inventoryMode: ProductionUnitInventoryMode;
    defaultInputStorageId?: string | null;
    defaultOutputStorageId?: string | null;
    excludeUnitId?: string;
  }): Promise<{ input: Storage; output: Storage }> {
    const inputId = data.defaultInputStorageId?.trim() || null;
    const outputId = data.defaultOutputStorageId?.trim() || null;

    if (!inputId || !outputId) {
      throw new BadRequestException(
        'Toda unidad de producción requiere almacén de insumos y de salida.',
      );
    }

    const input = await this.assertStorageInCompany(inputId, data.companyId);
    const output = await this.assertStorageInCompany(outputId, data.companyId);

    this.assertStorageBranchScope(input, data.scope, data.branchId, 'insumos');
    this.assertStorageBranchScope(output, data.scope, data.branchId, 'salida');

    if (data.inventoryMode === ProductionUnitInventoryMode.DEPENDENT) {
      if (input.category === StorageCategory.PRODUCTION_INPUT) {
        throw new BadRequestException(
          'Las unidades dependientes no pueden usar un almacén de insumos de producción (reservado a autónomas).',
        );
      }
      return { input, output };
    }

    // AUTONOMOUS
    if (input.category !== StorageCategory.PRODUCTION_INPUT) {
      throw new BadRequestException(
        'El almacén de insumos de una unidad autónoma debe ser de categoría «Insumos de producción».',
      );
    }
    if (inputId === outputId) {
      throw new BadRequestException(
        'En unidades autónomas el almacén de insumos y el de salida deben ser distintos.',
      );
    }
    if (
      input.productionUnitId &&
      input.productionUnitId !== data.excludeUnitId
    ) {
      throw new BadRequestException(
        'El almacén de insumos ya está asignado de forma exclusiva a otra unidad de producción.',
      );
    }

    const otherOwner = await this.productionUnitRepository.findOne({
      where: {
        companyId: data.companyId,
        inventoryMode: ProductionUnitInventoryMode.AUTONOMOUS,
        defaultInputStorageId: inputId,
        isActive: true,
      },
    });
    if (otherOwner && otherOwner.id !== data.excludeUnitId) {
      throw new BadRequestException(
        `El almacén de insumos ya es usado en exclusiva por la unidad «${otherOwner.name}».`,
      );
    }

    return { input, output };
  }

  private async syncAutonomousInputOwnership(data: {
    unitId: string;
    inventoryMode: ProductionUnitInventoryMode;
    inputStorageId: string | null;
    previousInputStorageId?: string | null;
  }): Promise<void> {
    const previousId = data.previousInputStorageId ?? null;
    const nextId = data.inputStorageId;

    if (
      previousId &&
      previousId !== nextId
    ) {
      const previous = await this.storageRepository.findOne({
        where: { id: previousId },
      });
      if (previous?.productionUnitId === data.unitId) {
        previous.productionUnitId = null;
        await this.storageRepository.save(previous);
      }
    }

    if (
      data.inventoryMode === ProductionUnitInventoryMode.AUTONOMOUS &&
      nextId
    ) {
      const next = await this.storageRepository.findOne({
        where: { id: nextId },
      });
      if (next) {
        next.productionUnitId = data.unitId;
        await this.storageRepository.save(next);
      }
    } else if (
      data.inventoryMode === ProductionUnitInventoryMode.DEPENDENT &&
      nextId
    ) {
      const next = await this.storageRepository.findOne({
        where: { id: nextId },
      });
      if (next?.productionUnitId === data.unitId) {
        next.productionUnitId = null;
        await this.storageRepository.save(next);
      }
    }
  }

  private async allocateNextCode(
    companyId: string,
    scope: ProductionUnitScope,
    branchId: string | null,
  ): Promise<string> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const rows =
        scope === ProductionUnitScope.COMPANY
          ? await this.productionUnitRepository.find({
              where: { companyId, scope: ProductionUnitScope.COMPANY },
              select: ['code'],
            })
          : await this.productionUnitRepository.find({
              where: { companyId, branchId: branchId as string },
              select: ['code'],
            });
      const candidate = nextProductionUnitCodeFromExisting(
        rows.map((r) => r.code),
      );
      const taken =
        scope === ProductionUnitScope.COMPANY
          ? await this.productionUnitRepository.exist({
              where: {
                companyId,
                scope: ProductionUnitScope.COMPANY,
                code: candidate,
              },
            })
          : await this.productionUnitRepository.exist({
              where: {
                companyId,
                branchId: branchId as string,
                code: candidate,
              },
            });
      if (!taken) {
        return candidate;
      }
    }
    throw new ConflictException(
      'No se pudo generar un código único para la unidad de producción. Intente de nuevo.',
    );
  }

  private async assertCodeUnique(data: {
    companyId: string;
    scope: ProductionUnitScope;
    branchId: string | null;
    code: string;
    excludeId?: string;
  }): Promise<void> {
    const where =
      data.scope === ProductionUnitScope.COMPANY
        ? {
            companyId: data.companyId,
            scope: ProductionUnitScope.COMPANY,
            code: data.code,
          }
        : {
            companyId: data.companyId,
            branchId: data.branchId as string,
            code: data.code,
          };
    const dup = await this.productionUnitRepository.findOne({ where });
    if (dup && dup.id !== data.excludeId) {
      const place =
        data.scope === ProductionUnitScope.COMPANY
          ? 'en la empresa'
          : 'en esta sucursal';
      throw new ConflictException(
        `Ya existe una unidad de producción con el código «${data.code}» ${place}.`,
      );
    }
  }

  async findAll(options?: {
    branchId?: string;
    includeInactive?: boolean;
    /** When true with branchId, also include COMPANY-scope units. Default true. */
    includeCompanyWide?: boolean;
    purpose?: ProductionUnitPurpose | string;
  }): Promise<ProductionUnitView[]> {
    const companyId = this.requireCompanyId();
    const qb = this.productionUnitRepository
      .createQueryBuilder('pu')
      .leftJoinAndSelect('pu.branch', 'branch')
      .leftJoinAndSelect('pu.defaultInputStorage', 'defaultInputStorage')
      .leftJoinAndSelect('pu.defaultOutputStorage', 'defaultOutputStorage')
      .where('pu.companyId = :companyId', { companyId })
      .orderBy('pu.scope', 'ASC')
      .addOrderBy('pu.name', 'ASC');

    if (options?.branchId) {
      const includeCompany = options.includeCompanyWide !== false;
      if (includeCompany) {
        qb.andWhere(
          '(pu.branchId = :branchId OR pu.scope = :companyScope)',
          {
            branchId: options.branchId,
            companyScope: ProductionUnitScope.COMPANY,
          },
        );
      } else {
        qb.andWhere('pu.branchId = :branchId', { branchId: options.branchId });
      }
    }
    if (options?.purpose) {
      qb.andWhere('pu.purpose = :purpose', {
        purpose: this.normalizePurpose(options.purpose),
      });
    }
    if (!options?.includeInactive) {
      qb.andWhere('pu.isActive = :isActive', { isActive: true });
    }

    const rows = await qb.getMany();
    const luMap = await this.laborUnitsService.mapLaborUnitIdsByProductionUnitIds(
      rows.map((r) => r.id),
    );
    return rows.map((r) =>
      Object.assign(r, { laborUnitIds: luMap.get(r.id) ?? [] }),
    );
  }

  async findOne(id: string): Promise<ProductionUnitView | null> {
    const companyId = this.requireCompanyId();
    const row = await this.productionUnitRepository.findOne({
      where: { id, companyId },
      relations: ['branch', 'defaultInputStorage', 'defaultOutputStorage'],
    });
    if (!row) return null;
    const laborUnitIds =
      await this.laborUnitsService.listLaborUnitIdsForProductionUnit(id);
    return Object.assign(row, { laborUnitIds });
  }

  async create(data: {
    scope?: ProductionUnitScope | string;
    branchId?: string | null;
    code?: string;
    name: string;
    inventoryMode?: ProductionUnitInventoryMode | string;
    purpose?: ProductionUnitPurpose | string;
    defaultInputStorageId?: string | null;
    defaultOutputStorageId?: string | null;
    laborUnitIds?: string[];
    isActive?: boolean;
  }): Promise<ProductionUnitView> {
    const companyId = this.requireCompanyId();
    const scope = this.normalizeScope(data.scope);
    const branchId = this.assertScopeBranchConsistency(scope, data.branchId);
    if (branchId) {
      await this.assertBranchInCompany(branchId, companyId);
    }

    const name = data.name.trim();
    if (!name) {
      throw new BadRequestException('El nombre de la unidad es obligatorio.');
    }

    const inventoryMode = this.normalizeInventoryMode(data.inventoryMode);
    const purpose = this.normalizePurpose(data.purpose);
    await this.assertInventoryStorages({
      companyId,
      scope,
      branchId,
      inventoryMode,
      defaultInputStorageId: data.defaultInputStorageId,
      defaultOutputStorageId: data.defaultOutputStorageId,
    });

    const provided = data.code?.trim();
    let code: string;
    if (provided) {
      await this.assertCodeUnique({
        companyId,
        scope,
        branchId,
        code: provided,
      });
      code = provided;
    } else {
      code = await this.allocateNextCode(companyId, scope, branchId);
    }

    const row = this.productionUnitRepository.create({
      companyId,
      branchId,
      scope,
      inventoryMode,
      purpose,
      code,
      name,
      defaultInputStorageId: data.defaultInputStorageId ?? null,
      defaultOutputStorageId: data.defaultOutputStorageId ?? null,
      isActive: data.isActive !== false,
    });
    const saved = await this.productionUnitRepository.save(row);
    await this.syncAutonomousInputOwnership({
      unitId: saved.id,
      inventoryMode,
      inputStorageId: saved.defaultInputStorageId ?? null,
    });
    if (data.laborUnitIds !== undefined) {
      await this.laborUnitsService.syncProductionUnitLaborUnits(
        saved.id,
        data.laborUnitIds,
      );
    }
    return (await this.findOne(saved.id))!;
  }

  async update(
    id: string,
    data: Partial<{
      scope: ProductionUnitScope | string;
      branchId: string | null;
      code: string;
      name: string;
      inventoryMode: ProductionUnitInventoryMode | string;
      purpose: ProductionUnitPurpose | string;
      defaultInputStorageId: string | null;
      defaultOutputStorageId: string | null;
      laborUnitIds: string[];
      isActive: boolean;
    }>,
  ): Promise<ProductionUnitView> {
    const companyId = this.requireCompanyId();
    const existing = await this.productionUnitRepository.findOne({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundException('Unidad de producción no encontrada.');
    }

    const { laborUnitIds, ...rest } = data;

    const scope =
      rest.scope !== undefined
        ? this.normalizeScope(rest.scope)
        : existing.scope;
    const branchIdRaw =
      rest.branchId !== undefined ? rest.branchId : existing.branchId;
    const branchId = this.assertScopeBranchConsistency(scope, branchIdRaw);
    if (branchId) {
      await this.assertBranchInCompany(branchId, companyId);
    }

    const inventoryMode =
      rest.inventoryMode !== undefined
        ? this.normalizeInventoryMode(rest.inventoryMode)
        : existing.inventoryMode;
    const purpose =
      rest.purpose !== undefined
        ? this.normalizePurpose(rest.purpose)
        : existing.purpose;

    const inputId =
      rest.defaultInputStorageId !== undefined
        ? rest.defaultInputStorageId
        : existing.defaultInputStorageId;
    const outputId =
      rest.defaultOutputStorageId !== undefined
        ? rest.defaultOutputStorageId
        : existing.defaultOutputStorageId;
    const previousInputId = existing.defaultInputStorageId ?? null;

    await this.assertInventoryStorages({
      companyId,
      scope,
      branchId,
      inventoryMode,
      defaultInputStorageId: inputId,
      defaultOutputStorageId: outputId,
      excludeUnitId: id,
    });

    if (rest.code !== undefined) {
      const code = rest.code.trim();
      if (!code) {
        throw new BadRequestException('El código de la unidad es obligatorio.');
      }
      await this.assertCodeUnique({
        companyId,
        scope,
        branchId,
        code,
        excludeId: id,
      });
      existing.code = code;
    }

    if (rest.name !== undefined) {
      const name = rest.name.trim();
      if (!name) {
        throw new BadRequestException('El nombre de la unidad es obligatorio.');
      }
      existing.name = name;
    }

    existing.scope = scope;
    existing.branchId = branchId;
    existing.inventoryMode = inventoryMode;
    existing.purpose = purpose;
    existing.defaultInputStorageId = inputId ?? null;
    existing.defaultOutputStorageId = outputId ?? null;

    if (rest.isActive !== undefined) {
      existing.isActive = rest.isActive;
    }

    const saved = await this.productionUnitRepository.save(existing);
    await this.syncAutonomousInputOwnership({
      unitId: saved.id,
      inventoryMode,
      inputStorageId: saved.defaultInputStorageId ?? null,
      previousInputStorageId: previousInputId,
    });
    if (laborUnitIds !== undefined) {
      await this.laborUnitsService.syncProductionUnitLaborUnits(
        id,
        laborUnitIds,
      );
    }
    return (await this.findOne(saved.id))!;
  }
}
