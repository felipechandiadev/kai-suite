/** Número de identificación del proveedor (RUT/RUN/DNI, sin prefijo de tipo). */
export function supplierPersonDocumentNumber(
  supplier:
    | {
        person?: {
          documentNumber?: string | null;
        } | null;
      }
    | null
    | undefined,
): string {
  const n = supplier?.person?.documentNumber?.trim();
  return n || "—";
}
