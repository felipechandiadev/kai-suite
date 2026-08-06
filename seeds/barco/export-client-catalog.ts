/**
 * Genera Excel para el cliente (catálogo por sucursal Barco/Ohlala).
 *
 * Uso (desde raíz monorepo o carpeta seeds):
 *   npm run export:barco-catalog --prefix seeds
 *
 * Salida: seeds/barco/exports/catalogo-barco-cliente.xlsx
 * Hojas: Instrucciones, Ohlala (PDVDATA/food), El_Barco (PDVDATA-barco/store).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadBarcoCatalogFile,
  type BarcoCatalogProduct,
} from "./load-catalog";
import {
  disambiguateDuplicateNames,
  stripParenEanFromName,
  suggestProductTypeAndKitchen,
} from "./catalog-clean.util";

type ExportRow = {
  nombre: string;
  nombre_original: string;
  sku: string;
  codigo_barras: string;
  categoria: string;
  unidad: string;
  tipo_producto: string;
  cocina: string;
  precio: number;
  precio_bruto: number;
  precio_neto: number;
  lista_precios: string;
  costo: number;
  activo: string;
  eshop: string;
  menu: string;
  origen: string;
  nota: string;
};

type BranchOrigen = "ohlala" | "el-barco";

type Tagged = BarcoCatalogProduct & {
  origen: BranchOrigen;
  notaParts: string[];
};

function normalizeKeyPart(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function productDedupeKey(p: BarcoCatalogProduct): string {
  const barcode = (p.barcode ?? "").toString().trim();
  if (barcode) return `b:${barcode}`;
  return `n:${normalizeKeyPart(p.name || "")}`;
}

function remappedSku(prefix: string, original: string, used: Set<string>): string {
  const base = `${prefix}${String(original).trim() || "SKU"}`;
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function buildBranchRows(which: "food" | "store"): ExportRow[] {
  const catalog = loadBarcoCatalogFile(which);
  const origen: BranchOrigen = which === "food" ? "ohlala" : "el-barco";
  const skuPrefix = which === "food" ? "OHL-" : "BAR-";

  const byKey = new Map<string, Tagged>();
  for (const p of catalog.products) {
    const key = productDedupeKey(p);
    if (!key || key === "n:") continue;
    if (byKey.has(key)) continue;
    byKey.set(key, { ...p, origen, notaParts: [] });
  }

  const usedSkus = new Set<string>();
  const tagged: Tagged[] = [];
  for (const p of byKey.values()) {
    let sku = String(p.sku ?? "").trim();
    if (!sku || usedSkus.has(sku)) {
      sku = remappedSku(skuPrefix, sku || "SKU", usedSkus);
      p.notaParts.push("sku_remapeado");
    }
    usedSkus.add(sku);
    tagged.push({ ...p, sku, trackInventory: false });
  }

  const rowsRaw = tagged.map((p) => toExportRow(p));
  return disambiguateDuplicateNames(rowsRaw);
}

function toExportRow(p: Tagged): ExportRow {
  const { clean, original, stripped } = stripParenEanFromName(
    p.name,
    p.barcode,
    p.sku,
  );
  const sug = suggestProductTypeAndKitchen({
    categoryName: p.categoryName,
    sku: p.sku,
  });
  const notes = [...p.notaParts];
  if (stripped) notes.push("nombre_sin_ean");
  if (!(p.basePrice > 0)) notes.push("precio_cero");
  if (!(p.baseCost > 0)) notes.push("sin_costo");

  const bruto = Math.round(Number(p.basePrice) || 0);
  const neto = Math.round((Number(p.retailNet) || 0) * 100) / 100;

  return {
    nombre: clean,
    nombre_original: stripped && clean !== original ? original : "",
    sku: p.sku,
    codigo_barras: (p.barcode ?? "").toString().trim(),
    categoria: p.categoryName || "Sin categoría",
    unidad: p.productBaseUnit || "UN",
    tipo_producto: sug.tipo,
    cocina: sug.cocina,
    precio: bruto,
    precio_bruto: bruto,
    precio_neto: neto,
    lista_precios: "Minorista",
    costo: Math.round(Number(p.baseCost) || 0),
    activo: "si",
    eshop: "no",
    menu: sug.menu ? "si" : "no",
    origen: p.origen,
    nota: notes.join("; "),
  };
}

const PRODUCT_HEADERS = [
  "nombre",
  "nombre_original",
  "sku",
  "codigo_barras",
  "categoria",
  "unidad",
  "tipo_producto",
  "cocina",
  "precio",
  "precio_bruto",
  "precio_neto",
  "lista_precios",
  "costo",
  "activo",
  "eshop",
  "menu",
  "origen",
  "nota",
] as const;

function countDisambiguated(rows: ExportRow[]): number {
  return rows.filter((r) =>
    r.nota.split(";").some((p) => p.trim() === "nombre_desambiguado"),
  ).length;
}

async function main() {
  // exceljs en node_modules del monorepo
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ExcelJS = require(join(
    __dirname,
    "..",
    "..",
    "node_modules",
    "exceljs",
  )) as typeof import("exceljs");

  const ohlalaRows = buildBranchRows("food");
  const barcoRows = buildBranchRows("store");
  const disambiguated =
    countDisambiguated(ohlalaRows) + countDisambiguated(barcoRows);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Kai";
  wb.created = new Date();

  const instr = wb.addWorksheet("Instrucciones");
  instr.addRow(["Catálogo Barco / Ohlala — instrucciones para el cliente"]);
  instr.addRow([]);
  instr.addRow([
    "Hay una hoja por sucursal (base PDV). Revisá y limpiá cada una por separado.",
  ]);
  instr.addRow([
    "Ohlala = exports/PDVDATA (cafetería / food). El_Barco = exports/PDVDATA-barco (sucursal El Barco / store).",
  ]);
  instr.addRow([
    "Editá tipo_producto y cocina según corresponda. Para Carga masiva en Admin, copiá una hoja a un archivo cuya hoja se llame Productos (el import busca esa hoja).",
  ]);
  instr.addRow([]);
  instr.addRow(["Columna", "Valores / notas"]);
  instr.addRow(["tipo_producto", "PHYSICAL | PREPARADO | ELABORADO"]);
  instr.addRow([
    "cocina",
    "Nombre exacto de la unidad de producción (ej. Cocina). Obligatorio si tipo=PREPARADO.",
  ]);
  instr.addRow(["precio", "Precio bruto CLP (lista Minorista / default)"]);
  instr.addRow(["precio_bruto / precio_neto", "Informativos; el import usa `precio`"]);
  instr.addRow(["activo / eshop / menu", "si | no"]);
  instr.addRow([
    "origen",
    "ohlala | el-barco (fijo por hoja; no hace falta editarlo)",
  ]);
  instr.addRow([
    "nombre",
    "Limpio (sin EAN genérico). Si había colisión de nombre en la misma hoja, se agrega (barcode|sku) — nota nombre_desambiguado.",
  ]);
  instr.getColumn(1).width = 22;
  instr.getColumn(2).width = 80;

  function addProductSheet(name: string, data: ExportRow[]) {
    const ws = wb.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.addRow([...PRODUCT_HEADERS]);
    ws.getRow(1).font = { bold: true };
    for (const r of data) {
      ws.addRow(PRODUCT_HEADERS.map((h) => r[h]));
    }
    ws.getColumn(1).width = 36;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 16;
    ws.getColumn(4).width = 16;
    ws.getColumn(5).width = 18;
    ws.getColumn(7).width = 14;
    ws.getColumn(8).width = 12;
  }

  addProductSheet("Ohlala", ohlalaRows);
  addProductSheet("El_Barco", barcoRows);

  const outDir = join(__dirname, "exports");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "catalogo-barco-cliente.xlsx");
  const buf = await wb.xlsx.writeBuffer();
  writeFileSync(outPath, Buffer.from(buf));

  console.log(
    `✅ Excel generado: ${outPath}` +
      ` · Ohlala=${ohlalaRows.length}` +
      ` · El_Barco=${barcoRows.length}` +
      ` · nombres desambiguados=${disambiguated}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
