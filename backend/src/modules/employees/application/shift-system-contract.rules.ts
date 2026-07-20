import {
  FlexibleMode,
  ShiftSystemType,
} from '@modules/hr-jornada/domain/shift-system.enums';

export type ScheduleSlot = { start?: string; end?: string } | null;
export type FlexibleBandSlot = {
  earliestStart?: string;
  latestStart?: string;
  earliestEnd?: string;
  latestEnd?: string;
} | null;

export type ShiftSystemContractInput = {
  shiftSystemType?: string | null;
  fixedScheduleJson?: Record<string, ScheduleSlot> | null;
  flexibleMode?: string | null;
  flexibleBandJson?: Record<string, FlexibleBandSlot> | null;
  art22Exempt?: boolean | null;
  exceptionalResolutionRef?: string | null;
  weeklyHours?: number | null;
};

function hasScheduleDay(
  json: Record<string, ScheduleSlot> | null | undefined,
): boolean {
  if (!json) return false;
  return Object.values(json).some((s) => s?.start && s?.end);
}

function hasBandDay(
  json: Record<string, FlexibleBandSlot> | null | undefined,
): boolean {
  if (!json) return false;
  return Object.values(json).some((s) => s?.latestStart);
}

export function assertShiftSystemContractRules(
  input: ShiftSystemContractInput,
): string | null {
  const type = input.shiftSystemType as ShiftSystemType | null | undefined;
  if (!type) return 'Sistema de jornada requerido';

  const fixed = input.fixedScheduleJson ?? null;
  const band = input.flexibleBandJson ?? null;
  const flexMode = input.flexibleMode as FlexibleMode | null | undefined;
  const weekly = input.weeklyHours;

  switch (type) {
    case ShiftSystemType.FIXED:
      if (weekly == null || !(weekly > 0)) return 'Horas semanales pactadas requeridas';
      if (!hasScheduleDay(fixed)) return 'Horario fijo requerido para jornada fija';
      if (band) return 'Banda horaria no aplica a jornada fija';
      if (input.exceptionalResolutionRef?.trim()) {
        return 'Resolución DT no aplica a jornada fija';
      }
      return null;

    case ShiftSystemType.ROTATING:
      if (weekly == null || !(weekly > 0)) return 'Horas semanales pactadas requeridas';
      if (fixed) return 'Horario fijo no aplica a sistema rotativo';
      if (band) return 'Banda horaria no aplica a sistema rotativo';
      if (input.exceptionalResolutionRef?.trim()) {
        return 'Resolución DT no aplica a sistema rotativo';
      }
      return null;

    case ShiftSystemType.FLEXIBLE:
      if (weekly == null || !(weekly > 0)) return 'Horas semanales pactadas requeridas';
      if (!flexMode || !Object.values(FlexibleMode).includes(flexMode)) {
        return 'Modo flexible requerido (banda u objetivos)';
      }
      if (flexMode === FlexibleMode.BAND) {
        if (!hasBandDay(band)) return 'Ventana de banda horaria requerida';
      } else if (band) {
        return 'Banda horaria no aplica a flexible sin banda';
      }
      if (fixed) return 'Horario fijo no aplica a jornada flexible';
      if (input.exceptionalResolutionRef?.trim()) {
        return 'Resolución DT no aplica a jornada flexible';
      }
      return null;

    case ShiftSystemType.FREE:
      if (input.art22Exempt !== true) {
        return 'Debe confirmar exención Art. 22 para jornada sin control';
      }
      if (fixed || band) return 'Horarios no aplican a jornada sin control';
      if (input.exceptionalResolutionRef?.trim()) {
        return 'Resolución DT no aplica a jornada sin control';
      }
      return null;

    case ShiftSystemType.EXCEPTIONAL:
      if (weekly == null || !(weekly > 0)) return 'Horas semanales pactadas requeridas';
      if (!input.exceptionalResolutionRef?.trim()) {
        return 'Referencia de resolución DT requerida para jornada excepcional';
      }
      if (fixed) return 'Horario fijo no aplica a jornada excepcional';
      if (band) return 'Banda horaria no aplica a jornada excepcional';
      return null;

    default:
      return 'Tipo de sistema de jornada inválido';
  }
}
