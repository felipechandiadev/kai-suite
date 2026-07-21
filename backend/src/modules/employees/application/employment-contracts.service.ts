import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Employee, WorkRegime } from '../domain/employee.entity';
import { EmploymentContract } from '../domain/employment-contract.entity';
import {
  EmploymentContractKind,
  EmploymentContractStatus,
  EmploymentLaborType,
  ExtraHoursMode,
  HealthContributionMode,
  SalesCommissionType,
} from '../domain/employment-contract.enums';
import { HrJornadaConfig } from '@modules/hr-jornada/domain/hr-jornada-config.entity';
import {
  HrEmployeeTimelineEntry,
  HrEmployeeTimelineKind,
} from '../domain/hr-employee-timeline-entry.entity';
import { HrAfpFund } from '../domain/hr-afp-fund.entity';
import { HrIsapre } from '../domain/hr-isapre.entity';
import { HrShiftSystem } from '@modules/hr-jornada/domain/hr-shift-system.entity';
import {
  FlexibleMode,
  ShiftSystemType,
} from '@modules/hr-jornada/domain/shift-system.enums';
import { assertShiftSystemContractRules } from './shift-system-contract.rules';

export type CreateContractInput = {
  employeeId: string;
  kind: EmploymentContractKind;
  laborType?: EmploymentLaborType | null;
  status?: EmploymentContractStatus;
  startDate: string;
  endDate?: string | null;
  branchId?: string | null;
  baseSalary?: string | null;
  feeAmount?: string | null;
  workRegime?: WorkRegime | null;
  weeklyHours?: number | string | null;
  extraHoursMode?: ExtraHoursMode | string | null;
  mealAllowance?: string;
  transportAllowance?: string;
  tipsEligible?: boolean;
  afpId?: string | null;
  afpCode?: string | null;
  afpName?: string | null;
  afpContributionPercent?: string | null;
  healthSystem?: string | null;
  isapreId?: string | null;
  healthContributionMode?: HealthContributionMode | string | null;
  healthContributionValue?: string | null;
  mutualName?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
  jobPositionId?: string | null;
  duties?: string | null;
  salesCommissionType?: SalesCommissionType;
  salesCommissionValue?: string | null;
  activate?: boolean;
  shiftSystemId?: string | null;
  fixedScheduleJson?: Record<string, { start?: string; end?: string } | null> | null;
  flexibleMode?: FlexibleMode | string | null;
  flexibleBandJson?: Record<
    string,
    | {
        earliestStart?: string;
        latestStart?: string;
        earliestEnd?: string;
        latestEnd?: string;
      }
    | null
  > | null;
  art22Exempt?: boolean | null;
  exceptionalResolutionRef?: string | null;
};

function requireCompanyId(): string {
  const companyId = TenantContext.getCompanyId();
  if (!companyId) throw new BadRequestException('Company context required');
  return companyId;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCommission(
  type?: SalesCommissionType | string | null,
  value?: string | null,
): { salesCommissionType: SalesCommissionType; salesCommissionValue: string | null } {
  const t = (type as SalesCommissionType) || SalesCommissionType.NONE;
  if (
    t !== SalesCommissionType.NONE &&
    t !== SalesCommissionType.PERCENT &&
    t !== SalesCommissionType.FIXED
  ) {
    throw new BadRequestException('Tipo de comisión inválido');
  }
  if (t === SalesCommissionType.NONE) {
    return { salesCommissionType: SalesCommissionType.NONE, salesCommissionValue: null };
  }
  const v = value?.trim() || null;
  if (!v) throw new BadRequestException('Indique el valor de la comisión');
  return { salesCommissionType: t, salesCommissionValue: v };
}

function parseWeeklyHours(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n)) throw new BadRequestException('Horas semanales inválidas');
  return n;
}

function isExtraHoursMode(v: string): v is ExtraHoursMode {
  return Object.values(ExtraHoursMode).includes(v as ExtraHoursMode);
}

