export type GridSlot = { row: number; col: number };

/** Columnas del header desktop: Add+título | vacío | Toolbar+Search */
export const HEADER_GRID_COLUMNS = 3;

export const HEADER_GRID_TEMPLATE_COLUMNS = "auto minmax(0, 1fr) auto";

/** Primera fila de acciones (fila 1 reservada para Add+título y Toolbar). */
export const HEADER_ACTIONS_FIRST_ROW = 2;

/**
 * Coloca headerActions en un grid de 3 columnas:
 * - Fila 1: col 1 = Add+título, col 2 vacía, col 3 = Toolbar.
 * - Fila 2+: cols 1–3 = acciones (izq → der, 3 por fila; celdas sin ítem quedan vacías).
 */
export function getActionSlotPositions(count: number): GridSlot[] {
  const slots: GridSlot[] = [];

  for (let i = 0; i < count; i += 1) {
    slots.push({
      row: HEADER_ACTIONS_FIRST_ROW + Math.floor(i / HEADER_GRID_COLUMNS),
      col: 1 + (i % HEADER_GRID_COLUMNS),
    });
  }

  return slots;
}
