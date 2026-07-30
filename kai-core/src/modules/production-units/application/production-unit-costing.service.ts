import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Employee, EmployeeStatus } from '@modules/employees/domain/employee.entity';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import { EmploymentContractStatus } from '@modules/employees/domain/employment-contract.enums';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { RecipesService } from '@modules/recipes/application/recipes.service';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import { recipeInputQuantityForOutput } from '@modules/recipes/application/recipe-consumption.util';
import { LaborUnitsService } from '@modules/hr-labor-units/application/labor-units.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { ProductionUnit } from '../domain/production-unit.entity';
import { ProductionUnitEmployee } from '../domain/production-unit-employee.entity';

const HISTORY_DAYS = 30;

export type ProductionUnitLaborCostSummary = {
  laborUnitIds: string[];
  /** Empleados asociados directamente a la UP. */
  directEmployeeIds: string[];
  employeeCount: number;
  monthlyPayrollTotal: number;
  /** Piezas completadas en la ventana de historial (últimos 30 días). */
  computedCapacity: number | null;
  /**
   * @deprecated Alias de `computedCapacity` (compat API/UI).
   * Ya no es capacidad teórica editable.
   */
  monthlyCapacity: number | null;
  laborCostPerUnit: number | null;
  laborWarning?: string | null;
};

export type VariantProductionCostPreview = {
  variantId: string;
  productionUnitId: string;
  materialsPerUnit: number | null;
  laborPerUnit: number | null;
  unitCostPreview: number | null;
  materialsWarning?: string | null;
  laborWarning?: string | null;
  laborSource?: 'override' | 'history' | 'none';
};

