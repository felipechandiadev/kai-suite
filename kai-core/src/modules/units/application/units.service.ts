import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not, Repository } from 'typeorm';
import { Unit } from '../domain/unit.entity';
import { UnitDimension } from '../domain/unit-dimension.enum';
import { TenantContext } from '@common/tenant';

export type UnitListRow = {
  id: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  conversionFactor: number;
  allowDecimals: boolean;
  isBase: boolean;
  baseUnitId: string | null;
  baseUnitName: string | null;
  baseUnitSymbol: string | null;
  activeDerivedCount: number;
  active: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const DIMENSION_VALUES = new Set<string>(Object.values(UnitDimension));

function assertDimension(d: string): UnitDimension {
  if (!DIMENSION_VALUES.has(d)) {
    throw new BadRequestException(
      `Dimensión inválida. Use: ${[...DIMENSION_VALUES].join(', ')}`,
    );
  }
  return d as UnitDimension;
}

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  /**
   * Las unidades NO son globales: pertenecen a una empresa. Cada operación
   * del service exige conocer la empresa activa desde el TenantContext.
   */
  private requireCompanyId(): string {
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new ForbiddenException(
        'No hay empresa activa. Selecciona una empresa antes de operar con unidades.',
      );
    }
    return companyId;
  }

  private toRow(
    unit: Unit,
    activeDerivedCountByBaseId: Map<string, number>,
  ): UnitListRow {
    const base = unit.baseUnit;
    return {
      id: unit.id,
      name: unit.name,
      symbol: unit.symbol,
      dimension: unit.dimension,
      conversionFactor: Number(unit.conversionFactor),
      allowDecimals: unit.allowDecimals,
      isBase: unit.isBase,
      baseUnitId: unit.baseUnitId ?? null,
      baseUnitName: base?.name ?? null,
      baseUnitSymbol: base?.symbol ?? null,
      activeDerivedCount: unit.isBase
        ? activeDerivedCountByBaseId.get(unit.id) ?? 0
        : 0,
      active: unit.active,
      isDefault: unit.isDefault === true,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }

  private buildDerivedCountMap(units: Unit[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const u of units) {
      if (u.baseUnitId && u.active) {
        m.set(u.baseUnitId, (m.get(u.baseUnitId) ?? 0) + 1);
      }
    }
    return m;
  }

  private async clearCompanyDefaults(
    companyId: string,
    em: EntityManager,
    exceptId?: string,
  ): Promise<void> {
    const qb = em
      .createQueryBuilder()
      .update(Unit)
      .set({ isDefault: false })
      .where('company_id = :companyId', { companyId })
      .andWhere('deleted_at IS NULL');
    if (exceptId) {
      qb.andWhere('id != :exceptId', { exceptId });
    }
    await qb.execute();
  }

  private async pickNextDefaultUnit(
    companyId: string,
    em: EntityManager,
    excludeId?: string,
  ): Promise<Unit | null> {
    const units = await em.find(Unit, {
      where: { deletedAt: IsNull(), companyId, active: true },
      order: { symbol: 'ASC' },
    });
    const candidates = units.filter((u) => u.id !== excludeId);
    if (candidates.length === 0) {
      return null;
    }
    const un = candidates.find((u) => u.symbol.toLowerCase() === 'un');
    if (un) {
      return un;
    }
    const countBase = candidates.find(
      (u) => u.isBase && u.dimension === UnitDimension.COUNT,
    );
    if (countBase) {
      return countBase;
    }
    return candidates[0];
  }

  private async ensureCompanyDefault(
    companyId: string,
    em: EntityManager,
    excludeId?: string,
  ): Promise<void> {
    const current = await em.findOne(Unit, {
      where: {
        companyId,
        isDefault: true,
        active: true,
        deletedAt: IsNull(),
      },
    });
    if (current && current.id !== excludeId) {
      return;
    }
    const next = await this.pickNextDefaultUnit(companyId, em, excludeId);
    if (!next) {
      return;
    }
    await this.clearCompanyDefaults(companyId, em);
    next.isDefault = true;
    await em.save(next);
  }

  private async assignAsDefault(
    companyId: string,
    unitId: string,
    em: EntityManager,
  ): Promise<void> {
    await this.clearCompanyDefaults(companyId, em, unitId);
    await em.update(Unit, { id: unitId, companyId }, { isDefault: true });
  }

  private assertDefaultMustBeActive(
    wantDefault: boolean,
    willBeActive: boolean,
  ): void {
    if (wantDefault && !willBeActive) {
      throw new BadRequestException(
        'La unidad predeterminada debe estar activa',
      );
    }
  }

  async getAllUnits(status?: string): Promise<UnitListRow[]> {
    try {
      const companyId = this.requireCompanyId();
      const where: {
        deletedAt: ReturnType<typeof IsNull>;
        active?: boolean;
        companyId: string;
      } = {
        deletedAt: IsNull(),
        companyId,
      };
      if (status === 'active') {
        where.active = true;
      } else if (status === 'inactive') {
        where.active = false;
      }

      const units = await this.unitRepository.find({
        where,
        relations: ['baseUnit'],
        order: { dimension: 'ASC', symbol: 'ASC' },
      });

      const derivedMap = this.buildDerivedCountMap(units);
      return units.map((u) => this.toRow(u, derivedMap));
    } catch (error) {
      console.error('Error fetching units:', error);
      throw error;
    }
  }

  async getUnitById(id: string): Promise<UnitListRow | null> {
    try {
      const companyId = this.requireCompanyId();
      const unit = await this.unitRepository.findOne({
        where: { id, deletedAt: IsNull(), companyId },
        relations: ['baseUnit'],
      });

      if (!unit) {
        return null;
      }

      const all = await this.unitRepository.find({
        where: { deletedAt: IsNull(), companyId },
      });
      const derivedMap = this.buildDerivedCountMap(all);
      return this.toRow(unit, derivedMap);
    } catch (error) {
      console.error('Error fetching unit:', error);
      throw error;
    }
  }

  async createUnit(data: {
    name: string;
    symbol: string;
    dimension: string;
    conversionFactor: number;
    allowDecimals?: boolean;
    isBase?: boolean;
    baseUnitId?: string | null;
    isDefault?: boolean;
  }): Promise<UnitListRow> {
    const name = data.name?.trim();
    const symbol = data.symbol?.trim();
    if (!name) {
      throw new BadRequestException('El nombre es obligatorio');
    }
    if (!symbol) {
      throw new BadRequestException('El símbolo es obligatorio');
    }

    const dimension = assertDimension(data.dimension);
    const factor = Number(data.conversionFactor);
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new BadRequestException(
        'El factor de conversión debe ser un número mayor que 0',
      );
    }

    const isBase = data.isBase === true;
    const allowDecimals = data.allowDecimals !== false;
    const wantDefault = data.isDefault === true;

    const companyId = this.requireCompanyId();
    this.assertDefaultMustBeActive(wantDefault, true);

    const hasDefault = await this.unitRepository.exists({
      where: {
        companyId,
        isDefault: true,
        active: true,
        deletedAt: IsNull(),
      },
    });
    const shouldBeDefault = wantDefault || !hasDefault;

    let unit: Unit;

    if (isBase) {
      if (factor !== 1) {
        throw new BadRequestException(
          'Una unidad base debe tener factor de conversión 1',
        );
      }
      if (data.baseUnitId) {
        throw new BadRequestException(
          'Una unidad base no debe tener unidad base asociada',
        );
      }

      const otherBase = await this.unitRepository.findOne({
        where: {
          dimension,
          isBase: true,
          active: true,
          deletedAt: IsNull(),
          companyId,
        },
      });
      if (otherBase) {
        throw new BadRequestException(
          'Ya existe una unidad base activa en esta dimensión',
        );
      }

      unit = this.unitRepository.create({
        name,
        symbol,
        dimension,
        conversionFactor: 1,
        allowDecimals,
        isBase: true,
        baseUnitId: null,
        active: true,
        isDefault: false,
        companyId,
      });
    } else {
      const baseUnitId = data.baseUnitId ?? null;
      if (!baseUnitId) {
        throw new BadRequestException(
          'Las unidades derivadas requieren una unidad base',
        );
      }

      const base = await this.unitRepository.findOne({
        where: { id: baseUnitId, deletedAt: IsNull(), companyId },
      });
      if (!base) {
        throw new BadRequestException('Unidad base no encontrada');
      }
      if (!base.isBase) {
        throw new BadRequestException(
          'La unidad seleccionada no es una unidad base',
        );
      }
      if (base.dimension !== dimension) {
        throw new BadRequestException(
          'La unidad base debe pertenecer a la misma dimensión',
        );
      }
      if (!base.active) {
        throw new BadRequestException(
          'No se puede crear una derivada apuntando a una base inactiva',
        );
      }

      unit = this.unitRepository.create({
        name,
        symbol,
        dimension,
        conversionFactor: factor,
        allowDecimals,
        isBase: false,
        baseUnitId,
        active: true,
        isDefault: false,
        companyId,
      });
    }

    const saved = await this.unitRepository.manager.transaction(async (em) => {
      const persisted = await em.save(unit);
      if (shouldBeDefault) {
        await this.assignAsDefault(companyId, persisted.id, em);
        persisted.isDefault = true;
      }
      return persisted;
    });

    const row = await this.getUnitById(saved.id);
    if (!row) {
      throw new BadRequestException('No se pudo cargar la unidad creada');
    }
    return row;
  }

  async updateUnit(
    id: string,
    data: Partial<{
      name: string;
      symbol: string;
      dimension: string;
      conversionFactor: number;
      allowDecimals: boolean;
      active: boolean;
      isBase: boolean;
      baseUnitId: string | null;
      isDefault: boolean;
    }>,
  ): Promise<UnitListRow> {
    const companyId = this.requireCompanyId();
    const unit = await this.unitRepository.findOne({
      where: { id, deletedAt: IsNull(), companyId },
      relations: ['baseUnit'],
    });
    if (!unit) {
      throw new NotFoundException(`Unidad ${id} no encontrada`);
    }

    const wasDefault = unit.isDefault === true;

    const all = await this.unitRepository.find({
      where: { deletedAt: IsNull(), companyId },
    });
    const derivedMap = this.buildDerivedCountMap(all);
    const activeDerived = derivedMap.get(unit.id) ?? 0;

    if (data.name !== undefined) {
      const n = data.name.trim();
      if (!n) {
        throw new BadRequestException('El nombre es obligatorio');
      }
      unit.name = n;
    }
    if (data.symbol !== undefined) {
      const s = data.symbol.trim();
      if (!s) {
        throw new BadRequestException('El símbolo es obligatorio');
      }
      unit.symbol = s;
    }
    if (data.dimension !== undefined) {
      unit.dimension = assertDimension(data.dimension);
    }
    if (data.allowDecimals !== undefined) {
      unit.allowDecimals = data.allowDecimals;
    }

    let nextIsBase = unit.isBase;
    let nextBaseId = unit.baseUnitId ?? null;
    let nextFactor = Number(unit.conversionFactor);

    if (data.isBase !== undefined && data.isBase !== unit.isBase) {
      if (unit.isBase && !data.isBase) {
        if (activeDerived > 0) {
          throw new BadRequestException(
            'No puedes convertir la base en derivada mientras tenga derivadas activas',
          );
        }
        if (data.conversionFactor === undefined) {
          throw new BadRequestException(
            'Indica el factor de conversión al pasar de base a derivada',
          );
        }
        nextIsBase = false;
        const nid = data.baseUnitId ?? null;
        if (!nid) {
          throw new BadRequestException(
            'Indica la unidad base al convertir en derivada',
          );
        }
        nextBaseId = nid;
      } else if (!unit.isBase && data.isBase) {
        const otherBase = await this.unitRepository.findOne({
          where: {
            dimension: unit.dimension,
            isBase: true,
            active: true,
            deletedAt: IsNull(),
            id: Not(id),
            companyId,
          },
        });
        if (otherBase) {
          throw new BadRequestException(
            'Ya existe una unidad base activa en esta dimensión',
          );
        }
        nextIsBase = true;
        nextBaseId = null;
        nextFactor = 1;
      }
    }

    if (data.baseUnitId !== undefined && !nextIsBase) {
      nextBaseId = data.baseUnitId;
    }

    if (nextIsBase) {
      nextFactor = 1;
      nextBaseId = null;
    } else if (data.conversionFactor !== undefined) {
      const f = Number(data.conversionFactor);
      if (!Number.isFinite(f) || f <= 0) {
        throw new BadRequestException(
          'El factor de conversión debe ser un número mayor que 0',
        );
      }
      nextFactor = f;
    }

    if (!nextIsBase) {
      if (!nextBaseId) {
        throw new BadRequestException(
          'Las unidades derivadas requieren una unidad base',
        );
      }
      const base = await this.unitRepository.findOne({
        where: { id: nextBaseId, deletedAt: IsNull(), companyId },
      });
      if (!base) {
        throw new BadRequestException('Unidad base no encontrada');
      }
      if (!base.isBase) {
        throw new BadRequestException(
          'La unidad seleccionada no es una unidad base',
        );
      }
      if (base.dimension !== unit.dimension) {
        throw new BadRequestException(
          'La unidad base debe pertenecer a la misma dimensión',
        );
      }
      if (!base.active) {
        throw new BadRequestException(
          'No se puede usar una unidad base inactiva como referencia',
        );
      }
    }

    let nextActive = unit.active;
    if (data.active !== undefined) {
      nextActive = data.active;
      if (!nextActive && unit.isBase && activeDerived > 0) {
        throw new BadRequestException(
          'Desactiva o reasigna las derivadas activas antes de desactivar la base',
        );
      }
      if (nextActive && !unit.isBase && nextBaseId) {
        const base = await this.unitRepository.findOne({
          where: { id: nextBaseId, deletedAt: IsNull(), companyId },
        });
        if (base && !base.active) {
          throw new BadRequestException(
            'No puedes activar una derivada mientras su base esté inactiva',
          );
        }
      }
      unit.active = nextActive;
    }

    if (nextIsBase && unit.active) {
      const otherBase = await this.unitRepository.findOne({
        where: {
          dimension: unit.dimension,
          isBase: true,
          active: true,
          deletedAt: IsNull(),
          id: Not(id),
          companyId,
        },
      });
      if (otherBase) {
        throw new BadRequestException(
          'Ya existe otra unidad base activa en esta dimensión',
        );
      }
    }

    unit.isBase = nextIsBase;
    unit.baseUnitId = nextBaseId;
    unit.conversionFactor = nextFactor;

    const wantDefault = data.isDefault;
    if (wantDefault === true) {
      this.assertDefaultMustBeActive(true, nextActive);
    }
    if (wantDefault === false && wasDefault) {
      unit.isDefault = false;
    }
    if (!nextActive && (wasDefault || unit.isDefault)) {
      unit.isDefault = false;
    }

    await this.unitRepository.manager.transaction(async (em) => {
      await em.save(unit);

      if (wantDefault === true) {
        await this.assignAsDefault(companyId, id, em);
        unit.isDefault = true;
      } else if (!nextActive && wasDefault) {
        await this.ensureCompanyDefault(companyId, em, id);
      } else if (wantDefault === false && wasDefault) {
        await this.ensureCompanyDefault(companyId, em);
      }
    });

    const row = await this.getUnitById(id);
    if (!row) {
      throw new NotFoundException(`Unidad ${id} no encontrada`);
    }
    return row;
  }

  async deleteUnit(id: string) {
    const companyId = this.requireCompanyId();
    const unit = await this.unitRepository.findOne({
      where: { id, deletedAt: IsNull(), companyId },
    });
    if (!unit) {
      throw new NotFoundException(`Unidad ${id} no encontrada`);
    }
    if (unit.isBase) {
      const n = await this.unitRepository.count({
        where: {
          baseUnitId: id,
          active: true,
          deletedAt: IsNull(),
          companyId,
        },
      });
      if (n > 0) {
        throw new BadRequestException(
          'No se puede eliminar la base mientras tenga derivadas activas',
        );
      }
    }

    const wasDefault = unit.isDefault === true;

    await this.unitRepository.manager.transaction(async (em) => {
      await em.softDelete(Unit, id);
      if (wasDefault) {
        await this.ensureCompanyDefault(companyId, em, id);
      }
    });

    return { success: true };
  }
}
