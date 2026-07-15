const STATUS_LABELS: Record<string, string> = {
  planned: "Planificado",
  route_ready: "Ruta lista",
  out: "En ruta",
  completed: "Completado",
  cancelled: "Cancelado",
};

const STATUS_BADGE: Record<
  string,
  "secondary-outlined" | "primary-outlined" | "success-outlined" | "warning-outlined"
> = {
  planned: "secondary-outlined",
  route_ready: "primary-outlined",
  out: "warning-outlined",
  completed: "success-outlined",
  cancelled: "secondary-outlined",
};

export function dispatchStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function dispatchStatusBadgeVariant(
  status: string,
): "secondary-outlined" | "primary-outlined" | "success-outlined" | "warning-outlined" {
  return STATUS_BADGE[status] ?? "secondary-outlined";
}

/** HH:mm desde time Postgres (HH:mm:ss). */
export function formatDispatchTime(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

export function formatRouteDistance(meters: number | null): string | null {
  if (meters == null || meters <= 0) return null;
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
