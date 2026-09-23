/** Encabezados exactos de la plantilla CSV (fila 1). */
export const LITE_BULK_PRODUCT_HEADERS = [
  "nombre",
  "sku",
  "codigo_barras",
  "tipo_producto",
  "precio",
  "categoria",
  "activo",
] as const;

export type LiteBulkProductHeader = (typeof LITE_BULK_PRODUCT_HEADERS)[number];

export type LiteBulkProductCsvRow = {
  rowNumber: number;
  nombre: string;
  sku: string;
  codigoBarras: string;
  tipoProducto: string;
  precio: number | null;
  precioRaw: string;
  categoria: string;
  activo: boolean | null;
  activoRaw: string;
};

export type LiteBulkPreparedLine = {
  rowNumber: number;
  name: string;
  sku: string;
  barcode?: string;
  productType: "PHYSICAL" | "SERVICE" | "PACK" | "INSUMO";
  basePrice: number;
  categoryName?: string;
  isActive?: boolean;
};

const ALLOWED_TYPES = new Set([
  "PHYSICAL",
  "SERVICE",
  "PACK",
  "INSUMO",
]);

function parseOptionalBoolean(raw: string): boolean | null | undefined {
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

function parseNonNegativeNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  let n: number;
  if (raw.includes(",") && raw.includes(".")) {
    n = Number(raw.replace(/\./g, "").replace(",", "."));
  } else if (raw.includes(",")) {
    n = Number(raw.replace(",", "."));
  } else {
    n = Number(raw.replace(/\s/g, ""));
  }
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** CSV simple: comillas opcionales, separador `,`. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export function downloadLiteBulkProductTemplate(): void {
  const header = LITE_BULK_PRODUCT_HEADERS.join(",");
  const example1 =
    "Producto demo,SKU-DEMO-001,7801234567890,PHYSICAL,1990,General,si";
  const example2 = "Servicio demo,SKU-SRV-001,,SERVICE,5000,,si";
  const bom = "\uFEFF";
  const body = [header, example1, example2].join("\n");
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla-productos-lite.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function parseLiteBulkProductCsv(text: string): {
  rows: LiteBulkProductCsvRow[];
  error?: string;
} {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], error: "El CSV debe tener encabezado y al menos una fila de datos." };
  }

  const headerCells = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const expected = [...LITE_BULK_PRODUCT_HEADERS];
  for (const h of expected) {
    if (!headerCells.includes(h)) {
      return {
        rows: [],
        error: `Falta columna "${h}". Encabezados esperados: ${expected.join(", ")}`,
      };
    }
  }
  const idx = Object.fromEntries(
    expected.map((h) => [h, headerCells.indexOf(h)]),
  ) as Record<LiteBulkProductHeader, number>;

  const rows: LiteBulkProductCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const get = (h: LiteBulkProductHeader) => cells[idx[h]] ?? "";
    const precioRaw = get("precio");
    const activoRaw = get("activo");
    rows.push({
      rowNumber: i + 1,
      nombre: get("nombre"),
      sku: get("sku"),
      codigoBarras: get("codigo_barras"),
      tipoProducto: get("tipo_producto"),
      precio: parseNonNegativeNumber(precioRaw),
      precioRaw,
      categoria: get("categoria"),
      activo: (() => {
        const b = parseOptionalBoolean(activoRaw);
        return b === undefined ? null : b;
      })(),
      activoRaw,
    });
  }
  return { rows };
}

export function prepareLiteBulkProductRows(rows: LiteBulkProductCsvRow[]): {
  lines: LiteBulkPreparedLine[];
  rowErrors: Array<{ rowNumber: number; message: string }>;
  blocked: boolean;
} {
  const rowErrors: Array<{ rowNumber: number; message: string }> = [];
  const skuInFile = new Map<string, number>();
  const bcInFile = new Map<string, number>();

  for (const row of rows) {
    const skuKey = row.sku.trim().toLowerCase();
    if (skuKey) {
      if (skuInFile.has(skuKey)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: `SKU duplicado en el archivo (también fila ${skuInFile.get(skuKey)}).`,
        });
      } else {
        skuInFile.set(skuKey, row.rowNumber);
      }
    }
    const bcKey = row.codigoBarras.trim().toLowerCase();
    if (bcKey) {
      if (bcInFile.has(bcKey)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: `Código de barras duplicado en el archivo (también fila ${bcInFile.get(bcKey)}).`,
        });
      } else {
        bcInFile.set(bcKey, row.rowNumber);
      }
    }
  }

  const lines: LiteBulkPreparedLine[] = [];
  const errorRows = new Set(rowErrors.map((e) => e.rowNumber));

  for (const row of rows) {
    if (errorRows.has(row.rowNumber)) continue;

    const nombre = row.nombre.trim();
    const sku = row.sku.trim();
    if (!nombre) {
      rowErrors.push({ rowNumber: row.rowNumber, message: "Nombre obligatorio." });
      continue;
    }
    if (!sku) {
      rowErrors.push({ rowNumber: row.rowNumber, message: "SKU obligatorio." });
      continue;
    }

    if (row.activoRaw.trim() && parseOptionalBoolean(row.activoRaw) === undefined) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: `Valor de activo inválido: "${row.activoRaw}". Use si/no.`,
      });
      continue;
    }

    if (row.precioRaw.trim() && row.precio == null) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: `Precio inválido: "${row.precioRaw}".`,
      });
      continue;
    }

    const typeRaw = row.tipoProducto.trim().toUpperCase() || "PHYSICAL";
    if (!ALLOWED_TYPES.has(typeRaw)) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: `tipo_producto inválido: "${row.tipoProducto}". Use PHYSICAL|SERVICE|PACK|INSUMO.`,
      });
      continue;
    }

    lines.push({
      rowNumber: row.rowNumber,
      name: nombre,
      sku,
      ...(row.codigoBarras.trim()
        ? { barcode: row.codigoBarras.trim() }
        : {}),
      productType: typeRaw as LiteBulkPreparedLine["productType"],
      basePrice: row.precio ?? 0,
      ...(row.categoria.trim() ? { categoryName: row.categoria.trim() } : {}),
      ...(row.activo != null ? { isActive: row.activo } : {}),
    });
  }

  return {
    lines,
    rowErrors,
    blocked: rowErrors.length > 0 || lines.length === 0,
  };
}
