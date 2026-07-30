/** Etiquetas UI para `Person.documentType` en listados y detalle. */
export function documentTypeLabel(code: string | null | undefined): string {
  if (code == null || String(code).trim() === "") {
    return "—";
  }
  const c = String(code).trim().toUpperCase();
  switch (c) {
    case "RUN":
      return "RUT";
    case "RUT":
      return "RUT";
    case "PASSPORT":
      return "Pasaporte";
    case "DNI":
    case "OTHER":
      return "Otro";
    default:
      return c;
  }
}
