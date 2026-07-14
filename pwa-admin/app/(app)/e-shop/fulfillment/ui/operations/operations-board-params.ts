export const OPERATIONS_ROUTE = "/e-shop/fulfillment/operacion";
export const CALENDAR_ROUTE = "/e-shop/fulfillment/calendario";

export type OperationsBoardParams = {
  date?: string;
  /** `null` elimina el parámetro de la URL. */
  occurrenceId?: string | null;
  /** `null` elimina el parámetro de la URL. */
  search?: string | null;
};

/**
 * Aplica los cambios de `params` sobre unos `URLSearchParams` base (los actuales),
 * respetando el resto de parámetros ya presentes. `null` elimina el parámetro.
 */
export function applyOperationsParams(
  base: URLSearchParams | string,
  params: OperationsBoardParams,
): URLSearchParams {
  const next = new URLSearchParams(
    typeof base === "string" ? base : base.toString(),
  );

  if (params.date !== undefined) {
    next.set("date", params.date);
  }

  if (params.occurrenceId === null) {
    next.delete("occurrenceId");
  } else if (params.occurrenceId !== undefined) {
    next.set("occurrenceId", params.occurrenceId);
  }

  if (params.search === null) {
    next.delete("search");
  } else if (params.search !== undefined) {
    const normalized = params.search.trim().replace(/^#/, "");
    if (normalized) next.set("search", normalized);
    else next.delete("search");
  }

  return next;
}

/** Construye el href completo de la operación con los parámetros aplicados. */
export function buildOperationsHref(
  base: URLSearchParams | string,
  params: OperationsBoardParams,
): string {
  const query = applyOperationsParams(base, params).toString();
  return query ? `${OPERATIONS_ROUTE}?${query}` : OPERATIONS_ROUTE;
}

/** Lee los parámetros de operación desde unos `URLSearchParams`. */
export function readOperationsParams(source: URLSearchParams): {
  date: string | null;
  occurrenceId: string | null;
  search: string;
} {
  return {
    date: source.get("date"),
    occurrenceId: source.get("occurrenceId"),
    search: source.get("search") ?? "",
  };
}
