import { ShiftExceptionType } from '../hr-jornada.enums';
import {
  FlexibleMode,
  ShiftSystemType,
} from '../shift-system.enums';

export type AttendanceFindingType =
  | ShiftExceptionType.LATE
  | ShiftExceptionType.EARLY_LEAVE;

export type AttendanceFinding = {
  type: AttendanceFindingType;
  minutes: number;
  message: string;
};

export type ExpectedSlot = {
  startTime: string;
  endTime?: string;
  workDate: string;
};

export type AttendanceContext = {
  shiftSystemType: ShiftSystemType | string;
  flexibleMode?: FlexibleMode | string | null;
  generatesLateEvents: boolean;
  overtimeEnabled: boolean;
  fixedScheduleJson?: Record<
    string,
    { start?: string; end?: string } | null
  > | null;
  flexibleBandJson?: Record<
    string,
    {
      earliestStart?: string;
      latestStart?: string;
      earliestEnd?: string;
      latestEnd?: string;
    } | null
  > | null;
  expectedAssignment?: ExpectedSlot | null;
};

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function occurredMinutes(occurredAt: Date): number {
  return occurredAt.getHours() * 60 + occurredAt.getMinutes();
}

function minutesLate(actualMin: number, expectedMin: number): number {
  const diff = actualMin - expectedMin;
  return diff > 0 ? diff : 0;
}

export function effectiveGeneratesLate(ctx: AttendanceContext): boolean {
  if (!ctx.generatesLateEvents) return false;
  if (ctx.shiftSystemType === ShiftSystemType.FREE) return false;
  if (
    ctx.shiftSystemType === ShiftSystemType.FLEXIBLE &&
    ctx.flexibleMode === FlexibleMode.OPEN
  ) {
    return false;
  }
  return true;
}

export function effectiveOvertimeEnabled(ctx: AttendanceContext): boolean {
  if (!ctx.overtimeEnabled) return false;
  if (ctx.shiftSystemType === ShiftSystemType.FREE) return false;
  return true;
}

function dayOfWeekIso(workDate: string): number {
  const d = new Date(`${workDate}T12:00:00`);
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

function resolveExpectedStart(ctx: AttendanceContext, workDate: string): string | null {
  const dow = String(dayOfWeekIso(workDate));
  if (ctx.shiftSystemType === ShiftSystemType.FIXED) {
    return ctx.fixedScheduleJson?.[dow]?.start ?? null;
  }
  if (
    ctx.shiftSystemType === ShiftSystemType.ROTATING ||
    ctx.shiftSystemType === ShiftSystemType.EXCEPTIONAL
  ) {
    return ctx.expectedAssignment?.workDate === workDate
      ? ctx.expectedAssignment.startTime
      : null;
  }
  if (ctx.shiftSystemType === ShiftSystemType.FLEXIBLE) {
    if (ctx.flexibleMode === FlexibleMode.BAND) {
      return ctx.flexibleBandJson?.[dow]?.latestStart ?? null;
    }
    return null;
  }
  return null;
}

export function evaluateTimeEntry(
  entry: { kind: 'IN' | 'OUT'; occurredAt: Date },
  ctx: AttendanceContext,
  workDate: string,
): AttendanceFinding[] {
  if (!effectiveGeneratesLate(ctx)) return [];
  if (entry.kind !== 'IN') return [];

  const expectedStart = resolveExpectedStart(ctx, workDate);
  if (!expectedStart) return [];

  const late = minutesLate(occurredMinutes(entry.occurredAt), parseHm(expectedStart));
  if (late <= 0) return [];

  return [
    {
      type: ShiftExceptionType.LATE,
      minutes: late,
      message: `Ingreso ${late} min después del horario esperado (${expectedStart})`,
    },
  ];
}

export function shouldSettleLateException(ctx: AttendanceContext): boolean {
  return effectiveGeneratesLate(ctx);
}

export function shouldEmitOvertime(
  ctx: AttendanceContext,
  extraHoursMode?: string | null,
): boolean {
  if (!effectiveOvertimeEnabled(ctx)) return false;
  if (extraHoursMode === 'NONE') return false;
  return true;
}

export function contractWeeklyMinutes(weeklyHours?: string | null): number | null {
  if (!weeklyHours) return null;
  const n = Number(String(weeklyHours).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 60);
}
