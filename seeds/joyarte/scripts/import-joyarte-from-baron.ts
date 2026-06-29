#!/usr/bin/env ts-node
/**
 * Importa catálogo MVP desde tiendaonline.joyasbaron.cl (Jumpseller).
 * Genera joyarte/data/catalog.json e imágenes en joyarte/assets/products/.
 *
 * Uso: npm run seed:import-joyarte
 * Opciones env: JOYARTE_IMPORT_LIMIT_PER_CATEGORY=8 JOYARTE_IMPORT_DELAY_MS=400
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, type Page } from 'playwright';

const BASE_URL = 'https://tiendaonline.joyasbaron.cl';
const DATA_DIR = path.join(__dirname, '..', 'data');
const ASSETS_PRODUCTS_DIR = path.join(__dirname, '..', 'assets', 'products');
const CATALOG_PATH = path.join(DATA_DIR, 'catalog.json');

const SEARCH_QUERIES: { categoryName: string; query: string; limit: number }[] = [
  { categoryName: 'Anillos', query: 'anillo', limit: 8 },
  { categoryName: 'Aros', query: 'aros', limit: 8 },
  { categoryName: 'Collares', query: 'collar', limit: 8 },
  { categoryName: 'Colgantes', query: 'colgante', limit: 6 },
  { categoryName: 'Pulseras', query: 'pulsera', limit: 6 },
  { categoryName: 'Cadenas', query: 'cadena', limit: 4 },
  { categoryName: 'Anillos de Compromiso', query: 'compromiso', limit: 8 },
  { categoryName: 'Argollas de Matrimonio', query: 'argolla matrimonio', limit: 6 },
  { categoryName: 'Joyas de Oro', query: 'oro 18kt', limit: 6 },
  { categoryName: 'Joyas de Plata', query: 'plata esterlina', limit: 6 },
];

const COLLECTION_PATHS: { categoryName: string; path: string; limit: number }[] = [
  { categoryName: 'Anillos', path: '/anillos', limit: 8 },
  { categoryName: 'Aros', path: '/aros', limit: 8 },
  { categoryName: 'Collares', path: '/collares', limit: 8 },
  { categoryName: 'Colgantes', path: '/colgantes', limit: 6 },
  { categoryName: 'Pulseras', path: '/pulseras', limit: 6 },
  { categoryName: 'Cadenas', path: '/cadenas', limit: 4 },
  { categoryName: 'Anillos de Compromiso', path: '/anillos-de-compromiso', limit: 8 },
  { categoryName: 'Argollas de Matrimonio', path: '/argollas-de-matrimonio', limit: 6 },
  { categoryName: 'Joyas de Oro', path: '/joyas-de-oro', limit: 6 },
  { categoryName: 'Joyas de Plata', path: '/joyas-de-plata', limit: 6 },
];

function parseClpPrice(text: string): number | null {
  const t = text.trim();
  const match = t.match(/\$\s*([\d.]+)/);
  if (match) {
    const digits = match[1].replace(/\./g, '');
    const n = Number.parseInt(digits, 10);
    if (n > 0 && n < 50_000_000) return n;
  }
  const all = t.match(/(\d{1,3}(?:\.\d{3})+)/);
  if (all) {
    const n = Number.parseInt(all[1].replace(/\./g, ''), 10);
    if (n > 0 && n < 50_000_000) return n;
  }
  return null;
}

function pickRetailNetFromCandidates(...sources: string[]): number | null {
  for (const source of sources) {
    for (const match of source.matchAll(/\$[\d.]+(?:\s*CLP)?/g)) {
      const parsed = parseClpPrice(match[0]);
      if (parsed) return parsed;
    }
  }
  return null;
}

function sanitizeImportedProduct(p: ScrapedProduct): ScrapedProduct | null {
  const variants = p.variants.filter(
    (v) => v.retailNet > 0 && v.retailNet < 50_000_000,
  );
  if (variants.length === 0) return null;
  return { ...p, variants };
}

function slugifySku(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-');
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function collectProductLinks(page: Page, pageUrl: string, limit: number): Promise<string[]> {
  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch {
    console.warn(`⚠️ No se pudo abrir ${pageUrl}`);
    return [];
  }

  await page.waitForTimeout(2000);

  const hrefs = await page.$$eval('a[href]', (anchors) => {
    const out = new Set<string>();
    for (const a of anchors) {
      const href = (a as HTMLAnchorElement).href;
      if (!href || !href.includes('joyasbaron.cl')) continue;
      const path = href.split('?')[0];
      if (
        /\/(producto|product|p)\//i.test(path) ||
        /joyasbaron\.cl\/[^/]+-\d/i.test(path)
      ) {
        out.add(path);
      }
    }
    return [...out];
  });

  return hrefs.slice(0, limit);
}

async function collectSearchLinks(
  page: Page,
  query: string,
  limit: number,
): Promise<string[]> {
  const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
  return collectProductLinks(page, url, limit);
}

type ScrapedProduct = {
  name: string;
  brand: string;
  categoryName: string;
  description?: string;
  productType: 'PHYSICAL';
  imageFile?: string;
  variants: Array<{
    sku: string;
    retailNet: number;
    baseCost?: number;
    trackInventory: boolean;
    attributeValues?: Record<string, string>;
  }>;
};

async function scrapeProductPage(
  page: Page,
  productUrl: string,
  categoryName: string,
  delayMs: number,
): Promise<ScrapedProduct | null> {
  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch {
    console.warn(`⚠️ Ficha no accesible: ${productUrl}`);
    return null;
  }
  await page.waitForTimeout(delayMs);

  const data = await page.evaluate(() => {
    const title =
      document.querySelector('h1')?.textContent?.trim() ||
      document.querySelector('[class*="product-title"]')?.textContent?.trim() ||
      '';
    const bodyText = document.body.innerText;
    const html = document.documentElement.innerHTML;
    const skuMatch = bodyText.match(/\b([A-Z]?\d{1,3}-\d{1,5}(?:-[A-Z])?)\s*\|\s*Joyas Baron/i);
    const sku = skuMatch?.[1]?.trim() ?? '';
    const priceCandidates = Array.from(
      document.querySelectorAll(
        '.product-price, [class*="price"], [itemprop="price"], ins, .money',
      ),
    )
      .map((el) => el.textContent?.trim() ?? '')
      .filter(Boolean);
    const discountFmt = html.match(/"price_with_discount_formatted"\s*:\s*"([^"]+)"/)?.[1];
    const listFmt = html.match(/"price_formatted"\s*:\s*"([^"]+)"/)?.[1];
    const desc =
      document.querySelector('[class*="description"], #product-description, .product-description')
        ?.textContent?.trim() ?? '';
    const img =
      document.querySelector<HTMLImageElement>(
        '.product-image img, [class*="product"] img[src*="product"], img[itemprop="image"]',
      )?.src ?? '';
    return {
      title,
      sku,
      priceCandidates,
      bodyText,
      discountFmt,
      listFmt,
      desc,
      img,
    };
  });

  if (!data.title) {
    return null;
  }

  const retailNet = pickRetailNetFromCandidates(
    data.discountFmt ?? '',
    ...data.priceCandidates,
    data.bodyText,
    data.listFmt ?? '',
  );
  if (!retailNet || retailNet <= 0) {
    console.warn(`⚠️ Sin precio válido: ${data.title}`);
    return null;
  }

  const baronSku = data.sku || slugifySku(data.title).slice(0, 24);
  const sku = `JOYARTE-${baronSku}`;

  let imageFile: string | undefined;
  if (data.img && data.img.startsWith('http')) {
    try {
      const ext = data.img.includes('.png') ? '.png' : '.jpg';
      const fileName = `${slugifySku(baronSku)}${ext}`;
      imageFile = `products/${fileName}`;
      const target = path.join(__dirname, '..', 'assets', imageFile);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const res = await fetch(data.img);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(target, buf);
      } else {
        imageFile = undefined;
      }
    } catch {
      imageFile = undefined;
    }
  }

  const attributeValues: Record<string, string> = {};
  const nameLower = data.title.toLowerCase();
  if (nameLower.includes('oro blanco')) attributeValues.Tono = 'Blanco';
  else if (nameLower.includes('oro amarillo') || nameLower.includes('oro miel'))
    attributeValues.Tono = nameLower.includes('miel') ? 'Miel' : 'Amarillo';
  else if (nameLower.includes('oro rosado')) attributeValues.Tono = 'Rosado';
  if (nameLower.includes('plata')) attributeValues.Material = 'Plata 925';
  else if (nameLower.includes('platino')) attributeValues.Material = 'Platino 900';
  else if (nameLower.includes('oro 14')) attributeValues.Material = 'Oro 14kt';
  else if (nameLower.includes('oro')) attributeValues.Material = 'Oro 18kt';
  if (nameLower.includes('diamante')) attributeValues.Piedra = 'Diamante';
  else if (nameLower.includes('circon')) attributeValues.Piedra = 'Circonita';
  else if (nameLower.includes('perla')) attributeValues.Piedra = 'Perla';

  return {
    name: data.title,
    brand: 'Joyarte',
    categoryName,
    description: data.desc?.slice(0, 2000) || undefined,
    productType: 'PHYSICAL',
    imageFile,
    variants: [
      {
        sku,
        retailNet,
        baseCost: Math.round(retailNet * 0.45),
        trackInventory: true,
        attributeValues: Object.keys(attributeValues).length > 0 ? attributeValues : undefined,
      },
    ],
  };
}

async function tryMcpListProducts(): Promise<ScrapedProduct[] | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'list_products', arguments: { limit: 80 } },
        id: 1,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: { content?: Array<{ text?: string }> };
    };
    const text = json.result?.content?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as {
      products?: Array<{
        name: string;
        sku?: string;
        price?: number;
        categories?: string[];
        description?: string;
        images?: string[];
      }>;
    };
    if (!parsed.products?.length) return null;
    return parsed.products.map((p) => {
      const cat = p.categories?.[0] ?? 'Joyas de Oro';
      const baronSku = p.sku ?? slugifySku(p.name).slice(0, 20);
      return {
        name: p.name,
        brand: 'Joyarte',
        categoryName: cat,
        description: p.description,
        productType: 'PHYSICAL' as const,
        variants: [
          {
            sku: `JOYARTE-${baronSku}`,
            retailNet: Math.round(p.price ?? 0),
            baseCost: Math.round((p.price ?? 0) * 0.45),
            trackInventory: true,
          },
        ],
      };
    });
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const defaultLimit = Number(process.env.JOYARTE_IMPORT_LIMIT_PER_CATEGORY ?? '8');
  const delayMs = Number(process.env.JOYARTE_IMPORT_DELAY_MS ?? '400');

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(ASSETS_PRODUCTS_DIR, { recursive: true });

  console.log('🔍 Intentando MCP Jumpseller…');
  let products = await tryMcpListProducts();

  if (!products?.length) {
    console.log('🌐 MCP no disponible — scraping con Playwright…');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const seen = new Set<string>();
    products = [];

    console.log('🏠 Home…');
    const homeLinks = await collectProductLinks(page, BASE_URL, 15);
    for (const link of homeLinks) {
      if (seen.has(link)) continue;
      seen.add(link);
      const scraped = await scrapeProductPage(page, link, 'Joyas de Oro', delayMs);
      if (scraped) {
        products.push(scraped);
        console.log(`  ✓ ${scraped.name}`);
      }
      await sleep(delayMs);
    }

    for (const sq of SEARCH_QUERIES) {
      const limit = sq.limit || defaultLimit;
      console.log(`🔎 Búsqueda ${sq.categoryName} (${sq.query})…`);
      const links = await collectSearchLinks(page, sq.query, limit);
      for (const link of links) {
        if (seen.has(link)) continue;
        seen.add(link);
        const scraped = await scrapeProductPage(page, link, sq.categoryName, delayMs);
        if (scraped) {
          products.push(scraped);
          console.log(`  ✓ ${scraped.name}`);
        }
        await sleep(delayMs);
      }
    }

    if (products.length < 10) {
      for (const col of COLLECTION_PATHS) {
        const limit = col.limit || defaultLimit;
        console.log(`📂 Colección ${col.categoryName} (${col.path})…`);
        const links = await collectProductLinks(page, `${BASE_URL}${col.path}`, limit);
        for (const link of links) {
          if (seen.has(link)) continue;
          seen.add(link);
          const scraped = await scrapeProductPage(page, link, col.categoryName, delayMs);
          if (scraped) {
            products.push(scraped);
            console.log(`  ✓ ${scraped.name}`);
          }
          await sleep(delayMs);
        }
      }
    }
    await browser.close();
  }

  if (!products.length) {
    console.error('❌ No se importó ningún producto.');
    process.exit(1);
  }

  products = products
    .map(sanitizeImportedProduct)
    .filter((p): p is ScrapedProduct => p != null);

  const categories = [...new Set(products.map((p) => p.categoryName))];
  const brands = [...new Set(products.map((p) => p.brand))];

  const catalog = {
    meta: {
      source: BASE_URL,
      importedAt: new Date().toISOString(),
      productCount: products.length,
    },
    categories,
    brands,
    products,
  };

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(DATA_DIR, 'categories.json'),
    JSON.stringify({ categories, importedAt: catalog.meta.importedAt }, null, 2),
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'import-meta.json'),
    JSON.stringify(catalog.meta, null, 2),
  );

  console.log(`✅ Importados ${products.length} productos → ${CATALOG_PATH}`);
}

main().catch((err) => {
  console.error('❌ import-joyarte-from-baron:', err);
  process.exit(1);
});