function parseMoney(raw: string | number | null | undefined): number {
  if (raw == null || raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseOverride(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Number(n.toFixed(6));
}

@Injectable()
export class ProductionUnitCostingService {
  constructor(
    @InjectRepository(ProductionUnit)
    private readonly unitRepo: Repository<ProductionUnit>,
    @InjectRepository(ProductionUnitEmployee)
    private readonly puEmployeeRepo: Repository<ProductionUnitEmployee>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmploymentContract)
    private readonly contractRepo: Repository<EmploymentContract>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly laborUnitsService: LaborUnitsService,
    private readonly recipesService: RecipesService,
  ) {}

  async sumCompletedOutputQty(
    productionUnitId: string,
    companyId: string,
    since: Date,
  ): Promise<number> {
    const raw = await this.txRepo
      .createQueryBuilder('t')
      .innerJoin(TransactionLine, 'tl', 'tl.transactionId = t.id')
      .select('COALESCE(SUM(tl.quantity), 0)', 'total')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', {
        type: TransactionType.PRODUCTION_BATCH,
      })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere(
        '(t.completedAt >= :since OR (t.completedAt IS NULL AND t.updatedAt >= :since))',
        { since },
      )
      .andWhere(
        `COALESCE(t.metadata->'productionOrder'->>'productionUnitId', t.metadata->'links'->>'productionUnitId') = :unitId`,
        { unitId: productionUnitId },
      )
      .getRawOne<{ total: string | number }>();

    const n = Number(raw?.total ?? 0);
    return Number.isFinite(n) && n > 0 ? Number(n.toFixed(6)) : 0;
  }

  async summarizeLaborCost(
    productionUnitId: string,
    companyId?: string,
  ): Promise<ProductionUnitLaborCostSummary> {
    const cid = companyId ?? TenantContext.getCompanyId();
    if (!cid) {
      return {
        laborUnitIds: [],
        directEmployeeIds: [],
        employeeCount: 0,
        monthlyPayrollTotal: 0,
        computedCapacity: null,
        monthlyCapacity: null,
        laborCostPerUnit: null,
        laborWarning:
          'MO pendiente de historial (sin lotes completados en 30 días)',
      };
    }

    const unit = await this.unitRepo.findOne({
      where: { id: productionUnitId, companyId: cid },
    });
    if (!unit) {
      return {
        laborUnitIds: [],
        directEmployeeIds: [],
        employeeCount: 0,
        monthlyPayrollTotal: 0,
        computedCapacity: null,
        monthlyCapacity: null,
        laborCostPerUnit: null,
        laborWarning: 'Unidad de producción no encontrada',
      };
    }

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - HISTORY_DAYS);
    const piecesLast30d = await this.sumCompletedOutputQty(
      productionUnitId,
      cid,
      since,
    );
    const computedCapacity = piecesLast30d > 0 ? piecesLast30d : null;

    const laborUnitIds =
      await this.laborUnitsService.listLaborUnitIdsForProductionUnit(
        productionUnitId,
      );
    const directRows = await this.puEmployeeRepo.find({
      where: { companyId: cid, productionUnitId },
    });
    const directEmployeeIds = directRows.map((r) => r.employeeId);

    if (laborUnitIds.length === 0 && directEmployeeIds.length === 0) {
      return {
        laborUnitIds: [],
        directEmployeeIds: [],
        employeeCount: 0,
        monthlyPayrollTotal: 0,
        computedCapacity,
        monthlyCapacity: computedCapacity,
        laborCostPerUnit: null,
        laborWarning: computedCapacity
          ? 'Asocie unidades laborales o empleados para calcular MO'
          : 'MO pendiente de historial (sin lotes completados en 30 días)',
      };
    }

    const viaLaborUnit =
      laborUnitIds.length === 0
        ? []
        : await this.employeeRepo.find({
            where: {
              companyId: cid,
              laborUnitId: In(laborUnitIds),
              status: EmployeeStatus.ACTIVE,
            },
          });
    const directOnly =
      directEmployeeIds.length === 0
        ? []
        : await this.employeeRepo.find({
            where: {
              companyId: cid,
              id: In(directEmployeeIds),
              status: EmployeeStatus.ACTIVE,
            },
          });
    const employees = [
      ...new Map(
        [...viaLaborUnit, ...directOnly].map((e) => [e.id, e]),
      ).values(),
    ];

    const employeeIds = employees.map((e) => e.id);
    const contracts =
      employeeIds.length === 0
        ? []
        : await this.contractRepo.find({
            where: {
              companyId: cid,
              employeeId: In(employeeIds),
              status: EmploymentContractStatus.ACTIVE,
            },
          });
    const contractByEmployee = new Map<string, EmploymentContract>();
    for (const c of contracts) {
      const prev = contractByEmployee.get(c.employeeId);
      if (!prev || String(c.startDate) > String(prev.startDate)) {
        contractByEmployee.set(c.employeeId, c);
      }
    }

    let monthlyPayrollTotal = 0;
    for (const emp of employees) {
      const contract = contractByEmployee.get(emp.id);
      const salary = contract
        ? parseMoney(contract.baseSalary) || parseMoney(contract.feeAmount)
        : parseMoney(emp.baseSalary);
      monthlyPayrollTotal += salary;
    }
    monthlyPayrollTotal = Number(monthlyPayrollTotal.toFixed(2));

    let laborCostPerUnit: number | null = null;
    let laborWarning: string | null = null;
    if (computedCapacity != null && computedCapacity > 0 && monthlyPayrollTotal > 0) {
      laborCostPerUnit = Number(
        (monthlyPayrollTotal / computedCapacity).toFixed(6),
      );
    } else if (!computedCapacity) {
      laborWarning =
        'MO pendiente de historial (sin lotes completados en 30 días)';
    } else if (monthlyPayrollTotal <= 0) {
      laborWarning = 'Sin nómina en el equipo de la unidad';
    }

    return {
      laborUnitIds,
      directEmployeeIds,
      employeeCount: employees.length,
      monthlyPayrollTotal,
      computedCapacity,
      monthlyCapacity: computedCapacity,
      laborCostPerUnit,
      laborWarning,
    };
  }

  /**
   * Prioridad: override variante → tasa celda histórica → 0.
   */
  async resolveLaborPerPiece(params: {
    productionUnitId: string;
    variantId: string;
    companyId?: string;
    unitLabor?: ProductionUnitLaborCostSummary | null;
  }): Promise<{
    laborPerPiece: number;
    source: 'override' | 'history' | 'none';
    warning: string | null;
  }> {
    const cid = params.companyId ?? TenantContext.getCompanyId();
    const variant = await this.variantRepo.findOne({
      where: cid
        ? { id: params.variantId, companyId: cid }
        : { id: params.variantId },
    });
    const override = parseOverride(
      (variant as { laborCostOverride?: number | null } | null)?.laborCostOverride,
    );
    if (override != null) {
      return { laborPerPiece: override, source: 'override', warning: null };
    }

    const unitLabor =
      params.unitLabor ??
      (await this.summarizeLaborCost(params.productionUnitId, cid ?? undefined));
    if (unitLabor.laborCostPerUnit != null) {
      return {
        laborPerPiece: unitLabor.laborCostPerUnit,
        source: 'history',
        warning: null,
      };
    }
    return {
      laborPerPiece: 0,
      source: 'none',
      warning:
        unitLabor.laborWarning ??
        'MO pendiente de historial (sin lotes completados en 30 días)',
    };
  }

  async previewVariantUnitCost(params: {
    productionUnitId: string;
    variantId: string;
    companyId?: string;
  }): Promise<VariantProductionCostPreview> {
    const cid = params.companyId ?? TenantContext.getCompanyId();
    const labor = await this.summarizeLaborCost(
      params.productionUnitId,
      cid ?? undefined,
    );
    const resolved = await this.resolveLaborPerPiece({
      productionUnitId: params.productionUnitId,
      variantId: params.variantId,
      companyId: cid ?? undefined,
      unitLabor: labor,
    });

    let materialsPerUnit: number | null = null;
    let materialsWarning: string | null = null;

    if (!cid) {
      return {
        variantId: params.variantId,
        productionUnitId: params.productionUnitId,
        materialsPerUnit: null,
        laborPerUnit: resolved.laborPerPiece || null,
        unitCostPreview: resolved.laborPerPiece || null,
        materialsWarning: 'Empresa activa requerida',
        laborWarning: resolved.warning,
        laborSource: resolved.source,
      };
    }

    const recipes = await this.recipesService.list(cid, params.variantId);
    const recipe = recipes.find(
      (r) => r.isActive && r.type === RecipeType.PRODUCTION,
    );
    if (!recipe) {
      materialsWarning = 'Sin receta PRODUCTION activa';
    } else {
      const inputIds = [
        ...new Set(recipe.lines.map((l) => l.inputVariantId).filter(Boolean)),
      ];
      const inputs =
        inputIds.length === 0
          ? []
          : await this.variantRepo.find({ where: { id: In(inputIds) } });
      const byId = new Map(inputs.map((v) => [v.id, v]));
      let sum = 0;
      let missingPmp = false;
      for (const line of recipe.lines) {
        const qty = recipeInputQuantityForOutput(
          Number(line.qtyPerOutputUnit ?? 0),
          Number(line.wasteFactor ?? 0),
          1,
        );
        if (qty <= 0) continue;
        const pmp = Number(byId.get(line.inputVariantId)?.pmp ?? 0);
        if (!Number.isFinite(pmp) || pmp <= 0) {
          missingPmp = true;
          continue;
        }
        sum += qty * pmp;
      }
      materialsPerUnit = Number(sum.toFixed(6));
      if (missingPmp) {
        materialsWarning = 'Algunos insumos sin PMP; materiales parciales';
      }
    }

    const laborPerUnit =
      resolved.source === 'none' ? null : resolved.laborPerPiece;
    const unitCostPreview =
      materialsPerUnit == null && laborPerUnit == null
        ? null
        : Number(((materialsPerUnit ?? 0) + (laborPerUnit ?? 0)).toFixed(6));

    return {
      variantId: params.variantId,
      productionUnitId: params.productionUnitId,
      materialsPerUnit,
      laborPerUnit,
      unitCostPreview,
      materialsWarning,
      laborWarning: resolved.warning,
      laborSource: resolved.source,
    };
  }
}
