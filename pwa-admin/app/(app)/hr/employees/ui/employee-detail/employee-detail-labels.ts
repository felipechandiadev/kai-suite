import type { BadgeVariant } from "@kai/ui";

export const EMPLOYEE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
  TERMINATED: "Terminado",
};

export const EMPLOYEE_EMPLOYMENT_LABEL: Record<string, string> = {
  FULL_TIME: "Jornada completa",
  PART_TIME: "Part time",
  CONTRACTOR: "Contratista",
  TEMPORARY: "Temporal",
  INTERN: "Práctica",
};

export function employeeStatusBadgeVariant(status: string): BadgeVariant {
  if (status === "ACTIVE") return "success-outlined";
  if (status === "SUSPENDED") return "warning-outlined";
  if (status === "TERMINATED") return "secondary-outlined";
  return "secondary-outlined";
}

export function formatDateOnlySlash(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "—";
  }
  const trimmed = value.trim();
  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(trimmed);
  if (Number.isNaN(dt.getTime())) {
    return "—";
  }
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

export function formatMoneyClp(value: string | number | null | undefined): string {
  if (value == null || String(value).trim() === "") {
    return "—";
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "—";
  }
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function documentLine(
  person: { documentType?: string | null; documentNumber?: string | null } | null | undefined,
): string {
  if (!person?.documentNumber?.trim()) {
    return "—";
  }
  const dt = person.documentType?.trim() || "—";
  return `${dt}: ${person.documentNumber}`;
}
