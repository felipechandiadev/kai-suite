import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Employee, WorkRegime } from '../domain/employee.entity';
import { EmploymentContract } from '../domain/employment-contract.entity';
import {
  EmploymentContractKind,
  EmploymentContractStatus,
  EmploymentLaborType,
  SalesCommissionType,
} from '../domain/employment-contract.enums';
import { HrJornadaConfig } from '@modules/hr-jornada/domain/hr-jornada-config.entity';
import {
  HrEmployeeTimelineEntry,
  HrEmployeeTimelineKind,
} from '../domain/hr-employee-timeline-entry.entity';
import { HrAfpFund } from '../domain/hr-afp-fund.entity';

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
  workRegime?: WorkRegime;
  mealAllowance?: string;
  transportAllowance?: string;
  tipsEligible?: boolean;
  afpId?: string | null;
  afpCode?: string | null;
  afpName?: string | null;
  afpContributionPercent?: string | null;
  healthSystem?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
  jobPositionId?: string | null;
  duties?: string | null;
  salesCommissionType?: SalesCommissionType;
  salesCommissionValue?: string | null;
  activate?: boolean;
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
    };
  }

  private normalizeForKind(
    kind: EmploymentContractKind,
    input: Partial<CreateContractInput>,
    defaults: Awaited<ReturnType<EmploymentContractsService['getDefaults']>>,
  ) {
    if (kind === EmploymentContractKind.FEE) {
      return {
        laborType: null as EmploymentLaborType | null,
        workRegime: WorkRegime.ORDINARY,
        baseSalary: null as string | null,
        feeAmount: input.feeAmount ?? null,
        mealAllowance: input.mealAllowance ?? defaults.mealAllowance,
        transportAllowance:
          input.transportAllowance ?? defaults.transportAllowance,
      };
    }
    return {
      laborType: input.laborType ?? EmploymentLaborType.INDEFINITE,
      workRegime: input.workRegime ?? defaults.workRegime,
      baseSalary: input.baseSalary ?? null,
      feeAmount: null as string | null,
      mealAllowance: input.mealAllowance ?? defaults.mealAllowance,
      transportAllowance:
        input.transportAllowance ?? defaults.transportAllowance,
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

  /**
   * Creates a contract. If activate=true and an ACTIVE exists, terminates it
   * (immutable supersede) and links supersedesContractId.
   */
  async create(input: CreateContractInput) {
    const companyId = requireCompanyId();
    const employee = await this.employeeRepo.findOne({
      where: { id: input.employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const defaults = await this.getDefaults(companyId);
    const normalized = this.normalizeForKind(input.kind, input, defaults);
    const commission = normalizeCommission(
      input.salesCommissionType,
      input.salesCommissionValue,
    );
    const afpSnapshot = await this.resolveAfpSnapshot(companyId, input);
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
          mealAllowance: normalized.mealAllowance,
          transportAllowance: normalized.transportAllowance,
          tipsEligible: input.tipsEligible === true,
          afpId: afpSnapshot.afpId,
          afpCode: afpSnapshot.afpCode,
          afpName: afpSnapshot.afpName,
          afpContributionPercent: afpSnapshot.afpContributionPercent,
          healthSystem: input.healthSystem ?? null,
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

  /** DRAFT only: attach documentUrl. Business fields are immutable. */
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
    await empRepo.update(employeeId, {
      baseSalary: salary ?? null,
      workRegime: contract.workRegime,
      branchId: contract.branchId ?? undefined,
    });
  }

  private async resolveAfpSnapshot(
    companyId: string,
    input: CreateContractInput,
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
}
