import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";

/** Nombre mostrable + documento (tipo y número) para opciones de proveedor en DTE. */
export function supplierOptionLabel(row: SupplierGridRow): string {
  const p = row.person;
  const name =
    p?.type === "COMPANY" && p.businessName?.trim()
      ? p.businessName.trim()
      : [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() || row.alias?.trim() || row.id;

  const docType = (p?.documentType ?? "").trim();
  const docNum = (p?.documentNumber ?? "").trim();
  const doc =
    docType && docNum ? `${docType} ${docNum}` : docNum || docType || "";

  return doc ? `${name} · ${doc}` : name;
}
