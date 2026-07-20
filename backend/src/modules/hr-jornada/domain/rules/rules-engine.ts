import { ScheduleFinding } from '../schedule-finding';
import {
  FindingCategory,
  FindingSeverity,
} from '../hr-jornada.enums';

export type ScheduleAssignmentSnapshot = {
  assignmentId?: string;
  employeeId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  plannedOvertimeMinutes: number;
  isNightOutgoing?: boolean;
  compensatoryBalanceMinutes?: number;
};

export type RulesEngineConfig = {
  maxDailyOvertimeMinutes: number;
  minRestBetweenShiftsMinutes: number;
  maxWeeklyMinutes?: number | null;
  maxMonthlyMinutes?: number | null;
  allowShiftOverlap: boolean;
  nightStart: string;
  nightEnd: string;
};

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Duración en minutos; si end < start, cruza medianoche. */
export function durationMinutes(startTime: string, endTime: string): number {
  const start = parseHm(startTime);
  const end = parseHm(endTime);
  if (end > start) return end - start;
  if (end === start) return 0;
  return 24 * 60 - start + end;
}

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  const norm = (s: number, e: number): [number, number][] => {
    if (e > s) return [[s, e]];
    if (e === s) return [];
    return [
      [s, 24 * 60],
      [0, e],
    ];
  };
  for (const [as, ae] of norm(aStart, aEnd)) {
    for (const [bs, be] of norm(bStart, bEnd)) {
      if (as < be && bs < ae) return true;
    }
  }
  return false;
}

export function evaluateOverlap(
  assignments: ScheduleAssignmentSnapshot[],
  allowOverlap: boolean,
): ScheduleFinding[] {
  if (allowOverlap) return [];
  const findings: ScheduleFinding[] = [];
  const byEmployee = new Map<string, ScheduleAssignmentSnapshot[]>();
  for (const a of assignments) {
    const list = byEmployee.get(a.employeeId) ?? [];
    list.push(a);
    byEmployee.set(a.employeeId, list);
  }
  for (const [employeeId, list] of byEmployee) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].workDate !== list[j].workDate) continue;
        if (
          intervalsOverlap(
            parseHm(list[i].startTime),
            parseHm(list[i].endTime),
            parseHm(list[j].startTime),
            parseHm(list[j].endTime),
          )
        ) {
          findings.push({
            ruleCode: 'SHIFT_OVERLAP',
            severity: FindingSeverity.CRITICAL,
            category: FindingCategory.POLICY,
            message:
              'El empleado tiene turnos solapados el mismo día. Revise la planificación.',
            context: { employeeId, workDate: list[i].workDate },
          });
        }
      }
    }
  }
  return findings;
}

export function evaluateDailyOvertime(
  assignments: ScheduleAssignmentSnapshot[],
  maxDailyOvertimeMinutes: number,
): ScheduleFinding[] {
  const findings: ScheduleFinding[] = [];
  for (const a of assignments) {
    if (a.plannedOvertimeMinutes > maxDailyOvertimeMinutes) {
      findings.push({
        ruleCode: 'OT_DAILY_MAX',
        severity: FindingSeverity.CRITICAL,
        category: FindingCategory.LEGAL,
        message: `El turno excede las ${Math.floor(maxDailyOvertimeMinutes / 60)} horas extraordinarias diarias (Art. 31 del Código del Trabajo).`,
        context: {
          employeeId: a.employeeId,
          workDate: a.workDate,
          plannedOvertimeMinutes: a.plannedOvertimeMinutes,
          maxDailyOvertimeMinutes,
        },
      });
    }
  }
  return findings;
}

export function evaluateDailyHours(
  assignments: ScheduleAssignmentSnapshot[],
): ScheduleFinding[] {
  const findings: ScheduleFinding[] = [];
  const byKey = new Map<string, number>();
  for (const a of assignments) {
    const key = `${a.employeeId}|${a.workDate}`;
    const mins =
      durationMinutes(a.startTime, a.endTime) + a.plannedOvertimeMinutes;
    byKey.set(key, (byKey.get(key) ?? 0) + mins);
  }
  for (const [key, mins] of byKey) {
    if (mins > 12 * 60) {
      const [employeeId, workDate] = key.split('|');
      findings.push({
        ruleCode: 'DAILY_HOURS_HIGH',
        severity: FindingSeverity.WARNING,
        category: FindingCategory.POLICY,
        message:
          'La jornada del día supera 12 horas (incluyendo HE planificadas). Verifique el régimen aplicable.',
        context: { employeeId, workDate, minutes: mins },
      });
    }
  }
  return findings;
}