@Injectable()
export class EmploymentContractsService {
  constructor(
    @InjectRepository(EmploymentContract)
    private readonly contractRepo: Repository<EmploymentContract>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(HrJornadaConfig)
    private readonly configRepo: Repository<HrJornadaConfig>,
    @InjectRepository(HrEmployeeTimelineEntry)
    private readonly timelineRepo: Repository<HrEmployeeTimelineEntry>,
    @InjectRepository(HrAfpFund)
    private readonly afpRepo: Repository<HrAfpFund>,
    @InjectRepository(HrIsapre)
    private readonly isapreRepo: Repository<HrIsapre>,
    @InjectRepository(HrShiftSystem)
    private readonly shiftSystemRepo: Repository<HrShiftSystem>,
    private readonly dataSource: DataSource,
  ) {}

  private async getDefaults(companyId: string) {
    let config = await this.configRepo.findOne({ where: { companyId } });
    if (!config) {
      config = await this.configRepo.save(
        this.configRepo.create({ companyId }),
      );
    }
    return {
      mealAllowance: config.defaultMealAllowance ?? '0',
      transportAllowance: config.defaultTransportAllowance ?? '0',
      workRegime:
        (config.defaultWorkRegime as WorkRegime) || WorkRegime.ORDINARY,
      weeklyHours: Number(config.defaultWeeklyHours ?? 45),
      extraHoursMode:
        (config.defaultExtraHoursMode as ExtraHoursMode) ||
        ExtraHoursMode.PAID_OVERTIME,
      defaultShiftSystemId: config.defaultShiftSystemId ?? null,
    };
  }

