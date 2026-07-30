import type { SupplierGridRow } from "@/features/purchasing-reception/types/supplier.types";

export type SupplierIdentityPrintFields = {
  /** Razón social (empresa) o nombre completo (persona natural). */
  legalName: string | null;
  /** Texto listo para impresión, p. ej. `RUT 76.123.456-7` o `RUN 12.345.678-9`. */
  taxIdLine: string | null;
  address: string | null;
};

function documentKindLabel(documentType: string | null | undefined): string {
  const t = String(documentType ?? "").trim().toUpperCase();
  if (t === "RUN") return "RUT";
  if (t === "RUT") return "RUT";
  if (t === "PASSPORT") return "Pasaporte";
  if (t === "DNI" || t === "OTHER") return "Otro";
  if (t) return String(documentType).trim();
  return "";
}

/**
 * Deriva nombre/razón social, documento y dirección desde el listado de proveedores (grid API).
 */
export function buildSupplierIdentityPrintFields(
  row: SupplierGridRow | null | undefined,
): SupplierIdentityPrintFields {
  const p = row?.person;
  let legalName: string | null = null;
  if (p) {
    if (p.type === "COMPANY") {
      const bn = p.businessName?.trim();
      if (bn) {
        legalName = bn;
      }
    }
    if (!legalName) {
      const parts = [p.firstName, p.lastName]
        .filter((x) => x != null && String(x).trim() !== "")
        .map((x) => String(x).trim());
      legalName = parts.length ? parts.join(" ") : null;
    }
  }

  const kind = documentKindLabel(p?.documentType);
  const num = p?.documentNumber?.trim() || "";
  let taxIdLine: string | null = null;
  if (kind && num) {
    taxIdLine = `${kind} ${num}`;
  } else if (num) {
    taxIdLine = num;
  } else if (kind) {
    taxIdLine = kind;
  }

  const address = p?.address?.trim() || null;

  return { legalName, taxIdLine, address };
}