export function evaluateRestBetweenShifts(
  assignments: ScheduleAssignmentSnapshot[],
  minRestMinutes: number,
): ScheduleFinding[] {
  const findings: ScheduleFinding[] = [];
  const byEmployee = new Map<string, ScheduleAssignmentSnapshot[]>();
  for (const a of assignments) {
    const list = byEmployee.get(a.employeeId) ?? [];
    list.push(a);
    byEmployee.set(a.employeeId, list);
  }

  for (const [employeeId, list] of byEmployee) {
    const sorted = [...list].sort((x, y) => {
      const d = x.workDate.localeCompare(y.workDate);
      if (d !== 0) return d;
      return parseHm(x.startTime) - parseHm(y.startTime);
    });
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      const curEndAbs =
        dateToAbsMinutes(cur.workDate, cur.endTime) +
        (parseHm(cur.endTime) <= parseHm(cur.startTime) ? 24 * 60 : 0);
      let nextStartAbs = dateToAbsMinutes(next.workDate, next.startTime);
      if (nextStartAbs < curEndAbs) nextStartAbs += 24 * 60;
      const rest = nextStartAbs - curEndAbs;
      if (rest < minRestMinutes) {
        findings.push({
          ruleCode: 'REST_BETWEEN_SHIFTS',
          severity: FindingSeverity.CRITICAL,
          category: FindingCategory.LEGAL,
          message: `Descanso entre jornadas inferior a ${Math.floor(minRestMinutes / 60)} horas. Revise el intervalo entre turnos.`,
          context: {
            employeeId,
            from: cur.workDate,
            to: next.workDate,
            restMinutes: rest,
            minRestMinutes,
          },
        });
      }
    }
  }
  return findings;
}

function dateToAbsMinutes(isoDate: string, hm: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dayIndex = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return dayIndex * 24 * 60 + parseHm(hm);
}

export function evaluateNightOutgoing(
  assignments: ScheduleAssignmentSnapshot[],
): ScheduleFinding[] {
  const findings: ScheduleFinding[] = [];
  for (const a of assignments) {
    if (!a.isNightOutgoing) continue;
    const end = parseHm(a.endTime);
    if (end > 6 * 60 && end < 12 * 60) {
      findings.push({
        ruleCode: 'NIGHT_OUTGOING',
        severity: FindingSeverity.WARNING,
        category: FindingCategory.POLICY,
        message:
          'Turno marcado como saliente de noche: revise descanso y disponibilidad del turno siguiente.',
        context: { employeeId: a.employeeId, workDate: a.workDate },
      });
    }
  }
  return findings;
}

export function evaluateWeeklyCap(
  assignments: ScheduleAssignmentSnapshot[],
  maxWeeklyMinutes: number | null | undefined,
): ScheduleFinding[] {
  if (!maxWeeklyMinutes) return [];
  const findings: ScheduleFinding[] = [];
  const byEmployee = new Map<string, number>();
  for (const a of assignments) {
    const mins =
      durationMinutes(a.startTime, a.endTime) + a.plannedOvertimeMinutes;
    byEmployee.set(a.employeeId, (byEmployee.get(a.employeeId) ?? 0) + mins);
  }
  for (const [employeeId, mins] of byEmployee) {
    if (mins > maxWeeklyMinutes) {
      findings.push({
        ruleCode: 'WEEKLY_HOURS_CAP',
        severity: FindingSeverity.WARNING,
        category: FindingCategory.POLICY,
        message: `La semana supera el tope interno de ${Math.floor(maxWeeklyMinutes / 60)} horas.`,
        context: { employeeId, minutes: mins, maxWeeklyMinutes },
      });
    }
  }
  return findings;
}

export function evaluateCompensatoryVsOt(
  assignments: ScheduleAssignmentSnapshot[],
): ScheduleFinding[] {
  const findings: ScheduleFinding[] = [];
  for (const a of assignments) {
    if (
      a.plannedOvertimeMinutes > 0 &&
      (a.compensatoryBalanceMinutes ?? 0) > 0
    ) {
      findings.push({
        ruleCode: 'COMPENSATORY_VS_OT',
        severity: FindingSeverity.WARNING,
        category: FindingCategory.POLICY,
        message:
          'Hay saldo de descanso complementario y se planifican HE remuneradas. Considere redimir la bolsa antes de pagar HE.',
        context: {
          employeeId: a.employeeId,
          workDate: a.workDate,
          balance: a.compensatoryBalanceMinutes,
          ot: a.plannedOvertimeMinutes,
        },
      });
    }
  }
  return findings;
}

export function evaluateSchedule(
  assignments: ScheduleAssignmentSnapshot[],
  config: RulesEngineConfig,
): ScheduleFinding[] {
  return [
    ...evaluateOverlap(assignments, config.allowShiftOverlap),
    ...evaluateDailyHours(assignments),
    ...evaluateDailyOvertime(assignments, config.maxDailyOvertimeMinutes),
    ...evaluateRestBetweenShifts(
      assignments,
      config.minRestBetweenShiftsMinutes,
    ),
    ...evaluateNightOutgoing(assignments),
    ...evaluateWeeklyCap(assignments, config.maxWeeklyMinutes),
    ...evaluateCompensatoryVsOt(assignments),
  ];
}

export function hourlyRateCents(
  baseSalaryCents: string | null | undefined,
  monthlyOrdinaryHours: number,
): number {
  const salary = Number(baseSalaryCents || 0);
  if (!salary || !monthlyOrdinaryHours) return 0;
  return Math.round(salary / monthlyOrdinaryHours);
}

export function overtimeAmountCents(
  baseSalaryCents: string | null | undefined,
  monthlyOrdinaryHours: number,
  overtimeMinutes: number,
  multiplier: number,
): string {
  const rate = hourlyRateCents(baseSalaryCents, monthlyOrdinaryHours);
  const hours = overtimeMinutes / 60;
  return String(Math.round(rate * hours * multiplier));
}

export function deductionAmountCents(
  baseSalaryCents: string | null | undefined,
  monthlyOrdinaryHours: number,
  minutes: number,
): string {
  const rate = hourlyRateCents(baseSalaryCents, monthlyOrdinaryHours);
  return String(Math.round(rate * (minutes / 60)));
}
