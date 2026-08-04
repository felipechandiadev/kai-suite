import ExcelJS from "exceljs";

/** Encabezados exactos de la plantilla (fila 1). */
export const BULK_PRODUCT_HEADERS = [
  "nombre",
  "sku",
  "codigo_barras",
  "categoria",
  "activo",
  "eshop",
  "menu",
  "precio",
] as const;

export type BulkProductExcelHeader = (typeof BULK_PRODUCT_HEADERS)[number];

export type BulkProductExcelRow = {
  /** 1-based Excel row number (incluye encabezado: datos desde 2). */
  rowNumber: number;
  nombre: string;
  sku: string;
  codigoBarras: string;
  categoria: string;
  /** null = celda vacía → default true en prepare */
  activo: boolean | null;
  /** null = celda vacía → default false */
  eshop: boolean | null;
  /** null = celda vacía → default false */
  menu: boolean | null;
  /** null = vacío → 0; número parseado (puede ser 0) */
  precio: number | null;
  precioRaw: string;
  activoRaw: string;
  eshopRaw: string;
  menuRaw: string;
  raw: Record<BulkProductExcelHeader, string>;
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
    const o = value as {
      text?: string;
      result?: unknown;
      richText?: Array<{ text?: string }>;
    };
    if (typeof o.text === "string") return o.text.trim();
    if (o.result != null) return cellToString(o.result as ExcelJS.CellValue);
    if (Array.isArray(o.richText)) {
      return o.richText.map((p) => p.text ?? "").join("").trim();
    }
  }
  return String(value).trim();
}

/** Parsea precio ≥ 0 (CLP). Vacío → null. */
export function parseNonNegativeNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  let n: number;
  if (raw.includes(",") && raw.includes(".")) {
    n = Number(raw.replace(/\./g, "").replace(",", "."));
  } else if (raw.includes(",")) {
    n = Number(raw.replace(",", "."));
  } else {
    n = Number(raw.replace(/\s/g, ""));
  }
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Booleanos Excel: si/sí/true/1 → true; no/false/0 → false.
 * Vacío → null (usar default). Inválido → undefined (error).
 */
export function parseOptionalBoolean(
  raw: string,
): boolean | null | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s === "si" || s === "sí" || s === "true" || s === "1" || s === "yes") {
    return true;
  }
  if (s === "no" || s === "false" || s === "0") {
    return false;
  }
  return undefined;
}

/** Genera el ArrayBuffer de la plantilla XLSX. */
export async function buildBulkProductTemplateBuffer(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kai";
  const ws = wb.addWorksheet("Productos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.addRow([...BULK_PRODUCT_HEADERS]);
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.commit();
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 10;
  ws.getColumn(6).width = 10;
  ws.getColumn(7).width = 10;
  ws.getColumn(8).width = 12;
  // Ejemplo (fila 2) — el usuario puede borrar
  ws.addRow([
    "Producto ejemplo",
    "SKU-EJEMPLO-001",
    "7804004001101",
    "",
    "si",
    "no",
    "no",
    1000,
  ]);
  for (let c = 1; c <= 7; c++) {
    ws.getRow(2).getCell(c).numFmt = "@";
  }
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

export function downloadBulkProductTemplate(
  buffer: ArrayBuffer,
  filename = "plantilla-productos.xlsx",
) {
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
 * Parsea un archivo XLSX de carga masiva de productos.
 * Exige encabezados exactos en la fila 1.
 */
export async function parseBulkProductExcel(
  data: ArrayBuffer | Uint8Array,
): Promise<{ rows: BulkProductExcelRow[]; error?: string }> {
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
  for (let c = 1; c <= BULK_PRODUCT_HEADERS.length; c++) {
    headers.push(cellToString(headerRow.getCell(c).value).toLowerCase());
  }
  for (let i = 0; i < BULK_PRODUCT_HEADERS.length; i++) {
    if (headers[i] !== BULK_PRODUCT_HEADERS[i]) {
      return {
        rows: [],
        error: `Encabezado inválido en columna ${i + 1}: se esperaba "${BULK_PRODUCT_HEADERS[i]}", se encontró "${headers[i] || "(vacío)"}". Descargue la plantilla.`,
      };
    }
  }

  const rows: BulkProductExcelRow[] = [];
  const last = ws.rowCount || 0;
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r);
    const rawVals: Record<BulkProductExcelHeader, string> = {
      nombre: cellToString(row.getCell(1).value),
      sku: cellToString(row.getCell(2).value),
      codigo_barras: cellToString(row.getCell(3).value),
      categoria: cellToString(row.getCell(4).value),
      activo: cellToString(row.getCell(5).value),
      eshop: cellToString(row.getCell(6).value),
      menu: cellToString(row.getCell(7).value),
      precio: cellToString(row.getCell(8).value),
    };
    const empty = BULK_PRODUCT_HEADERS.every((h) => !rawVals[h]);
    if (empty) continue;

    const precioParsed = parseNonNegativeNumber(rawVals.precio);
    const activo = parseOptionalBoolean(rawVals.activo);
    const eshop = parseOptionalBoolean(rawVals.eshop);
    const menu = parseOptionalBoolean(rawVals.menu);

    rows.push({
      rowNumber: r,
      nombre: rawVals.nombre,
      sku: rawVals.sku,
      codigoBarras: rawVals.codigo_barras,
      categoria: rawVals.categoria,
      activo: activo === undefined ? null : activo,
      eshop: eshop === undefined ? null : eshop,
      menu: menu === undefined ? null : menu,
      precio:
        precioParsed != null && precioParsed >= 0
          ? Math.round(precioParsed)
          : precioParsed,
      precioRaw: rawVals.precio,
      activoRaw: rawVals.activo,
      eshopRaw: rawVals.eshop,
      menuRaw: rawVals.menu,
      raw: rawVals,
    });
  }

  if (!rows.length) {
    return { rows: [], error: "El Excel no tiene filas de datos." };
  }
  return { rows };
}
