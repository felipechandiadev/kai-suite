/**
 * Clasifica un slot de horario respecto a la franja nocturna de la empresa
 * (HrJornadaConfig.nightStart / nightEnd, p. ej. 21:00–07:00).
 */

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Normaliza un intervalo que puede cruzar medianoche a segmentos [0, 1440). */
function toSegments(startMin: number, endMin: number): [number, number][] {
  if (endMin > startMin) return [[startMin, endMin]];
  if (endMin === startMin) return [];
  return [
    [startMin, 24 * 60],
    [0, endMin],
  ];
}

function segmentsOverlap(
  a: [number, number][],
  b: [number, number][],
): boolean {
  for (const [as, ae] of a) {
    for (const [bs, be] of b) {
      if (as < be && bs < ae) return true;
    }
  }
  return false;
}

export type NightClassification = {
  isNight: boolean;
  isNightOutgoing: boolean;
};

/**
 * isNight: el turno solapa la franja nocturna.
 * isNightOutgoing: es nocturno y termina en la madrugada (dentro de nightEnd),
 * típico de turnos que cruzan medianoche.
 */
export function classifyShiftSlot(
  startTime: string,
  endTime: string,
  nightStart: string,
  nightEnd: string,
): NightClassification {
  const start = parseHm(startTime);
  const end = parseHm(endTime);
  const nStart = parseHm(nightStart);
  const nEnd = parseHm(nightEnd);

  const workSegs = toSegments(start, end);
  const nightSegs = toSegments(nStart, nEnd);
  const isNight = segmentsOverlap(workSegs, nightSegs);

  // Sale en madrugada: end está en [0, nightEnd) y el turno cruza medianoche o empieza en franja noche
  const endsInMorningWindow = end > 0 && end <= nEnd;
  const crossesMidnight = end <= start;
  const isNightOutgoing =
    isNight && (crossesMidnight || endsInMorningWindow) && endsInMorningWindow;

  return { isNight, isNightOutgoing };
}
