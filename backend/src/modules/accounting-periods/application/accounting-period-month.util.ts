import { BadRequestException } from '@nestjs/common';

/** Parse YYYY-MM-DD without timezone drift (unlike `new Date('YYYY-MM-DD')`). */
export function parseYmdParts(date: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!match) {
    throw new BadRequestException(`Invalid date format: ${date}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new BadRequestException(`Invalid date: ${date}`);
  }
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthBoundsFromYmd(date: string): {
  startDate: string;
  endDate: string;
  year: number;
  month: number;
} {
  const { year, month } = parseYmdParts(date);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = daysInMonth(year, month);
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate, year, month };
}

export const ACCOUNTING_PERIOD_MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;
