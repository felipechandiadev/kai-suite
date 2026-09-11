const WEEKDAY_ISO: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
};

function foldWeekdayKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** ISODOW 1=lunes … 7=domingo. Acepta número, "1" o nombre en español. */
export function normalizeWeekdayValue(value: unknown): unknown {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const asNum = Number(trimmed);
    if (Number.isInteger(asNum) && asNum >= 1 && asNum <= 7) return asNum;
    const mapped = WEEKDAY_ISO[foldWeekdayKey(trimmed)];
    if (mapped != null) return mapped;
  }
  return value;
}

export function isWeekdayFilterField(field: string): boolean {
  return field === 'weekday' || field === 'dow';
}
