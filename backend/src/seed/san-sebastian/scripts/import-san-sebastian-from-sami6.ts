#!/usr/bin/env ts-node
/**
 * Importa catálogo San Sebastián desde dumps MySQL sami6.
 *
 * Uso: npm run seed:import-san-sebastian
 * Env opcional:
 *   SAN_SEBASTIAN_CATEGORIES_SQL=/ruta/sami6_categories.sql
 *   SAN_SEBASTIAN_PRODUCTS_SQL=/ruta/sami6_products.sql
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const CATEGORIES_OUT = path.join(DATA_DIR, 'san-sebastian-categories.json');
const CATALOG_OUT = path.join(DATA_DIR, 'san-sebastian-catalog.json');

const DEFAULT_CATEGORIES_SQL =
  '/Users/felipe/Downloads/san sebastian 25062026/sami6_categories.sql';
const DEFAULT_PRODUCTS_SQL =
  '/Users/felipe/Downloads/san sebastian 25062026/sami6_products.sql';

const EXCLUDED_CATEGORY_IDS = new Set(['1030', '1031', '1032', '1033', '1034']);
const FALLBACK_CATEGORY_NAME = 'VARIOS';
const EXCLUDED_PRODUCT_NAMES = new Set(['VENTA SIN DETALLE']);

type Sami6Category = { id: string; name: string };

type CatalogProduct = {
  sami6Id: number;
  name: string;
  barcode: string | null;
  categoryName: string;
  saleGross: number;
  hasIva: boolean;
};

export type SanSebastianCatalogJson = {
  meta: {
    source: string;
    importedAt: string;
    productCount: number;
    categoryCount: number;
  };
  categories: string[];
  products: CatalogProduct[];
};

function readSql(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró archivo SQL: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function fixMojibake(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (!/[\u00AC\u00A8\u00AE\u00E0\u00F6\u00C3\u221A\u201A]/.test(trimmed)) {
    return trimmed;
  }
  try {
    const fixed = Buffer.from(trimmed, 'latin1').toString('utf8').trim();
    if (fixed && fixed !== trimmed) return fixed;
  } catch {
    /* ignore */
  }
  return trimmed;
}

function parseCategories(sql: string): Sami6Category[] {
  const matches = [...sql.matchAll(/\((\d+),'([^']*)'/g)];
  return matches.map((m) => ({
    id: m[1],
    name: fixMojibake(m[2]),
  }));
}

function parseSqlInsertTuples(valuesBlob: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  while (i < valuesBlob.length) {
    if (valuesBlob[i] !== '(') {
      i += 1;
      continue;
    }
    i += 1;
    const fields: string[] = [];
    let cur = '';
    let inStr = false;
    while (i < valuesBlob.length) {
      const ch = valuesBlob[i];
      if (inStr) {
        if (ch === '\\' && i + 1 < valuesBlob.length) {
          cur += valuesBlob[i + 1];
          i += 2;
          continue;
        }
        if (ch === "'") {
          inStr = false;
          i += 1;
          continue;
        }
        cur += ch;
        i += 1;
        continue;
      }
      if (ch === "'") {
        inStr = true;
        i += 1;
        continue;
      }
      if (ch === ',') {
        fields.push(cur.trim());
        cur = '';
        i += 1;
        continue;
      }
      if (ch === ')') {
        fields.push(cur.trim());
        rows.push(fields);
        i += 1;
        break;
      }
      cur += ch;
      i += 1;
    }
  }
  return rows;
}

function parseProducts(sql: string): string[][] {
  const match = sql.match(/INSERT INTO `products` VALUES (.+);/s);
  if (!match) {
    throw new Error('No se encontró INSERT INTO `products` en el dump SQL');
  }
  return parseSqlInsertTuples(match[1]);
}

function toCatalogProduct(
  row: string[],
  categoryById: Map<string, string>,
): CatalogProduct | null {
  const [
    idRaw,
    nameRaw,
    codeRaw,
    ,
    ,
    affectedRaw,
    saleRaw,
    ,
    categoryIdRaw,
  ] = row;

  const name = fixMojibake(nameRaw);
  if (EXCLUDED_PRODUCT_NAMES.has(name.trim().toUpperCase())) {
    return null;
  }
  if (EXCLUDED_CATEGORY_IDS.has(categoryIdRaw)) {
    return null;
  }

  const categoryName =
    categoryIdRaw === 'NULL' || !categoryById.has(categoryIdRaw)
      ? FALLBACK_CATEGORY_NAME
      : categoryById.get(categoryIdRaw)!;

  const saleGross = Math.max(0, Number.parseInt(saleRaw, 10) || 0);
  const hasIva = affectedRaw === '1';
  const barcode =
    codeRaw && codeRaw !== 'NULL' && codeRaw.trim().length > 0
      ? codeRaw.trim()
      : null;

  return {
    sami6Id: Number.parseInt(idRaw, 10),
    name,
    barcode,
    categoryName,
    saleGross,
    hasIva,
  };
}

function main(): void {
  const categoriesPath =
    process.env.SAN_SEBASTIAN_CATEGORIES_SQL ?? DEFAULT_CATEGORIES_SQL;
  const productsPath =
    process.env.SAN_SEBASTIAN_PRODUCTS_SQL ?? DEFAULT_PRODUCTS_SQL;

  const categoriesSql = readSql(categoriesPath);
  const productsSql = readSql(productsPath);

  const sami6Categories = parseCategories(categoriesSql);
  const categoryById = new Map(
    sami6Categories.map((c) => [c.id, c.name] as const),
  );

  const categoryNames = sami6Categories
    .filter((c) => !EXCLUDED_CATEGORY_IDS.has(c.id))
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b, 'es'));

  if (!categoryNames.includes(FALLBACK_CATEGORY_NAME)) {
    categoryNames.push(FALLBACK_CATEGORY_NAME);
    categoryNames.sort((a, b) => a.localeCompare(b, 'es'));
  }

  const productRows = parseProducts(productsSql);
  const products: CatalogProduct[] = [];
  for (const row of productRows) {
    const item = toCatalogProduct(row, categoryById);
    if (item) products.push(item);
  }

  if (products.length === 0) {
    throw new Error('Catálogo importado vacío');
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const catalog: SanSebastianCatalogJson = {
    meta: {
      source: 'sami6',
      importedAt: new Date().toISOString(),
      productCount: products.length,
      categoryCount: categoryNames.length,
    },
    categories: categoryNames,
    products,
  };

  fs.writeFileSync(CATEGORIES_OUT, `${JSON.stringify(categoryNames, null, 2)}\n`);
  fs.writeFileSync(CATALOG_OUT, `${JSON.stringify(catalog, null, 2)}\n`);

  console.log(`✅ Categorías: ${categoryNames.length} → ${CATEGORIES_OUT}`);
  console.log(`✅ Productos: ${products.length} → ${CATALOG_OUT}`);
}

main();
