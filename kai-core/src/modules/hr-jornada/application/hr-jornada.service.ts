import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventBus } from '@nestjs/cqrs';
import { Between, In, IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { TenantContext } from '@common/tenant/tenant.context';
import { Employee, EmployeeStatus } from '@modules/employees/domain/employee.entity';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import { EmploymentContractStatus } from '@modules/employees/domain/employment-contract.enums';
import { HrJornadaConfig } from '../domain/hr-jornada-config.entity';
import { HrHoliday, HrHolidayOverride } from '../domain/hr-holiday.entity';
import { HrShiftTemplate } from '../domain/hr-shift-template.entity';
import { HrShiftInstance } from '../domain/hr-shift-instance.entity';
import { HrShiftAssignment } from '../domain/hr-shift-assignment.entity';
import { HrShiftException } from '../domain/hr-shift-exception.entity';
import { HrCompensatoryLedgerEntry } from '../domain/hr-compensatory-ledger-entry.entity';
import { HrScheduleFindingAudit } from '../domain/hr-schedule-finding-audit.entity';
import { HrEmployeeDocument } from '../domain/hr-employee-document.entity';
import { HrTimeEntry } from '../domain/hr-time-entry.entity';
import {
  EmployeeShiftStatus,
  HrEmployeeShift,
} from '../domain/hr-employee-shift.entity';
import {
  CompensatoryLedgerEntryType,
  EnforcementMode,
  HrDocumentKind,
  HrDocumentStatus,
  ShiftExceptionType,
  ShiftTemplateType,
  FindingSeverity,
} from '../domain/hr-jornada.enums';
import {
  ScheduleFinding,
  worstSeverity,
} from '../domain/schedule-finding';
import {
  deductionAmountCents,
  evaluateSchedule,
  overtimeAmountCents,
  ScheduleAssignmentSnapshot,
} from '../domain/rules/rules-engine';
import {
  AttendanceContext,
  contractWeeklyMinutes,
  evaluateTimeEntry,
  shouldEmitOvertime,
  shouldSettleLateException,
} from '../domain/rules/attendance-evaluator';
import { HrLaborUnitShift } from '../domain/hr-labor-unit-shift.entity';
import {
  HrLaborUnitShiftMember,
  LaborUnitShiftMemberStatus,
} from '../domain/hr-labor-unit-shift-member.entity';
import { HrShiftSystem } from '../domain/hr-shift-system.entity';
import { classifyShiftSlot } from '../domain/rules/night-window.util';
import {
  CompensatoryRestCreditedEvent,
  CompensatoryRestRedeemedEvent,
  OvertimeGeneratedEvent,
  ShiftExceptionSettledEvent,
} from '../domain/events/hr-jornada.events';
import { HrEmployeeTimelineService } from '@modules/employees/application/hr-employee-timeline.service';
import { HrEmployeeTimelineKind } from '@modules/employees/domain/hr-employee-timeline-entry.entity';

export type WeekAssignmentInput = {
  id?: string;
  employeeId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  plannedOvertimeMinutes?: number;
  templateId?: string | null;
  laborUnitShiftId?: string | null;
  isNight?: boolean;
  isNightOutgoing?: boolean;
  notes?: string | null;
  timezone?: string;
};

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function requireCompanyId(): string {
  const companyId = TenantContext.getCompanyId();
  if (!companyId) throw new BadRequestException('Company context required');
  return companyId;
}

@Injectable()
export class HrJornadaService {
  constructor(
    @InjectRepository(HrJornadaConfig)
    private readonly configRepo: Repository<HrJornadaConfig>,
    @InjectRepository(HrHoliday)
    private readonly holidayRepo: Repository<HrHoliday>,
    @InjectRepository(HrHolidayOverride)
    private readonly holidayOverrideRepo: Repository<HrHolidayOverride>,
    @InjectRepository(HrShiftTemplate)
    private readonly templateRepo: Repository<HrShiftTemplate>,
    @InjectRepository(HrShiftInstance)
    private readonly instanceRepo: Repository<HrShiftInstance>,
    @InjectRepository(HrShiftAssignment)
    private readonly assignmentRepo: Repository<HrShiftAssignment>,
    @InjectRepository(HrShiftException)
    private readonly exceptionRepo: Repository<HrShiftException>,
    @InjectRepository(HrCompensatoryLedgerEntry)
    private readonly ledgerRepo: Repository<HrCompensatoryLedgerEntry>,
    @InjectRepository(HrScheduleFindingAudit)
    private readonly auditRepo: Repository<HrScheduleFindingAudit>,
    @InjectRepository(HrEmployeeDocument)
    private readonly documentRepo: Repository<HrEmployeeDocument>,
    @InjectRepository(HrTimeEntry)
    private readonly timeEntryRepo: Repository<HrTimeEntry>,
    @InjectRepository(HrEmployeeShift)
    private readonly employeeShiftRepo: Repository<HrEmployeeShift>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmploymentContract)
    private readonly contractRepo: Repository<EmploymentContract>,
    @InjectRepository(HrShiftSystem)
    private readonly shiftSystemRepo: Repository<HrShiftSystem>,
    @InjectRepository(HrLaborUnitShift)
    private readonly laborUnitShiftRepo: Repository<HrLaborUnitShift>,
    @InjectRepository(HrLaborUnitShiftMember)
    private readonly laborUnitShiftMemberRepo: Repository<HrLaborUnitShiftMember>,
    private readonly eventBus: EventBus,
    private readonly timelineService: HrEmployeeTimelineService,
  ) {}

  private async loadActiveContracts(
    employeeIds: string[],
    companyId: string,
  ): Promise<Map<string, EmploymentContract>> {
    if (!employeeIds.length) return new Map();
    const rows = await this.contractRepo.find({
      where: {
        companyId,
        employeeId: In(employeeIds),
        status: EmploymentContractStatus.ACTIVE,
      },
    });
    return new Map(rows.map((r) => [r.employeeId, r]));
  }

  private async resolveAttendanceContext(
    contract: EmploymentContract | undefined,
    expectedAssignment?: {
      workDate: string;
      startTime: string;
      endTime: string;
    } | null,
  ): Promise<AttendanceContext | null> {
    if (!contract?.shiftSystemType) return null;
    let generatesLateEvents = true;
    let overtimeEnabled = true;
    if (contract.shiftSystemId) {
      const sys = await this.shiftSystemRepo.findOne({
        where: { id: contract.shiftSystemId },
      });
      if (sys) {
        generatesLateEvents = sys.generatesLateEvents;
        overtimeEnabled = sys.overtimeEnabled;
      }
    }
    return {
      shiftSystemType: contract.shiftSystemType,
      flexibleMode: contract.flexibleMode,
      generatesLateEvents,
      overtimeEnabled,
      fixedScheduleJson: contract.fixedScheduleJson ?? null,
      flexibleBandJson: contract.flexibleBandJson ?? null,
      expectedAssignment: expectedAssignment ?? null,
    };
  }

  private async appendTimelineSafe(
    input: Parameters<HrEmployeeTimelineService['append']>[0],
  ) {
    try {
      await this.timelineService.append(input);
    } catch {
      // never fail business write because of timeline
    }
  }

  async getOrCreateConfig(): Promise<HrJornadaConfig> {
    const companyId = requireCompanyId();
    let config = await this.configRepo.findOne({ where: { companyId } });
    if (!config) {
      config = await this.configRepo.save(
        this.configRepo.create({
          companyId,
          enforcementMode: EnforcementMode.ALERT_ONLY,
        }),
      );
    }
    return config;
  }

  async updateConfig(
    patch: Partial<HrJornadaConfig>,
  ): Promise<HrJornadaConfig> {
    const config = await this.getOrCreateConfig();
    const allowed: (keyof HrJornadaConfig)[] = [
      'enforcementMode',
      'monthlyOrdinaryHours',
      'overtimeMultiplier',
      'minRestBetweenShiftsMinutes',
      'nightStart',
      'nightEnd',
      'maxWeeklyMinutes',
      'maxMonthlyMinutes',
      'maxDailyOvertimeMinutes',
      'allowShiftOverlap',
      'exceptionDeductionPolicy',
      'compensatoryExpiryDays',
      'defaultMealAllowance',
      'defaultTransportAllowance',
      'defaultWorkRegime',
      'defaultWeeklyHours',
      'defaultExtraHoursMode',
      'defaultShiftSystemId',
    ];
    for (const key of allowed) {
      if (patch[key] !== undefined) {
        (config as any)[key] = patch[key];
      }
    }
    return this.configRepo.save(config);
  }

  async listHolidays(from: string, to: string, companyId?: string) {
    const cid = companyId ?? requireCompanyId();
    const base = await this.holidayRepo.find({
      where: { date: Between(from, to) },
      order: { date: 'ASC' },
    });
    const overrides = await this.holidayOverrideRepo.find({
      where: { companyId: cid, date: Between(from, to) },
    });
    const byDate = new Map(base.map((h) => [h.date, { ...h, isOverride: false }]));
    for (const o of overrides) {
      if (o.isRemoved) byDate.delete(o.date);
      else
        byDate.set(o.date, {
          id: o.id,
          date: o.date,
          name: o.name,
          countryCode: 'CL',
          createdAt: o.createdAt,
          isOverride: true,
        } as any);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  async upsertHolidayOverride(input: {
    date: string;
    name: string;
    isRemoved?: boolean;
  }) {
    const companyId = requireCompanyId();
    let row = await this.holidayOverrideRepo.findOne({
      where: { companyId, date: input.date },
    });
    if (!row) {
      row = this.holidayOverrideRepo.create({
        companyId,
        date: input.date,
        name: input.name,
        isRemoved: input.isRemoved ?? false,
      });
    } else {
      row.name = input.name;
      row.isRemoved = input.isRemoved ?? false;
    }
    return this.holidayOverrideRepo.save(row);
  }

  // --- Templates ---
  async listTemplates() {
    const companyId = requireCompanyId();
    return this.templateRepo.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async createTemplate(input: {
    name: string;
    type: ShiftTemplateType;
    isNight?: boolean;
    isNightOutgoing?: boolean;
    scheduleJson?: Record<string, unknown> | null;
    timezone?: string | null;
  }) {
    const companyId = requireCompanyId();
    return this.templateRepo.save(
      this.templateRepo.create({
        companyId,
        name: input.name,
        type: input.type,
        isNight: input.isNight ?? false,
        isNightOutgoing: input.isNightOutgoing ?? false,
        scheduleJson: input.scheduleJson ?? null,
        timezone: input.timezone ?? 'America/Santiago',
      }),
    );
  }

  async updateTemplate(
    id: string,
    patch: Partial<{
      name: string;
      type: ShiftTemplateType;
      isNight: boolean;
      isNightOutgoing: boolean;
      scheduleJson: Record<string, unknown> | null;
      timezone: string | null;
    }>,
  ) {
    const companyId = requireCompanyId();
    const row = await this.templateRepo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Plantilla no encontrada');
    Object.assign(row, patch);
    return this.templateRepo.save(row);
  }

  async deleteTemplate(id: string) {
    const companyId = requireCompanyId();
    const row = await this.templateRepo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Plantilla no encontrada');
    await this.templateRepo.softDelete(id);
    return { success: true };
  }

  // --- Week plan ---
  async getWeek(weekStart: string, laborUnitId?: string | null, branchId?: string | null) {
    const companyId = requireCompanyId();
    const weekEnd = addDaysIso(weekStart, 6);
    const config = await this.getOrCreateConfig();

    const empWhere: any = {
      companyId,
      status: EmployeeStatus.ACTIVE,
    };
    if (laborUnitId) {
      empWhere.laborUnitId = laborUnitId;
    } else if (branchId) {
      empWhere.branchId = branchId;
    }

    const employees = await this.employeeRepo.find({
      where: empWhere,
      relations: ['person'],
      order: { hireDate: 'ASC' },
    });

    const instances = await this.instanceRepo.find({
      where: {
        companyId,
        workDate: Between(weekStart, weekEnd),
      },
      relations: ['assignments'],
      order: { workDate: 'ASC', startTime: 'ASC' },
    });

    const employeeIds = employees.map((e) => e.id);
    const balances = await this.getCompensatoryBalances(employeeIds);
    const exceptions = await this.exceptionRepo.find({
      where: {
        companyId,
        workDate: Between(weekStart, weekEnd),
      },
    });

    const assignments: ScheduleAssignmentSnapshot[] = [];
    for (const inst of instances) {
      for (const a of inst.assignments ?? []) {
        if (a.deletedAt) continue;
        if ((laborUnitId || branchId) && !employeeIds.includes(a.employeeId))
          continue;
        assignments.push({
          assignmentId: a.id,
          employeeId: a.employeeId,
          workDate: inst.workDate,
          startTime: inst.startTime,
          endTime: inst.endTime,
          plannedOvertimeMinutes: a.plannedOvertimeMinutes,
          isNightOutgoing: inst.isNightOutgoing,
          compensatoryBalanceMinutes: balances.get(a.employeeId) ?? 0,
        });
      }
    }

    const contracts = await this.loadActiveContracts(employeeIds, companyId);
    const maxWeeklyByEmployee = new Map<string, number | null | undefined>();
    const employeeNames = new Map<string, string>();
    for (const e of employees) {
      employeeNames.set(
        e.id,
        e.person
          ? `${e.person.firstName ?? ''} ${e.person.lastName ?? ''}`.trim()
          : e.id,
      );
    }
    for (const id of employeeIds) {
      const c = contracts.get(id);
      const fromContract = contractWeeklyMinutes(c?.weeklyHours ?? null);
      maxWeeklyByEmployee.set(
        id,
        fromContract ?? config.maxWeeklyMinutes ?? null,
      );
    }

    const findings = evaluateSchedule(
      assignments,
      {
        maxDailyOvertimeMinutes: config.maxDailyOvertimeMinutes,
        minRestBetweenShiftsMinutes: config.minRestBetweenShiftsMinutes,
        maxWeeklyMinutes: config.maxWeeklyMinutes,
        maxMonthlyMinutes: config.maxMonthlyMinutes,
        allowShiftOverlap: config.allowShiftOverlap,
        nightStart: config.nightStart,
        nightEnd: config.nightEnd,
      },
      maxWeeklyByEmployee,
      employeeNames,
    );

    const holidays = await this.listHolidays(weekStart, weekEnd, companyId);

    return {
      weekStart,
      weekEnd,
      config,
      holidays,
      employees: employees.map((e) => ({
        id: e.id,
        personId: e.personId,
        branchId: e.branchId ?? null,
        laborUnitId: e.laborUnitId ?? null,
        workRegime: (e as any).workRegime ?? 'ORDINARY',
        baseSalary: e.baseSalary ?? null,
        displayName: e.person
          ? `${e.person.firstName ?? ''} ${e.person.lastName ?? ''}`.trim()
          : e.id,
        compensatoryBalanceMinutes: balances.get(e.id) ?? 0,
      })),
      instances: instances.map((inst) => ({
        id: inst.id,
        workDate: inst.workDate,
        startTime: inst.startTime,
        endTime: inst.endTime,
        timezone: inst.timezone,
        templateId: inst.templateId ?? null,
        laborUnitShiftId: inst.laborUnitShiftId ?? null,
        isNight: inst.isNight,
        isNightOutgoing: inst.isNightOutgoing,
        assignments: (inst.assignments ?? [])
          .filter((a) => !a.deletedAt)
          .filter(
            (a) =>
              !(laborUnitId || branchId) || employeeIds.includes(a.employeeId),
          )
          .map((a) => ({
            id: a.id,
            employeeId: a.employeeId,
            plannedOvertimeMinutes: a.plannedOvertimeMinutes,
            notes: a.notes ?? null,
          })),
      })),
      exceptions,
      findings,
      worstSeverity: worstSeverity(findings),
    };
  }

  async validateWeek(assignments: WeekAssignmentInput[]) {
    const config = await this.getOrCreateConfig();
    const companyId = requireCompanyId();
    const employeeIds = [...new Set(assignments.map((a) => a.employeeId))];
    const balances = await this.getCompensatoryBalances(employeeIds);
    const contracts = await this.loadActiveContracts(employeeIds, companyId);
    const employees = employeeIds.length
      ? await this.employeeRepo.find({
          where: { companyId, id: In(employeeIds) },
          relations: ['person'],
        })
      : [];
    const employeeNames = new Map<string, string>();
    for (const e of employees) {
      employeeNames.set(
        e.id,
        e.person
          ? `${e.person.firstName ?? ''} ${e.person.lastName ?? ''}`.trim()
          : e.id,
      );
    }
    const maxWeeklyByEmployee = new Map<string, number | null | undefined>();
    for (const id of employeeIds) {
      const c = contracts.get(id);
      maxWeeklyByEmployee.set(
        id,
        contractWeeklyMinutes(c?.weeklyHours ?? null) ??
          config.maxWeeklyMinutes ??
          null,
      );
    }
    const snapshots: ScheduleAssignmentSnapshot[] = assignments.map((a) => ({
      employeeId: a.employeeId,
      workDate: a.workDate,
      startTime: a.startTime,
      endTime: a.endTime,
      plannedOvertimeMinutes: a.plannedOvertimeMinutes ?? 0,
      isNightOutgoing: a.isNightOutgoing,
      compensatoryBalanceMinutes: balances.get(a.employeeId) ?? 0,
    }));
    const findings = evaluateSchedule(
      snapshots,
      {
        maxDailyOvertimeMinutes: config.maxDailyOvertimeMinutes,
        minRestBetweenShiftsMinutes: config.minRestBetweenShiftsMinutes,
        maxWeeklyMinutes: config.maxWeeklyMinutes,
        maxMonthlyMinutes: config.maxMonthlyMinutes,
        allowShiftOverlap: config.allowShiftOverlap,
        nightStart: config.nightStart,
        nightEnd: config.nightEnd,
      },
      maxWeeklyByEmployee,
      employeeNames,
    );
    return { findings, worstSeverity: worstSeverity(findings) };
  }

  async saveWeek(input: {
    weekStart: string;
    assignments: WeekAssignmentInput[];
    overrideReason?: string | null;
    laborUnitId?: string | null;
    branchId?: string | null;
  }) {
    const companyId = requireCompanyId();
    const userId = TenantContext.getUserId() ?? null;
    const weekEnd = addDaysIso(input.weekStart, 6);

    for (const a of input.assignments) {
      if (!a.employeeId || !a.workDate || !a.startTime || !a.endTime) {
        throw new BadRequestException('Asignación incompleta');
      }
      if (!/^\d{2}:\d{2}$/.test(a.startTime) || !/^\d{2}:\d{2}$/.test(a.endTime)) {
        throw new BadRequestException('Horario inválido (HH:mm)');
      }
    }

    const validation = await this.validateWeek(input.assignments);
    if (
      validation.worstSeverity === FindingSeverity.CRITICAL &&
      !(input.overrideReason && input.overrideReason.trim())
    ) {
      throw new BadRequestException(
        'Se requiere motivo de override cuando hay hallazgos CRITICAL',
      );
    }

    // Replace week assignments for company (soft-delete old in range)
    const existing = await this.instanceRepo.find({
      where: {
        companyId,
        workDate: Between(input.weekStart, weekEnd),
      },
      relations: ['assignments'],
    });
    for (const inst of existing) {
      await this.assignmentRepo.softDelete({ instanceId: inst.id } as any);
      await this.instanceRepo.softDelete(inst.id);
    }

    const createdInstances: HrShiftInstance[] = [];
    // Group by workDate+start+end+flags to share instances
    const groupKey = (a: WeekAssignmentInput) =>
      `${a.workDate}|${a.startTime}|${a.endTime}|${a.isNight ? 1 : 0}|${a.isNightOutgoing ? 1 : 0}|${a.templateId ?? ''}|${a.laborUnitShiftId ?? ''}`;
    const groups = new Map<string, WeekAssignmentInput[]>();
    for (const a of input.assignments) {
      const k = groupKey(a);
      const list = groups.get(k) ?? [];
      list.push(a);
      groups.set(k, list);
    }

    for (const [, group] of groups) {
      const first = group[0];
      const inst = await this.instanceRepo.save(
        this.instanceRepo.create({
          companyId,
          templateId: first.templateId ?? null,
          laborUnitShiftId: first.laborUnitShiftId ?? null,
          workDate: first.workDate,
          startTime: first.startTime,
          endTime: first.endTime,
          timezone: first.timezone ?? 'America/Santiago',
          isNight: first.isNight ?? false,
          isNightOutgoing: first.isNightOutgoing ?? false,
        }),
      );
      createdInstances.push(inst);
      for (const a of group) {
        await this.assignmentRepo.save(
          this.assignmentRepo.create({
            companyId,
            instanceId: inst.id,
            employeeId: a.employeeId,
            plannedOvertimeMinutes: a.plannedOvertimeMinutes ?? 0,
            notes: a.notes ?? null,
          }),
        );
      }
    }

    if (
      validation.worstSeverity === FindingSeverity.WARNING ||
      validation.worstSeverity === FindingSeverity.CRITICAL
    ) {
      await this.auditRepo.save(
        this.auditRepo.create({
          companyId,
          userId,
          weekStart: input.weekStart,
          findings: validation.findings,
          overrideReason: input.overrideReason ?? null,
          worstSeverity: validation.worstSeverity,
        }),
      );
    }

    return this.getWeek(input.weekStart, input.laborUnitId, input.branchId);
  }

  // --- Exceptions ---
  async listExceptions(from: string, to: string) {
    const companyId = requireCompanyId();
    return this.exceptionRepo.find({
      where: { companyId, workDate: Between(from, to) },
      order: { workDate: 'ASC' },
    });
  }

  async createException(input: {
    employeeId: string;
    assignmentId?: string | null;
    workDate: string;
    type: ShiftExceptionType;
    minutes?: number;
    notes?: string | null;
    affectsPayroll?: boolean;
  }) {
    const companyId = requireCompanyId();
    const contracts = await this.loadActiveContracts([input.employeeId], companyId);
    const contract = contracts.get(input.employeeId);
    if (
      input.type === ShiftExceptionType.LATE ||
      input.type === ShiftExceptionType.EARLY_LEAVE
    ) {
      const ctx = await this.resolveAttendanceContext(contract);
      if (ctx && !shouldSettleLateException(ctx)) {
        throw new BadRequestException(
          'El contrato activo no permite registrar atrasos (jornada sin control o flexible sin banda)',
        );
      }
    }
    const userId = TenantContext.getUserId() ?? null;
    const affects =
      input.affectsPayroll ??
      (input.type !== ShiftExceptionType.PAID_LEAVE);
    const saved = await this.exceptionRepo.save(
      this.exceptionRepo.create({
        companyId,
        employeeId: input.employeeId,
        assignmentId: input.assignmentId ?? null,
        workDate: input.workDate,
        type: input.type,
        minutes: input.minutes ?? 0,
        notes: input.notes ?? null,
        affectsPayroll: affects,
        createdBy: userId,
      }),
    );
    await this.appendTimelineSafe({
      employeeId: input.employeeId,
      kind: HrEmployeeTimelineKind.SCHEDULE_EXCEPTION,
      title: `Excepción de jornada: ${input.type}`,
      body: input.notes?.trim() || `Fecha ${input.workDate}`,
      actorUserId: userId,
      sourceType: 'HrShiftException',
      sourceId: saved.id,
      payload: {
        type: input.type,
        workDate: input.workDate,
        minutes: input.minutes ?? 0,
      },
    });
    return saved;
  }

  async settleExceptions(periodStart: string, periodEnd: string) {
    const companyId = requireCompanyId();
    const config = await this.getOrCreateConfig();
    const pending = await this.exceptionRepo.find({
      where: {
        companyId,
        workDate: Between(periodStart, periodEnd),
        settled: false,
        affectsPayroll: true,
      },
    });

    const settled: HrShiftException[] = [];
    const contractCache = new Map<string, EmploymentContract>();
    for (const ex of pending) {
      if (ex.type === ShiftExceptionType.PAID_LEAVE) {
        ex.settled = true;
        ex.settledAt = new Date();
        await this.exceptionRepo.save(ex);
        continue;
      }
      let contract = contractCache.get(ex.employeeId);
      if (!contract) {
        const map = await this.loadActiveContracts([ex.employeeId], companyId);
        contract = map.get(ex.employeeId);
        if (contract) contractCache.set(ex.employeeId, contract);
      }
      if (
        ex.type === ShiftExceptionType.LATE ||
        ex.type === ShiftExceptionType.EARLY_LEAVE
      ) {
        const ctx = await this.resolveAttendanceContext(contract);
        if (ctx && !shouldSettleLateException(ctx)) {
          ex.settled = true;
          ex.settledAt = new Date();
          ex.affectsPayroll = false;
          await this.exceptionRepo.save(ex);
          continue;
        }
      }
      const employee = await this.employeeRepo.findOne({
        where: { id: ex.employeeId, companyId },
      });
      let minutes = ex.minutes;
      if (
        (ex.type === ShiftExceptionType.NO_SHOW ||
          ex.type === ShiftExceptionType.UNPAID_LEAVE) &&
        minutes <= 0 &&
        ex.assignmentId
      ) {
        const assignment = await this.assignmentRepo.findOne({
          where: { id: ex.assignmentId },
          relations: ['instance'],
        });
        if (assignment?.instance) {
          const { durationMinutes } = await import('../domain/rules/rules-engine');
          minutes = durationMinutes(
            assignment.instance.startTime,
            assignment.instance.endTime,
          );
        }
      }
      const amount = deductionAmountCents(
        employee?.baseSalary,
        config.monthlyOrdinaryHours,
        minutes || 0,
      );
      ex.settled = true;
      ex.settledAt = new Date();
      ex.minutes = minutes;
      await this.exceptionRepo.save(ex);
      settled.push(ex);

      try {
        const event = new ShiftExceptionSettledEvent(
          companyId,
          ex.employeeId,
          ex.id,
          ex.type,
          minutes,
          amount,
          periodStart,
          periodEnd,
          ex.workDate,
        );
        event.userId = TenantContext.getUserId() ?? undefined;
        this.eventBus.publish(event);
      } catch {
        // never fail settle write
      }
    }

    // Also emit OT from assignments in period
    const assignments = await this.assignmentRepo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.instance', 'i')
      .where('a.companyId = :companyId', { companyId })
      .andWhere('i.workDate BETWEEN :from AND :to', {
        from: periodStart,
        to: periodEnd,
      })
      .andWhere('a.deletedAt IS NULL')
      .andWhere('a.plannedOvertimeMinutes > 0')
      .getMany();

    let overtimeEmitted = 0;
    const otContractCache = new Map<string, EmploymentContract>();
    for (const a of assignments) {
      let contract = otContractCache.get(a.employeeId);
      if (!contract) {
        const map = await this.loadActiveContracts([a.employeeId], companyId);
        contract = map.get(a.employeeId);
        if (contract) otContractCache.set(a.employeeId, contract);
      }
      const ctx = await this.resolveAttendanceContext(contract, {
        workDate: a.instance!.workDate,
        startTime: a.instance!.startTime,
        endTime: a.instance!.endTime,
      });
      if (ctx && !shouldEmitOvertime(ctx, contract?.extraHoursMode)) {
        continue;
      }
      const employee = await this.employeeRepo.findOne({
        where: { id: a.employeeId, companyId },
      });
      const amount = overtimeAmountCents(
        employee?.baseSalary,
        config.monthlyOrdinaryHours,
        a.plannedOvertimeMinutes,
        Number(config.overtimeMultiplier),
      );
      try {
        const event = new OvertimeGeneratedEvent(
          companyId,
          a.employeeId,
          a.id,
          a.plannedOvertimeMinutes,
          amount,
          periodStart,
          periodEnd,
          a.instance!.workDate,
        );
        event.userId = TenantContext.getUserId() ?? undefined;
        this.eventBus.publish(event);
        overtimeEmitted++;
      } catch {
        // ignore
      }
    }

    return { settledCount: settled.length, overtimeEmitted };
  }

  // --- Ledger ---
  async getCompensatoryBalances(
    employeeIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!employeeIds.length) return map;
    const companyId = requireCompanyId();
    const rows = await this.ledgerRepo.find({
      where: { companyId, employeeId: In(employeeIds) },
    });
    for (const id of employeeIds) map.set(id, 0);
    for (const row of rows) {
      const cur = map.get(row.employeeId) ?? 0;
      if (row.entryType === CompensatoryLedgerEntryType.CREDIT) {
        map.set(row.employeeId, cur + row.minutes);
      } else {
        map.set(row.employeeId, cur - row.minutes);
      }
    }
    return map;
  }

  async listLedger(employeeId: string) {
    const companyId = requireCompanyId();
    return this.ledgerRepo.find({
      where: { companyId, employeeId },
      order: { createdAt: 'DESC' },
    });
  }

  async creditCompensatory(input: {
    employeeId: string;
    minutes: number;
    workDate?: string;
    reason?: string;
    sourceAssignmentId?: string;
  }) {
    const companyId = requireCompanyId();
    const config = await this.getOrCreateConfig();
    let expiresOn: string | null = null;
    if (config.compensatoryExpiryDays && input.workDate) {
      expiresOn = addDaysIso(input.workDate, config.compensatoryExpiryDays);
    }
    const entry = await this.ledgerRepo.save(
      this.ledgerRepo.create({
        companyId,
        employeeId: input.employeeId,
        entryType: CompensatoryLedgerEntryType.CREDIT,
        minutes: input.minutes,
        workDate: input.workDate ?? null,
        expiresOn,
        reason: input.reason ?? 'Crédito descanso complementario',
        sourceAssignmentId: input.sourceAssignmentId ?? null,
        createdBy: TenantContext.getUserId() ?? null,
      }),
    );
    try {
      this.eventBus.publish(
        new CompensatoryRestCreditedEvent(
          companyId,
          input.employeeId,
          entry.id,
          input.minutes,
          input.workDate ?? '',
        ),
      );
    } catch {
      // ignore
    }
    return entry;
  }

  async redeemCompensatory(input: {
    employeeId: string;
    minutes: number;
    reason?: string;
  }) {
    const companyId = requireCompanyId();
    const balances = await this.getCompensatoryBalances([input.employeeId]);
    const bal = balances.get(input.employeeId) ?? 0;
    if (input.minutes > bal) {
      throw new BadRequestException('Saldo insuficiente de descanso complementario');
    }
    const entry = await this.ledgerRepo.save(
      this.ledgerRepo.create({
        companyId,
        employeeId: input.employeeId,
        entryType: CompensatoryLedgerEntryType.DEBIT,
        minutes: input.minutes,
        reason: input.reason ?? 'Redención descanso complementario',
        createdBy: TenantContext.getUserId() ?? null,
      }),
    );
    try {
      this.eventBus.publish(
        new CompensatoryRestRedeemedEvent(
          companyId,
          input.employeeId,
          entry.id,
          input.minutes,
        ),
      );
    } catch {
      // ignore
    }
    return entry;
  }

  /** P2: caduca créditos vencidos. */
  async expireCompensatoryCredits(asOfDate: string) {
    const companyId = requireCompanyId();
    const credits = await this.ledgerRepo.find({
      where: {
        companyId,
        entryType: CompensatoryLedgerEntryType.CREDIT,
      },
    });
    const expired: HrCompensatoryLedgerEntry[] = [];
    for (const c of credits) {
      if (!c.expiresOn || c.expiresOn > asOfDate) continue;
      const already = await this.ledgerRepo.findOne({
        where: {
          companyId,
          employeeId: c.employeeId,
          entryType: CompensatoryLedgerEntryType.EXPIRE,
          sourceAssignmentId: c.id,
        },
      });
      if (already) continue;
      const entry = await this.ledgerRepo.save(
        this.ledgerRepo.create({
          companyId,
          employeeId: c.employeeId,
          entryType: CompensatoryLedgerEntryType.EXPIRE,
          minutes: c.minutes,
          workDate: asOfDate,
          reason: `Caducidad crédito ${c.id}`,
          sourceAssignmentId: c.id,
          createdBy: TenantContext.getUserId() ?? null,
        }),
      );
      expired.push(entry);
    }
    return { expiredCount: expired.length };
  }

  // --- Attendance statements ---
  async generateAttendanceStatement(input: {
    employeeId: string;
    periodStart: string;
    periodEnd: string;
  }) {
    const companyId = requireCompanyId();
    const employee = await this.employeeRepo.findOne({
      where: { id: input.employeeId, companyId },
      relations: ['person'],
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const instances = await this.instanceRepo.find({
      where: {
        companyId,
        workDate: Between(input.periodStart, input.periodEnd),
      },
      relations: ['assignments'],
      order: { workDate: 'ASC' },
    });

    const rows: Array<Record<string, unknown>> = [];
    for (const inst of instances) {
      for (const a of inst.assignments ?? []) {
        if (a.employeeId !== input.employeeId || a.deletedAt) continue;
        rows.push({
          date: inst.workDate,
          startTime: inst.startTime,
          endTime: inst.endTime,
          plannedOvertimeMinutes: a.plannedOvertimeMinutes,
        });
      }
    }
    const exceptions = await this.exceptionRepo.find({
      where: {
        companyId,
        employeeId: input.employeeId,
        workDate: Between(input.periodStart, input.periodEnd),
      },
    });

    const snapshot = {
      employeeId: input.employeeId,
      employeeName: employee.person
        ? `${employee.person.firstName ?? ''} ${employee.person.lastName ?? ''}`.trim()
        : '',
      documentNumber: (employee.person as any)?.documentNumber ?? null,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      rows,
      exceptions: exceptions.map((e) => ({
        date: e.workDate,
        type: e.type,
        minutes: e.minutes,
        notes: e.notes,
      })),
      generatedAt: new Date().toISOString(),
    };

    const contentHash = createHash('sha256')
      .update(JSON.stringify({ rows: snapshot.rows, exceptions: snapshot.exceptions }))
      .digest('hex')
      .slice(0, 64);

    await this.documentRepo.update(
      {
        companyId,
        employeeId: input.employeeId,
        kind: HrDocumentKind.ATTENDANCE_STATEMENT,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        status: HrDocumentStatus.CURRENT,
      },
      { status: HrDocumentStatus.SUPERSEDED },
    );

    const prev = await this.documentRepo.find({
      where: {
        companyId,
        employeeId: input.employeeId,
        kind: HrDocumentKind.ATTENDANCE_STATEMENT,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
      order: { version: 'DESC' },
      take: 1,
    });
    const version = (prev[0]?.version ?? 0) + 1;

    const doc = await this.documentRepo.save(
      this.documentRepo.create({
        companyId,
        employeeId: input.employeeId,
        kind: HrDocumentKind.ATTENDANCE_STATEMENT,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        contentHash,
        version,
        status: HrDocumentStatus.CURRENT,
        generatedBy: TenantContext.getUserId() ?? null,
        snapshotJson: snapshot,
      }),
    );

    return { document: doc, snapshot };
  }

  async listDocuments(employeeId?: string) {
    const companyId = requireCompanyId();
    const where: any = {
      companyId,
      kind: HrDocumentKind.ATTENDANCE_STATEMENT,
    };
    if (employeeId) where.employeeId = employeeId;
    return this.documentRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async attachSignedScan(documentId: string, signedDocumentUrl: string) {
    const companyId = requireCompanyId();
    const doc = await this.documentRepo.findOne({
      where: { id: documentId, companyId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    doc.signedDocumentUrl = signedDocumentUrl;
    doc.signedAt = new Date();
    return this.documentRepo.save(doc);
  }

  // --- Time entries (P2 optional) ---
  async ingestTimeEntry(input: {
    employeeId: string;
    kind: 'IN' | 'OUT';
    occurredAt: string;
    deviceId?: string;
    idempotencyKey?: string;
  }) {
    const companyId = requireCompanyId();
    const config = await this.getOrCreateConfig();
    if (input.idempotencyKey) {
      const existing = await this.timeEntryRepo.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return existing;
    }
    const occurredAt = new Date(input.occurredAt);
    const workDate = input.occurredAt.slice(0, 10);

    const contracts = await this.loadActiveContracts([input.employeeId], companyId);
    const contract = contracts.get(input.employeeId);

    let expectedAssignment: {
      workDate: string;
      startTime: string;
      endTime: string;
    } | null = null;
    const assignment = await this.assignmentRepo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.instance', 'i')
      .where('a.companyId = :companyId', { companyId })
      .andWhere('a.employeeId = :employeeId', { employeeId: input.employeeId })
      .andWhere('i.workDate = :workDate', { workDate })
      .andWhere('a.deletedAt IS NULL')
      .orderBy('i.startTime', 'ASC')
      .getOne();
    if (assignment?.instance) {
      expectedAssignment = {
        workDate: assignment.instance.workDate,
        startTime: assignment.instance.startTime,
        endTime: assignment.instance.endTime,
      };
    }

    const ctx = await this.resolveAttendanceContext(contract, expectedAssignment);
    const saved = await this.timeEntryRepo.save(
      this.timeEntryRepo.create({
        companyId,
        employeeId: input.employeeId,
        kind: input.kind,
        occurredAt,
        deviceId: input.deviceId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
      }),
    );

    if (ctx && input.kind === 'IN') {
      const findings = evaluateTimeEntry(
        { kind: input.kind, occurredAt },
        ctx,
        workDate,
      );
      if (findings.length > 0) {
        const f = findings[0]!;
        const autoCreate =
          config.enforcementMode !== EnforcementMode.ALERT_ONLY;
        if (autoCreate) {
          const ex = await this.exceptionRepo.save(
            this.exceptionRepo.create({
              companyId,
              employeeId: input.employeeId,
              assignmentId: assignment?.id ?? null,
              workDate,
              type: f.type,
              minutes: f.minutes,
              notes: f.message,
              affectsPayroll: true,
              createdBy: TenantContext.getUserId() ?? null,
            }),
          );
          saved.suggestedExceptionId = ex.id;
          await this.timeEntryRepo.save(saved);
        }
      }
    }

    return saved;
  }

  /** Auto-credit compensatory rest when working on holiday (Art. 38 path). */
  async creditHolidayWork(weekStart: string) {
    const companyId = requireCompanyId();
    const weekEnd = addDaysIso(weekStart, 6);
    const holidays = await this.listHolidays(weekStart, weekEnd, companyId);
    const holidayDates = new Set(holidays.map((h) => h.date));
    if (!holidayDates.size) return { credited: 0 };

    const instances = await this.instanceRepo.find({
      where: { companyId, workDate: Between(weekStart, weekEnd) },
      relations: ['assignments'],
    });
    let credited = 0;
    const { durationMinutes } = await import('../domain/rules/rules-engine');
    for (const inst of instances) {
      if (!holidayDates.has(inst.workDate)) continue;
      for (const a of inst.assignments ?? []) {
        if (a.deletedAt) continue;
        const minutes = durationMinutes(inst.startTime, inst.endTime);
        await this.creditCompensatory({
          employeeId: a.employeeId,
          minutes,
          workDate: inst.workDate,
          reason: `Trabajo en festivo ${inst.workDate}`,
          sourceAssignmentId: a.id,
        });
        credited++;
      }
    }
    return { credited };
  }

  // --- Employee shifts ---
  async listEmployeeShifts(employeeId?: string) {
    const companyId = requireCompanyId();
    const where: any = { companyId };
    if (employeeId) where.employeeId = employeeId;
    return this.employeeShiftRepo.find({
      where,
      order: { updatedAt: 'DESC' },
    });
  }

  async getActiveEmployeeShift(employeeId: string) {
    const companyId = requireCompanyId();
    return this.employeeShiftRepo.findOne({
      where: {
        companyId,
        employeeId,
        status: EmployeeShiftStatus.ACTIVE,
      },
    });
  }

  async createEmployeeShift(input: {
    employeeId: string;
    name: string;
    type?: ShiftTemplateType;
    scheduleJson?: Record<string, { start?: string; end?: string } | null> | null;
    timezone?: string;
    templateId?: string | null;
    isNight?: boolean;
    isNightOutgoing?: boolean;
    status?: EmployeeShiftStatus;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
  }) {
    const companyId = requireCompanyId();
    const employee = await this.employeeRepo.findOne({
      where: { id: input.employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const status = input.status ?? EmployeeShiftStatus.ACTIVE;
    if (status === EmployeeShiftStatus.ACTIVE) {
      await this.employeeShiftRepo.update(
        {
          companyId,
          employeeId: input.employeeId,
          status: EmployeeShiftStatus.ACTIVE,
        },
        { status: EmployeeShiftStatus.INACTIVE },
      );
    }

    const saved = await this.employeeShiftRepo.save(
      this.employeeShiftRepo.create({
        companyId,
        employeeId: input.employeeId,
        name: input.name,
        type: input.type ?? ShiftTemplateType.WEEKLY,
        scheduleJson: input.scheduleJson ?? null,
        timezone: input.timezone ?? 'America/Santiago',
        templateId: input.templateId ?? null,
        isNight: input.isNight ?? false,
        isNightOutgoing: input.isNightOutgoing ?? false,
        status,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveTo: input.effectiveTo ?? null,
      }),
    );
    if (status === EmployeeShiftStatus.ACTIVE) {
      await this.appendTimelineSafe({
        employeeId: input.employeeId,
        kind: HrEmployeeTimelineKind.SHIFT_CHANGED,
        title: `Turno activo: ${saved.name}`,
        actorUserId: TenantContext.getUserId() ?? null,
        sourceType: 'HrEmployeeShift',
        sourceId: saved.id,
        payload: { name: saved.name, status: saved.status },
      });
    }
    return saved;
  }

  async updateEmployeeShift(
    id: string,
    patch: Partial<{
      name: string;
      type: ShiftTemplateType;
      scheduleJson: Record<string, { start?: string; end?: string } | null> | null;
      timezone: string;
      templateId: string | null;
      isNight: boolean;
      isNightOutgoing: boolean;
      status: EmployeeShiftStatus;
      effectiveFrom: string | null;
      effectiveTo: string | null;
    }>,
  ) {
    const companyId = requireCompanyId();
    const row = await this.employeeShiftRepo.findOne({
      where: { id, companyId },
    });
    if (!row) throw new NotFoundException('Turno no encontrado');

    if (
      patch.status === EmployeeShiftStatus.ACTIVE &&
      row.status !== EmployeeShiftStatus.ACTIVE
    ) {
      await this.employeeShiftRepo.update(
        {
          companyId,
          employeeId: row.employeeId,
          status: EmployeeShiftStatus.ACTIVE,
        },
        { status: EmployeeShiftStatus.INACTIVE },
      );
    }

    const prevStatus = row.status;
    Object.assign(row, patch);
    const saved = await this.employeeShiftRepo.save(row);
    if (
      saved.status === EmployeeShiftStatus.ACTIVE &&
      (prevStatus !== EmployeeShiftStatus.ACTIVE ||
        patch.name !== undefined ||
        patch.scheduleJson !== undefined)
    ) {
      await this.appendTimelineSafe({
        employeeId: saved.employeeId,
        kind: HrEmployeeTimelineKind.SHIFT_CHANGED,
        title: `Turno actualizado: ${saved.name}`,
        actorUserId: TenantContext.getUserId() ?? null,
        sourceType: 'HrEmployeeShift',
        sourceId: saved.id,
        payload: { name: saved.name, status: saved.status },
      });
    }
    return saved;
  }

  async deleteEmployeeShift(id: string) {
    const companyId = requireCompanyId();
    const row = await this.employeeShiftRepo.findOne({
      where: { id, companyId },
    });
    if (!row) throw new NotFoundException('Turno no encontrado');
    await this.employeeShiftRepo.softDelete(id);
    return { success: true };
  }

  /**
   * Expande turnos UL ACTIVE (+ miembros) a assignments de la semana (preview).
   * Noche se deriva de hr_jornada_config.nightStart/nightEnd.
   * No persiste; el cliente llama PUT week para guardar.
   */
  async loadWeekFromShifts(input: {
    weekStart: string;
    laborUnitId?: string | null;
    branchId?: string | null;
    employeeIds?: string[];
  }) {
    const companyId = requireCompanyId();
    if (!input.laborUnitId) {
      throw new BadRequestException(
        'laborUnitId es requerido para cargar desde turnos UL',
      );
    }
    const weekStart = input.weekStart;
    const config = await this.getOrCreateConfig();

    const empWhere: any = {
      companyId,
      status: EmployeeStatus.ACTIVE,
      laborUnitId: input.laborUnitId,
    };
    if (input.employeeIds?.length) {
      empWhere.id = In(input.employeeIds);
    }

    const employees = await this.employeeRepo.find({ where: empWhere });
    const employeeIds = employees.map((e) => e.id);
    const employeeSet = new Set(employeeIds);

    const ulShifts = await this.laborUnitShiftRepo.find({
      where: {
        companyId,
        laborUnitId: input.laborUnitId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    const shiftIds = ulShifts.map((s) => s.id);
    const allMembers =
      shiftIds.length > 0
        ? await this.laborUnitShiftMemberRepo.find({
            where: {
              companyId,
              shiftId: In(shiftIds),
              status: LaborUnitShiftMemberStatus.ACTIVE,
            },
          })
        : [];

    const membersByShift = new Map<string, string[]>();
    const employeesWithMembership = new Set<string>();
    for (const m of allMembers) {
      if (!employeeSet.has(m.employeeId)) continue;
      const list = membersByShift.get(m.shiftId) ?? [];
      list.push(m.employeeId);
      membersByShift.set(m.shiftId, list);
      employeesWithMembership.add(m.employeeId);
    }

    function isShiftEffectiveOn(shift: HrLaborUnitShift, workDate: string) {
      if (shift.effectiveFrom && workDate < shift.effectiveFrom) return false;
      if (shift.effectiveTo && workDate > shift.effectiveTo) return false;
      return true;
    }

    const assignments: WeekAssignmentInput[] = [];
    for (const shift of ulShifts) {
      const members = membersByShift.get(shift.id) ?? [];
      if (!members.length || !shift.scheduleJson) continue;
      for (let i = 0; i < 7; i++) {
        const workDate = addDaysIso(weekStart, i);
        if (!isShiftEffectiveOn(shift, workDate)) continue;
        const slot = shift.scheduleJson[String(i)];
        if (!slot?.start || !slot?.end) continue;
        const night = classifyShiftSlot(
          slot.start,
          slot.end,
          config.nightStart,
          config.nightEnd,
        );
        for (const employeeId of members) {
          assignments.push({
            employeeId,
            workDate,
            startTime: slot.start,
            endTime: slot.end,
            plannedOvertimeMinutes: 0,
            laborUnitShiftId: shift.id,
            isNight: night.isNight,
            isNightOutgoing: night.isNightOutgoing,
            timezone: shift.timezone,
            templateId: null,
          });
        }
      }
    }

    const withoutShift = employees
      .filter((e) => !employeesWithMembership.has(e.id))
      .map((e) => e.id);

    const week = await this.getWeek(
      weekStart,
      input.laborUnitId,
      input.branchId,
    );
    const validation = await this.validateWeek(assignments);
    return {
      ...week,
      findings: validation.findings,
      worstSeverity: validation.worstSeverity,
      loadedAssignments: assignments,
      laborUnitShifts: ulShifts.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        scheduleJson: s.scheduleJson ?? null,
      })),
      employeesWithoutShift: withoutShift,
      message:
        withoutShift.length > 0
          ? `${withoutShift.length} empleado(s) sin membresía a turno UL; no se cargaron.`
          : null,
    };
  }
}
