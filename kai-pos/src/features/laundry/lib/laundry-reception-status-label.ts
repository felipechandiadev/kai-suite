import type { LaundryReceptionStatus } from "../types/laundry.types";

const STATUS_LABELS: Record<LaundryReceptionStatus, string> = {
  DRAFT: "Borrador",
  RECEIVED: "Recibida",
  IN_PROCESS: "En proceso",
  READY: "Lista",
  DELIVERED: "Entregada",
  CANCELLED: "Anulada",
};

export function laundryReceptionStatusLabel(status: LaundryReceptionStatus | string): string {
  const key = String(status).trim().toUpperCase() as LaundryReceptionStatus;
  return STATUS_LABELS[key] ?? String(status);
}

export const LAUNDRY_RECEPTION_STATUS_OPTIONS: Array<{
  value: LaundryReceptionStatus | "";
  label: string;
}> = [
  { value: "", label: "Todos" },
  ...(Object.keys(STATUS_LABELS) as LaundryReceptionStatus[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
  })),
];
