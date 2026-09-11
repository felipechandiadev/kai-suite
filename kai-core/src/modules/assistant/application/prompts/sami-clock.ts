const SAMI_TZ = 'America/Santiago';

/** Fecha civil YYYY-MM-DD en zona Chile. */
export function samiCivilDate(now = new Date(), timeZone = SAMI_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 0 = lunes … 6 = domingo, sobre una fecha civil. */
function weekdayMon0(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 6 : js - 1;
}

/** Bloque de reloj para el system prompt: el modelo no tiene fecha real. */
export function buildSamiClockPrompt(now = new Date()): string {
  const today = samiCivilDate(now);
  const [y, month] = today.split('-');
  const monthStart = `${y}-${month}-01`;
  const yearStart = `${y}-01-01`;
  const weekStart = addDaysIso(today, -weekdayMon0(today));
  const longEs = new Intl.DateTimeFormat('es-CL', {
    timeZone: SAMI_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  return `Reloj (America/Santiago): hoy es ${longEs} (${today}).
Periodos relativos respecto de hoy:
- esta semana (lun–dom): ${weekStart} … ${today}
- este mes: ${monthStart} … ${today}
- este año: ${yearStart} … ${today}
Usá estas fechas para “hoy”, “este mes”, “esta semana”. No uses una fecha de tu entrenamiento.`;
}
