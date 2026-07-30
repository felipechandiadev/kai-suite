/**
 * Checklist manual §11 OFFLINE-POS-MVP — ejecutar en QA y registrar resultados.
 * Este test documenta los pasos; no sustituye la verificación manual en dispositivo.
 */
import { describe, expect, it } from "vitest";

export const OFFLINE_MANUAL_QA_CHECKLIST = [
  "1. Sin red → venta efectivo/tarjeta + boleta con folio del rango POS",
  "2. Sin folios → solo ticket + mensaje claro",
  "3. Reconexión → una venta por clientOperationId",
  "4. Otro POS no usa folios ajenos",
  "5. nextFolio servidor coherente tras sync",
  "6. Emisión PENDING → worker SII",
  "7. Badge topbar ≠ icono impresora",
  "8. Búsqueda y escáner offline con snapshot de sesión",
  "9. Pack fiscal se renueva al reconectar",
  "10. Stock local agotado → advertencia; sync stock insuficiente → CONFLICT",
  "11. Bootstrap pack + catálogo visible al abrir caja",
] as const;

describe("OFFLINE-POS-MVP manual QA checklist", () => {
  it("documenta checklist §11 para ejecución manual", () => {
    expect(OFFLINE_MANUAL_QA_CHECKLIST.length).toBeGreaterThanOrEqual(7);
    expect(OFFLINE_MANUAL_QA_CHECKLIST[0]).toContain("Sin red");
  });
});