  private normalizeForKind(
    kind: EmploymentContractKind,
    input: Partial<CreateContractInput>,
    defaults: Awaited<ReturnType<EmploymentContractsService['getDefaults']>>,
    shiftSnapshot: Awaited<
      ReturnType<EmploymentContractsService['resolveShiftSystemSnapshot']>
    > | null,
  ) {
    if (kind === EmploymentContractKind.FEE) {
      const feeAmount = input.feeAmount?.trim() || null;
      if (!feeAmount) {
        throw new BadRequestException('Honorario (feeAmount) requerido');
      }
      return {
        laborType: null as EmploymentLaborType | null,
        workRegime: null as WorkRegime | null,
        weeklyHours: null as string | null,
        extraHoursMode: null as string | null,
        baseSalary: null as string | null,
        feeAmount,
        mealAllowance: input.mealAllowance ?? defaults.mealAllowance,
        transportAllowance:
          input.transportAllowance ?? defaults.transportAllowance,
        tipsEligible: false,
        afpId: null as string | null,
        healthSystem: null as string | null,
        isapreId: null as string | null,
        healthContributionMode: null as string | null,
        healthContributionValue: null as string | null,
        mutualName: null as string | null,
        shiftSystemId: null as string | null,
        shiftSystemCode: null as string | null,
        shiftSystemName: null as string | null,
        shiftSystemType: null as string | null,
        fixedScheduleJson: null,
        flexibleMode: null as string | null,
        flexibleBandJson: null,
        art22Exempt: null as boolean | null,
        exceptionalResolutionRef: null as string | null,
      };
    }

    if (input.laborType === EmploymentLaborType.PART_TIME) {
      throw new BadRequestException(
        'laborType PART_TIME está deprecado; use workRegime PARTIAL y weeklyHours',
      );
    }

    const workRegime = input.workRegime ?? defaults.workRegime;
    const weeklyHoursNum =
      parseWeeklyHours(input.weeklyHours) ?? defaults.weeklyHours;

    const extraRaw =
      (input.extraHoursMode as string | null | undefined)?.trim() ||
      defaults.extraHoursMode;
    if (!extraRaw || !isExtraHoursMode(extraRaw)) {
      throw new BadRequestException('Modo de horas extras / compensación requerido');
    }

    const baseSalary = input.baseSalary?.trim() || null;
    if (!baseSalary) {
      throw new BadRequestException('Sueldo base requerido');
    }

    const healthSystem = input.healthSystem?.trim().toUpperCase() || null;
    let isapreId = input.isapreId?.trim() || null;
    let healthContributionMode =
      (input.healthContributionMode as string | null | undefined)?.trim() ||
      null;
    let healthContributionValue =
      input.healthContributionValue?.trim() || null;

    if (healthSystem === 'ISAPRE') {
      if (!isapreId) {
        throw new BadRequestException('Isapre requerida cuando salud es Isapre');
      }
      if (
        healthContributionMode !== HealthContributionMode.PERCENT &&
        healthContributionMode !== HealthContributionMode.FIXED
      ) {
        throw new BadRequestException('Modo de aporte Isapre requerido');
      }
      const contribNum = Number(
        String(healthContributionValue ?? '').replace(',', '.'),
      );
      if (!Number.isFinite(contribNum) || contribNum <= 0) {
        throw new BadRequestException('Valor de aporte Isapre inválido');
      }
    } else {
      isapreId = null;
      healthContributionMode = null;
      healthContributionValue = null;
    }

    if (!shiftSnapshot) {
      throw new BadRequestException('Sistema de jornada requerido');
    }

    let flexibleMode =
      (input.flexibleMode as string | null | undefined)?.trim() || null;
    let fixedScheduleJson = input.fixedScheduleJson ?? null;
    let flexibleBandJson = input.flexibleBandJson ?? null;
    let art22Exempt = input.art22Exempt === true ? true : null;
    let exceptionalResolutionRef =
      input.exceptionalResolutionRef?.trim() || null;

    if (shiftSnapshot.shiftSystemType === ShiftSystemType.FLEXIBLE) {
      if (
        !flexibleMode &&
        shiftSnapshot.shiftSystemCode === 'SS00004'
      ) {
        flexibleMode = FlexibleMode.OPEN;
      } else if (!flexibleMode) {
        flexibleMode = FlexibleMode.BAND;
      }
    } else {
      flexibleMode = null;
    }

    if (shiftSnapshot.shiftSystemType !== ShiftSystemType.FIXED) {
      fixedScheduleJson = null;
    }
    if (
      shiftSnapshot.shiftSystemType !== ShiftSystemType.FLEXIBLE ||
      flexibleMode !== FlexibleMode.BAND
    ) {
      flexibleBandJson = null;
    }
    if (shiftSnapshot.shiftSystemType !== ShiftSystemType.FREE) {
      art22Exempt = null;
    }
    if (shiftSnapshot.shiftSystemType !== ShiftSystemType.EXCEPTIONAL) {
      exceptionalResolutionRef = null;
    }

    const shiftErr = assertShiftSystemContractRules({
      shiftSystemType: shiftSnapshot.shiftSystemType,
      fixedScheduleJson,
      flexibleMode,
      flexibleBandJson,
      art22Exempt,
      exceptionalResolutionRef,
      weeklyHours: weeklyHoursNum,
    });
    if (shiftErr) throw new BadRequestException(shiftErr);

    if (
      shiftSnapshot.shiftSystemType !== ShiftSystemType.FREE &&
      !(weeklyHoursNum > 0)
    ) {
      throw new BadRequestException('Horas semanales pactadas requeridas');
    }
    if (
      workRegime === WorkRegime.PARTIAL &&
      weeklyHoursNum > 30
    ) {
      throw new BadRequestException(
        'Jornada parcial: máximo 30 horas semanales (Art. 40 bis)',
      );
    }

    if (shiftSnapshot.shiftSystemType === ShiftSystemType.FREE) {
      // weeklyHours optional for FREE
    }

    return {
      laborType: input.laborType ?? EmploymentLaborType.INDEFINITE,
      workRegime,
      weeklyHours:
        shiftSnapshot.shiftSystemType === ShiftSystemType.FREE && weeklyHoursNum <= 0
          ? null
          : weeklyHoursNum.toFixed(1),
      extraHoursMode: extraRaw,
      baseSalary,
      feeAmount: null as string | null,
      mealAllowance: input.mealAllowance ?? defaults.mealAllowance,
      transportAllowance:
        input.transportAllowance ?? defaults.transportAllowance,
      tipsEligible: input.tipsEligible === true,
      afpId: input.afpId ?? null,
      healthSystem,
      isapreId,
      healthContributionMode,
      healthContributionValue,
      mutualName: input.mutualName?.trim() || null,
      shiftSystemId: shiftSnapshot.shiftSystemId,
      shiftSystemCode: shiftSnapshot.shiftSystemCode,
      shiftSystemName: shiftSnapshot.shiftSystemName,
      shiftSystemType: shiftSnapshot.shiftSystemType,
      fixedScheduleJson,
      flexibleMode,
      flexibleBandJson,
      art22Exempt,
      exceptionalResolutionRef,
    };
  }

