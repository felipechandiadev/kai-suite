import ExcelJS from "exceljs";

/** Encabezados exactos de la plantilla (fila 1). */
export const BULK_RECEPTION_HEADERS = [
  "rut_proveedor",
  "numero_factura",
  "sku",
  "codigo_barras",
  "cantidad",
  "precio_neto",
] as const;

export type BulkReceptionExcelHeader = (typeof BULK_RECEPTION_HEADERS)[number];

export type BulkReceptionExcelRow = {
  /** 1-based Excel row number (incluye encabezado: datos desde 2). */
  rowNumber: number;
  rutProveedor: string;
  numeroFactura: string;
  sku: string;
  codigoBarras: string;
  cantidad: number | null;
  precioNeto: number | null;
  raw: Record<BulkReceptionExcelHeader, string>;
};

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const o = value as { text?: string; result?: unknown; richText?: Array<{ text?: string }> };
    if (typeof o.text === "string") return o.text.trim();
    if (o.result != null) return cellToString(o.result as ExcelJS.CellValue);
    if (Array.isArray(o.richText)) {
      return o.richText.map((p) => p.text ?? "").join("").trim();
    }
  }
  return String(value).trim();
}

function parsePositiveNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  // Chilean: 1.234,56 → try replace thousand dots only if comma present
  let n: number;
  if (raw.includes(",") && raw.includes(".")) {
    n = Number(raw.replace(/\./g, "").replace(",", "."));
  } else if (raw.includes(",")) {
    n = Number(raw.replace(",", "."));
  } else {
    n = Number(raw);
  }
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Genera el ArrayBuffer de la plantilla XLSX. */
export async function buildBulkReceptionTemplateBuffer(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kai";
  const ws = wb.addWorksheet("Recepciones", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.addRow([...BULK_RECEPTION_HEADERS]);
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.commit();
  ws.getColumn(1).width = 16;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 14;
  // Ejemplo (fila 2) — Comercial Andes (seed Kai Food); el usuario puede borrar
  ws.addRow(["76.123.456-0", "F-1001", "SEEDDEVINSCARNE", "7804004001101", 10, 5200]);
  for (let c = 1; c <= 4; c++) {
    ws.getRow(2).getCell(c).numFmt = "@";
  }
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

export function downloadBulkReceptionTemplate(buffer: ArrayBuffer, filename = "plantilla-recepciones.xlsx") {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parsea un archivo XLSX de carga masiva.
 * Exige encabezados exactos en la fila 1.
 */
export async function parseBulkReceptionExcel(
  data: ArrayBuffer | Uint8Array,
): Promise<{ rows: BulkReceptionExcelRow[]; error?: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data as ExcelJS.Buffer);
  } catch {
    return { rows: [], error: "No se pudo leer el archivo Excel." };
  }
  const ws = wb.worksheets[0];
  if (!ws) {
    return { rows: [], error: "El Excel no tiene hojas." };
  }

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  for (let c = 1; c <= BULK_RECEPTION_HEADERS.length; c++) {
    headers.push(cellToString(headerRow.getCell(c).value).toLowerCase());
  }
  for (let i = 0; i < BULK_RECEPTION_HEADERS.length; i++) {
    if (headers[i] !== BULK_RECEPTION_HEADERS[i]) {
      return {
        rows: [],
        error: `Encabezado inválido en columna ${i + 1}: se esperaba "${BULK_RECEPTION_HEADERS[i]}", se encontró "${headers[i] || "(vacío)"}". Descargue la plantilla.`,
      };
    }
  }

  const rows: BulkReceptionExcelRow[] = [];
  const last = ws.rowCount || 0;
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r);
    const rawVals: Record<BulkReceptionExcelHeader, string> = {
      rut_proveedor: cellToString(row.getCell(1).value),
      numero_factura: cellToString(row.getCell(2).value),
      sku: cellToString(row.getCell(3).value),
      codigo_barras: cellToString(row.getCell(4).value),
      cantidad: cellToString(row.getCell(5).value),
      precio_neto: cellToString(row.getCell(6).value),
    };
    const empty = BULK_RECEPTION_HEADERS.every((h) => !rawVals[h]);
    if (empty) continue;

    const cantidad = parsePositiveNumber(rawVals.cantidad);
    const precioNeto = parsePositiveNumber(rawVals.precio_neto);
    rows.push({
      rowNumber: r,
      rutProveedor: rawVals.rut_proveedor,
      numeroFactura: rawVals.numero_factura,
      sku: rawVals.sku,
      codigoBarras: rawVals.codigo_barras,
      cantidad: cantidad != null && cantidad > 0 ? cantidad : cantidad,
      precioNeto: precioNeto != null && precioNeto > 0 ? Math.round(precioNeto) : precioNeto,
      raw: rawVals,
    });
  }

  if (!rows.length) {
    return { rows: [], error: "El Excel no tiene filas de datos." };
  }
  return { rows };
}
