const SANTIAGO_TZ = "America/Santiago";

export type SantiagoDateParts = {
  date: string;
  hour: number;
  minute: number;
};

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? "00";
}

export function getSantiagoDateParts(now = new Date()): SantiagoDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SANTIAGO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  return {
    date: `${partValue(parts, "year")}-${partValue(parts, "month")}-${partValue(parts, "day")}`,
    hour: Number(partValue(parts, "hour")),
    minute: Number(partValue(parts, "minute")),
  };
}

export function addDaysToIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day + days));
  return dt.toISOString().slice(0, 10);
}

export function buildThreeDayWindow(fromDate: string): Set<string> {
  return new Set([
    fromDate,
    addDaysToIsoDate(fromDate, 1),
    addDaysToIsoDate(fromDate, 2),
  ]);
}

export function isCutoffStillOpen(cutoffTime: string, parts: SantiagoDateParts): boolean {
  const [hh, mm] = cutoffTime.split(":");
  const cutoffMinutes = Number(hh) * 60 + Number(mm);
  const nowMinutes = parts.hour * 60 + parts.minute;
  return cutoffMinutes > nowMinutes;
}
