const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

function ddMmYyyy(y: string, m: string, d: string): string {
  return `${d}/${m}/${y}`;
}

/** Convierte ISO / Date a DD/MM/YYYY; deja el resto igual. */
export function formatSamiCellDate(value: unknown): unknown {
  if (typeof value === 'string') {
    const m = ISO_DATE_PREFIX.exec(value);
    if (m) return ddMmYyyy(m[1], m[2], m[3]);
    return value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const iso = value.toISOString();
    const m = ISO_DATE_PREFIX.exec(iso);
    if (m && iso.endsWith('T00:00:00.000Z')) {
      return ddMmYyyy(m[1], m[2], m[3]);
    }
    return new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value);
  }
  return value;
}
