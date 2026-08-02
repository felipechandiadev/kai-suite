import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Repository } from 'typeorm';
import { HrShiftInstance } from '@modules/hr-jornada/domain/hr-shift-instance.entity';
import { HrShiftException } from '@modules/hr-jornada/domain/hr-shift-exception.entity';
import {
  HrJornadaPeriod,
  JornadaPeriodStatus,
} from '@modules/hr-jornada/domain/hr-jornada-period.entity';
import { calendarMonthBounds } from '@modules/hr-jornada/domain/rules/overtime-from-plan.util';
import { Employee } from '@modules/employees/domain/employee.entity';
import { durationMinutes } from '@modules/hr-jornada/domain/rules/rules-engine';
import { HCM_REPORT_MAX_ROWS } from '../domain/hcm-report.types';

function isUuid(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v,
    )
  );
}

@Injectable()
export class HcmReportsQueryService {
  constructor(
    @InjectRepository(HrShiftInstance)
    private readonly instanceRepo: Repository<HrShiftInstance>,
    @InjectRepository(HrShiftException)
    private readonly exceptionRepo: Repository<HrShiftException>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(HrJornadaPeriod)
    private readonly periodRepo: Repository<HrJornadaPeriod>,
  ) {}

  requireDateRange(params: Record<string, unknown>): {
    dateFrom: string;
    dateTo: string;
  } {
    const dateFrom = typeof params.dateFrom === 'string' ? params.dateFrom : '';
    const dateTo = typeof params.dateTo === 'string' ? params.dateTo : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      throw new BadRequestException('dateFrom y dateTo son obligatorios (YYYY-MM-DD)');
    }
    if (dateFrom > dateTo) {
      throw new BadRequestException('dateFrom no puede ser posterior a dateTo');
    }
    return { dateFrom, dateTo };
  }

  optionalUuid(params: Record<string, unknown>, key: string): string | null {
    const raw = params[key];
    if (raw == null || raw === '') return null;
    if (!isUuid(raw)) throw new BadRequestException(`${key} inválido`);
    return raw;
  }

  optionalUuidList(params: Record<string, unknown>, key: string): string[] {
    const raw = params[key];
    if (raw == null) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    const out: string[] = [];
    for (const item of list) {
      if (!isUuid(item)) throw new BadRequestException(`${key} contiene UUID inválido`);
      out.push(item);
    }
    return out;
  }

  async plannedHoursByEmployee(
    companyId: string,
    opts: {
      dateFrom: string;
      dateTo: string;
      laborUnitId?: string | null;
      employeeIds?: string[];
    },
  ) {
    const empWhere: Record<string, unknown> = { companyId };
    if (opts.laborUnitId) empWhere.laborUnitId = opts.laborUnitId;
    if (opts.employeeIds?.length) empWhere.id = In(opts.employeeIds);

    const employees = await this.employeeRepo.find({
      where: empWhere as any,
      relations: ['person'],
    });
    const employeeIds = employees.map((e) => e.id);
    if (!employeeIds.length) {
      return { rows: [], dailySeries: [] as Array<{ date: string; hours: number }>, truncated: false };
    }

    const nameById = new Map<string, string>();
    for (const e of employees) {
      nameById.set(
        e.id,
        e.person
          ? `${e.person.firstName ?? ''} ${e.person.lastName ?? ''}`.trim() || e.id
          : e.id,
      );
    }

    const instances = await this.instanceRepo.find({
      where: {
        companyId,
        workDate: Between(opts.dateFrom, opts.dateTo),
      },
      relations: ['assignments'],
      order: { workDate: 'ASC' },
    });

    const exceptions = await this.exceptionRepo.find({
      where: {
        companyId,
        workDate: Between(opts.dateFrom, opts.dateTo),
        employeeId: In(employeeIds),
        deletedAt: IsNull(),
      },
    });

    type Acc = {
      employeeId: string;
      displayName: string;
      days: Set<string>;
      ordinaryMinutes: number;
      overtimeMinutes: number;
      exceptionMinutes: number;
    };
    const byEmp = new Map<string, Acc>();
    const ensure = (id: string) => {
      let a = byEmp.get(id);
      if (!a) {
        a = {
          employeeId: id,
          displayName: nameById.get(id) ?? id,
          days: new Set(),
          ordinaryMinutes: 0,
          overtimeMinutes: 0,
          exceptionMinutes: 0,
        };
        byEmp.set(id, a);
      }
      return a;
    };

    const dailyMinutes = new Map<string, number>();

    for (const inst of instances) {
      for (const a of inst.assignments ?? []) {
        if (a.deletedAt) continue;
        if (!employeeIds.includes(a.employeeId)) continue;
        const start = a.startTime?.trim() || inst.startTime;
        const end = a.endTime?.trim() || inst.endTime;
        const ordinary = durationMinutes(start, end);
        const ot = a.plannedOvertimeMinutes ?? 0;
        const acc = ensure(a.employeeId);
        acc.days.add(inst.workDate);
        acc.ordinaryMinutes += ordinary;
        acc.overtimeMinutes += ot;
        dailyMinutes.set(
          inst.workDate,
          (dailyMinutes.get(inst.workDate) ?? 0) + ordinary + ot,
        );
      }
    }

    for (const ex of exceptions) {
      if (!ex.affectsPayroll) continue;
      const acc = ensure(ex.employeeId);
      acc.exceptionMinutes += ex.minutes ?? 0;
    }

    let rows = [...byEmp.values()]
      .map((a) => {
        const netMinutes = Math.max(
          0,
          a.ordinaryMinutes + a.overtimeMinutes - a.exceptionMinutes,
        );
        return {
          employeeId: a.employeeId,
          displayName: a.displayName,
          daysWorked: a.days.size,
          ordinaryHours: Math.round((a.ordinaryMinutes / 60) * 100) / 100,
          overtimeHours: Math.round((a.overtimeMinutes / 60) * 100) / 100,
          exceptionHours: Math.round((a.exceptionMinutes / 60) * 100) / 100,
          netHours: Math.round((netMinutes / 60) * 100) / 100,
        };
      })
      .sort((x, y) => x.displayName.localeCompare(y.displayName, 'es'));

    const truncated = rows.length > HCM_REPORT_MAX_ROWS;
    if (truncated) rows = rows.slice(0, HCM_REPORT_MAX_ROWS);

    const dailySeries = [...dailyMinutes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, minutes]) => ({
        date,
        hours: Math.round((minutes / 60) * 100) / 100,
      }));

    const certified = await this.isRangeFullyCertified(
      companyId,
      opts.dateFrom,
      opts.dateTo,
    );

    return { rows, dailySeries, truncated, certified };
  }

  private monthsTouching(from: string, to: string): string[] {
    const out: string[] = [];
    let cursor = calendarMonthBounds(from).periodStart;
    const endMonth = calendarMonthBounds(to).periodStart;
    while (cursor <= endMonth) {
      out.push(cursor);
      const [y, m] = cursor.split('-').map(Number);
      const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
      cursor = `${next.y}-${String(next.m).padStart(2, '0')}-01`;
    }
    return out;
  }

  async isRangeFullyCertified(
    companyId: string,
    from: string,
    to: string,
  ): Promise<boolean> {
    const months = this.monthsTouching(from, to);
    if (!months.length) return false;
    for (const start of months) {
      const row = await this.periodRepo.findOne({
        where: { companyId, periodStart: start },
      });
      if (row?.status !== JornadaPeriodStatus.CLOSED) return false;
    }
    return true;
  }
}
