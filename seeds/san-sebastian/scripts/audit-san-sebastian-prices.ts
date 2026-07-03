#!/usr/bin/env ts-node
/**
 * Audita precios del catálogo San Sebastián (drift IVA legacy vs lógica corregida).
 * Uso: npm run seed:audit-ss-prices --prefix seeds
 *      npm run seed:audit-ss-prices --prefix seeds -- --strict
 */
import * as fs from 'fs';
import * as path from 'path';
import { loadSanSebastianCatalogJson } from '../seed-san-sebastian-catalog';
import {
  computeLegacyDriftGross,
  computeSeedPrices,
  isClosedRetailPrice,
  normalizeClosedRetailPrice,
} from '../san-sebastian-price.util';

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'san-sebastian-catalog.json');
const strict = process.argv.includes('--strict');
const fixCatalog = process.argv.includes('--fix-catalog');

function main(): void {
  const catalog = loadSanSebastianCatalogJson();
  let legacyDrift = 0;
  let nonClosedSource = 0;
  let normalizedAtSeed = 0;
  const legacyExamples: string[] = [];

  for (const p of catalog.products) {
    const legacyGross = computeLegacyDriftGross(p.saleGross, p.hasIva);
    const { grossPrice } = computeSeedPrices(p.saleGross, p.hasIva);

    if (p.hasIva && legacyGross !== p.saleGross) {
      legacyDrift += 1;
      if (legacyExamples.length < 5) {
        legacyExamples.push(
          `«${p.name}» ${p.saleGross} → ${legacyGross} (legacy) | corregido: ${grossPrice}`,
        );
      }
    }

    if (!isClosedRetailPrice(p.saleGross)) {
      nonClosedSource += 1;
    }

    if (normalizeClosedRetailPrice(p.saleGross) !== p.saleGross) {
      normalizedAtSeed += 1;
    }
  }

  console.log(`Productos: ${catalog.products.length}`);
  console.log(
    `Drift IVA legacy (bruto fuente ≠ bruto seed viejo): ${legacyDrift}`,
  );
  console.log(`Precios fuente no cerrados: ${nonClosedSource}`);
  console.log(`Normalizados al seed (util): ${normalizedAtSeed}`);
  console.log(`Con lógica corregida, grossPrice = saleGross normalizado (sin round-trip).`);

  if (legacyExamples.length > 0) {
    console.log('\nEjemplos drift legacy:');
    for (const line of legacyExamples) console.log(`  • ${line}`);
  }

  if (fixCatalog) {
    let changed = 0;
    for (const p of catalog.products) {
      const next = normalizeClosedRetailPrice(p.saleGross);
      if (next !== p.saleGross) {
        p.saleGross = next;
        changed += 1;
      }
    }
    catalog.meta = {
      ...catalog.meta,
      importedAt: new Date().toISOString(),
    };
    fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    console.log(`\n✅ Catálogo actualizado: ${changed} saleGross normalizados → ${CATALOG_PATH}`);
  }

  if (strict && legacyDrift > 0) {
    console.error(
      '\n--strict: aún hay drift con lógica legacy (esperado hasta re-seed). Re-seed para aplicar fix.',
    );
    process.exit(1);
  }

  console.log('\n✅ Auditoría OK — ejecute seed:san-sebastian para aplicar precios corregidos.');
}

main();
