import { Injectable } from '@nestjs/common';
import {
  HcmReportHandler,
  HcmReportHandlerContext,
  HcmReportRunResult,
} from '../../domain/hcm-report.types';
import { HcmReportsQueryService } from '../hcm-reports-query.service';

function nowIso() {
  return new Date().toISOString();
}

@Injectable()
export class HoursPlannedByEmployeeHandler implements HcmReportHandler {
  readonly id = 'hours-planned-by-employee';
  readonly title = 'Horas planificadas por empleado';
  readonly description =
    'Suma de jornadas planificadas en el período (asignaciones), HE planificadas y excepciones que afectan nómina.';
  readonly wave = 'mvp' as const;

  constructor(private readonly q: HcmReportsQueryService) {}

  validate(params: Record<string, unknown>) {
    const range = this.q.requireDateRange(params);
    return {
      ...range,
      laborUnitId: this.q.optionalUuid(params, 'laborUnitId'),
      employeeIds: this.q.optionalUuidList(params, 'employeeIds'),
    };
  }

  async run(ctx: HcmReportHandlerContext): Promise<HcmReportRunResult> {
    const params = this.validate(ctx.params);
    const { rows, dailySeries, truncated } = await this.q.plannedHoursByEmployee(
      ctx.companyId,
      {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        laborUnitId: params.laborUnitId,
        employeeIds: params.employeeIds,
      },
    );

    let totalOrdinary = 0;
    let totalOt = 0;
    let totalExc = 0;
    let totalNet = 0;
    let daysCovered = 0;
    for (const r of rows) {
      totalOrdinary += Number(r.ordinaryHours) || 0;
      totalOt += Number(r.overtimeHours) || 0;
      totalExc += Number(r.exceptionHours) || 0;
      totalNet += Number(r.netHours) || 0;
      daysCovered += Number(r.daysWorked) || 0;
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;

    return {
      reportId: this.id,
      title: this.title,
      generatedAt: nowIso(),
      params,
      summary: {
        headcount: rows.length,
        totalNetHours: round2(totalNet),
        totalOrdinaryHours: round2(totalOrdinary),
        totalOvertimeHours: round2(totalOt),
        totalExceptionHours: round2(totalExc),
        assignmentDays: daysCovered,
      },
      series: [
        {
          id: 'hours-by-day',
          label: 'Horas planificadas por día',
          chart: 'bar',
          points: dailySeries.map((d) => ({ x: d.date, y: d.hours })),
        },
      ],
      columns: [
        { key: 'displayName', label: 'Empleado' },
        { key: 'daysWorked', label: 'Días', align: 'right' },
        { key: 'ordinaryHours', label: 'Horas ordinarias', align: 'right' },
        { key: 'overtimeHours', label: 'HE planificadas', align: 'right' },
        { key: 'exceptionHours', label: 'Excepciones (h)', align: 'right' },
        { key: 'netHours', label: 'Neto (h)', align: 'right' },
      ],
      rows,
      totals: {
        daysWorked: daysCovered,
        ordinaryHours: round2(totalOrdinary),
        overtimeHours: round2(totalOt),
        exceptionHours: round2(totalExc),
        netHours: round2(totalNet),
      },
      footnotes: [
        'Las horas ordinarias provienen de la jornada de cada asignación (start/end de la persona).',
        'Excepciones solo incluyen las marcadas como impacto en nómina.',
        'Neto = ordinarias + HE − excepciones (mínimo 0).',
      ],
      truncated,
    };
  }
}