  async listByEmployee(employeeId: string) {
    const companyId = requireCompanyId();
    return this.contractRepo.find({
      where: { companyId, employeeId },
      order: { startDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async getActive(employeeId: string) {
    const companyId = requireCompanyId();
    return this.contractRepo.findOne({
      where: {
        companyId,
        employeeId,
        status: EmploymentContractStatus.ACTIVE,
      },
    });
  }

  /** Resumen de propinas/comisión del contrato ACTIVE (lista de empleados). */
  async findActiveCompFlagsByEmployeeIds(
    employeeIds: string[],
  ): Promise<
    Map<
      string,
      {
        tipsEligible: boolean;
        salesCommissionType: SalesCommissionType;
        salesCommissionValue: string | null;
      }
    >
  > {
    const map = new Map<
      string,
      {
        tipsEligible: boolean;
        salesCommissionType: SalesCommissionType;
        salesCommissionValue: string | null;
      }
    >();
    const ids = [...new Set(employeeIds.map((id) => id?.trim()).filter(Boolean))];
    if (ids.length === 0) return map;

    const companyId = TenantContext.getCompanyId();
    if (!companyId) return map;

    const contracts = await this.contractRepo.find({
      where: {
        companyId,
        employeeId: In(ids),
        status: EmploymentContractStatus.ACTIVE,
      },
      select: [
        'id',
        'employeeId',
        'tipsEligible',
        'salesCommissionType',
        'salesCommissionValue',
      ],
    });

    for (const c of contracts) {
      map.set(c.employeeId, {
        tipsEligible: c.tipsEligible === true,
        salesCommissionType:
          c.salesCommissionType ?? SalesCommissionType.NONE,
        salesCommissionValue: c.salesCommissionValue ?? null,
      });
    }
    return map;
  }

  async create(input: CreateContractInput) {
    const companyId = requireCompanyId();
    const employee = await this.employeeRepo.findOne({
      where: { id: input.employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const defaults = await this.getDefaults(companyId);
    const shiftSnapshot =
      input.kind === EmploymentContractKind.FEE
        ? null
        : await this.resolveShiftSystemSnapshot(
            companyId,
            input.shiftSystemId ?? defaults.defaultShiftSystemId,
          );
    const normalized = this.normalizeForKind(
      input.kind,
      input,
      defaults,
      shiftSnapshot,
    );
    const commission = normalizeCommission(
      input.salesCommissionType,
      input.salesCommissionValue,
    );

    const afpSnapshot =
      input.kind === EmploymentContractKind.FEE
        ? {
            afpId: null,
            afpCode: null,
            afpName: null,
            afpContributionPercent: null,
          }
        : await this.resolveAfpSnapshot(companyId, {
            ...input,
            afpId: normalized.afpId,
          });

    const isapreSnapshot =
      input.kind === EmploymentContractKind.FEE || !normalized.isapreId
        ? {
            isapreId: null as string | null,
            isapreCode: null as string | null,
            isapreName: null as string | null,
          }
        : await this.resolveIsapreSnapshot(companyId, normalized.isapreId);

    const wantActive =
      input.activate === true ||
      input.status === EmploymentContractStatus.ACTIVE;

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(EmploymentContract);
      const empRepo = manager.getRepository(Employee);
      const timelineRepo = manager.getRepository(HrEmployeeTimelineEntry);

      let supersededId: string | null = null;
      if (wantActive) {
        const previous = await repo.findOne({
          where: {
            companyId,
            employeeId: input.employeeId,
            status: EmploymentContractStatus.ACTIVE,
          },
        });
        if (previous) {
          supersededId = previous.id;
          previous.status = EmploymentContractStatus.TERMINATED;
          if (!previous.endDate) previous.endDate = todayIso();
          await repo.save(previous);
        }
      }

      const saved = await repo.save(
        repo.create({
          companyId,
          employeeId: input.employeeId,
          branchId: input.branchId ?? employee.branchId ?? null,
          kind: input.kind,
          laborType: normalized.laborType,
          status: wantActive
            ? EmploymentContractStatus.ACTIVE
            : input.status ?? EmploymentContractStatus.DRAFT,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          baseSalary: normalized.baseSalary,
          feeAmount: normalized.feeAmount,
          workRegime: normalized.workRegime,
          weeklyHours: normalized.weeklyHours,
          extraHoursMode: normalized.extraHoursMode,
          mealAllowance: normalized.mealAllowance,
          transportAllowance: normalized.transportAllowance,
          tipsEligible: normalized.tipsEligible,
          afpId: afpSnapshot.afpId,
          afpCode: afpSnapshot.afpCode,
          afpName: afpSnapshot.afpName,
          afpContributionPercent: afpSnapshot.afpContributionPercent,
          healthSystem: normalized.healthSystem,
          isapreId: isapreSnapshot.isapreId,
          isapreCode: isapreSnapshot.isapreCode,
          isapreName: isapreSnapshot.isapreName,
          healthContributionMode: normalized.healthContributionMode,
          healthContributionValue: normalized.healthContributionValue,
          mutualName: normalized.mutualName,
          shiftSystemId: normalized.shiftSystemId,
          shiftSystemCode: normalized.shiftSystemCode,
          shiftSystemName: normalized.shiftSystemName,
          shiftSystemType: normalized.shiftSystemType,
          fixedScheduleJson: normalized.fixedScheduleJson,
          flexibleMode: normalized.flexibleMode,
          flexibleBandJson: normalized.flexibleBandJson,
          art22Exempt: normalized.art22Exempt,
          exceptionalResolutionRef: normalized.exceptionalResolutionRef,
          notes: input.notes ?? null,
          documentUrl: input.documentUrl ?? null,
          supersedesContractId: supersededId,
          jobPositionId: input.jobPositionId ?? null,
          duties: input.duties?.trim() || null,
          salesCommissionType: commission.salesCommissionType,
          salesCommissionValue: commission.salesCommissionValue,
        }),
      );

      if (saved.status === EmploymentContractStatus.ACTIVE) {
        await this.syncEmployeeCache(empRepo, employee.id, saved);
      }

      const kind = supersededId
        ? HrEmployeeTimelineKind.CONTRACT_SUPERSEDED
        : HrEmployeeTimelineKind.CONTRACT_CREATED;
      await timelineRepo.save(
        timelineRepo.create({
          companyId,
          employeeId: input.employeeId,
          occurredAt: new Date(),
          kind,
          title: supersededId
            ? 'Contrato actualizado (nueva versión)'
            : 'Contrato creado',
          body: null,
          sourceType: 'employment_contract',
          sourceId: saved.id,
          payload: { supersedesContractId: supersededId },
        }),
      );

      return saved;
    });
  }

  async updateDocumentUrl(contractId: string, documentUrl: string | null) {
    const companyId = requireCompanyId();
    const contract = await this.contractRepo.findOne({
      where: { id: contractId, companyId },
    });
    if (!contract) throw new NotFoundException('Contrato no encontrado');
    if (contract.status !== EmploymentContractStatus.DRAFT) {
      throw new BadRequestException(
        'Los contratos activos no se editan; cree una nueva versión',
      );
    }
    contract.documentUrl = documentUrl;
    return this.contractRepo.save(contract);
  }

  async update(_contractId: string, _patch: Partial<CreateContractInput>) {
    throw new BadRequestException(
      'Los contratos no se actualizan; cree una nueva versión con POST /contracts (activate: true)',
    );
  }

  async activate(contractId: string) {
    const companyId = requireCompanyId();
    const contract = await this.contractRepo.findOne({
      where: { id: contractId, companyId },
    });
    if (!contract) throw new NotFoundException('Contrato no encontrado');
    if (contract.status === EmploymentContractStatus.ACTIVE) return contract;
    if (contract.status !== EmploymentContractStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden activar borradores');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(EmploymentContract);
      const empRepo = manager.getRepository(Employee);
      const timelineRepo = manager.getRepository(HrEmployeeTimelineEntry);

      let supersededId: string | null = null;
      const previous = await repo.findOne({
        where: {
          companyId,
          employeeId: contract.employeeId,
          status: EmploymentContractStatus.ACTIVE,
        },
      });
      if (previous) {
        supersededId = previous.id;
        previous.status = EmploymentContractStatus.TERMINATED;
        if (!previous.endDate) previous.endDate = todayIso();
        await repo.save(previous);
      }

      contract.status = EmploymentContractStatus.ACTIVE;
      contract.supersedesContractId = supersededId ?? contract.supersedesContractId;
      const saved = await repo.save(contract);
      await this.syncEmployeeCache(empRepo, saved.employeeId, saved);

      await timelineRepo.save(
        timelineRepo.create({
          companyId,
          employeeId: saved.employeeId,
          occurredAt: new Date(),
          kind: supersededId
            ? HrEmployeeTimelineKind.CONTRACT_SUPERSEDED
            : HrEmployeeTimelineKind.CONTRACT_CREATED,
          title: supersededId
            ? 'Contrato activado (reemplaza versión anterior)'
            : 'Contrato activado',
          sourceType: 'employment_contract',
          sourceId: saved.id,
          payload: { supersedesContractId: supersededId },
        }),
      );

      return saved;
    });
  }

  private async syncEmployeeCache(
    empRepo: Repository<Employee>,
    employeeId: string,
    contract: EmploymentContract,
  ) {
    const salary =
      contract.kind === EmploymentContractKind.FEE
        ? contract.feeAmount
        : contract.baseSalary;
    if (contract.workRegime) {
      await empRepo.update(employeeId, {
        baseSalary: salary ?? null,
        workRegime: contract.workRegime,
        branchId: contract.branchId ?? undefined,
      });
    } else {
      await empRepo.update(employeeId, {
        baseSalary: salary ?? null,
        branchId: contract.branchId ?? undefined,
      });
    }
  }

  private async resolveAfpSnapshot(
    companyId: string,
    input: Pick<CreateContractInput, 'afpId'>,
  ): Promise<{
    afpId: string | null;
    afpCode: string | null;
    afpName: string | null;
    afpContributionPercent: string | null;
  }> {
    const afpId = input.afpId?.trim() || null;
    if (!afpId) {
      return {
        afpId: null,
        afpCode: null,
        afpName: null,
        afpContributionPercent: null,
      };
    }
    const fund = await this.afpRepo.findOne({
      where: { id: afpId, companyId },
    });
    if (!fund || fund.deletedAt) {
      throw new BadRequestException('AFP no encontrada');
    }
    if (!fund.isActive) {
      throw new BadRequestException('AFP inactiva');
    }
    return {
      afpId: fund.id,
      afpCode: fund.code,
      afpName: fund.name,
      afpContributionPercent: fund.contributionPercent,
    };
  }

  private async resolveShiftSystemSnapshot(
    companyId: string,
    shiftSystemId: string | null | undefined,
  ): Promise<{
    shiftSystemId: string;
    shiftSystemCode: string;
    shiftSystemName: string;
    shiftSystemType: ShiftSystemType;
    generatesLateEvents: boolean;
    overtimeEnabled: boolean;
    requiresPlannerAssignment: boolean;
  }> {
    const id = shiftSystemId?.trim() || null;
    if (!id) {
      throw new BadRequestException('Sistema de jornada requerido');
    }
    const row = await this.shiftSystemRepo.findOne({
      where: { id, companyId },
    });
    if (!row || row.deletedAt) {
      throw new BadRequestException('Sistema de jornada no encontrado');
    }
    if (!row.isActive) {
      throw new BadRequestException('Sistema de jornada inactivo');
    }
    return {
      shiftSystemId: row.id,
      shiftSystemCode: row.code,
      shiftSystemName: row.name,
      shiftSystemType: row.type,
      generatesLateEvents: row.generatesLateEvents,
      overtimeEnabled: row.overtimeEnabled,
      requiresPlannerAssignment: row.requiresPlannerAssignment,
    };
  }

  private async resolveIsapreSnapshot(
    companyId: string,
    isapreId: string,
  ): Promise<{
    isapreId: string;
    isapreCode: string;
    isapreName: string;
  }> {
    const row = await this.isapreRepo.findOne({
      where: { id: isapreId, companyId },
    });
    if (!row || row.deletedAt) {
      throw new BadRequestException('Isapre no encontrada');
    }
    if (!row.isActive) {
      throw new BadRequestException('Isapre inactiva');
    }
    return {
      isapreId: row.id,
      isapreCode: row.externalCode,
      isapreName: row.name,
    };
  }
}
