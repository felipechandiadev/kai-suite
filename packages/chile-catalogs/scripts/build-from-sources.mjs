#!/usr/bin/env node
/**
 * Regenera data/*.json desde sources/communes.tsv y (opcional) HTML SII.
 * Uso: node scripts/build-from-sources.mjs [--fetch-activities]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const sourcesDir = path.join(root, 'sources');

const REGION_NAMES = {
  '01': 'Arica y Parinacota / Tarapacá',
  '02': 'Antofagasta',
  '03': 'Atacama',
  '04': 'Coquimbo',
  '05': 'Valparaíso',
  '06': "O'Higgins",
  '07': 'Maule',
  '08': 'Biobío / Ñuble',
  '09': 'Araucanía',
  '10': 'Los Ríos / Los Lagos',
  '11': 'Aysén',
  '12': 'Magallanes',
  '13': 'Metropolitana (centro)',
  '14': 'Metropolitana (poniente / norte)',
  '15': 'Metropolitana (oriente)',
  '16': 'Metropolitana (sur)',
};

function buildCommunesAndRegions() {
  const tsv = fs.readFileSync(path.join(sourcesDir, 'communes.tsv'), 'utf8');
  const communes = [];
  const regionCodes = new Set();
  for (const line of tsv.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [communeCode, name, treasuryCode] = trimmed.split('\t');
    if (!communeCode || !name) continue;
    const regionCode = communeCode.slice(0, 2);
    regionCodes.add(regionCode);
    communes.push({
      communeCode: communeCode.padStart(5, '0'),
      name: name.trim(),
      treasuryCode: String(treasuryCode ?? '').padStart(3, '0'),
      regionCode,
    });
  }
  const regions = [...regionCodes]
    .sort()
    .map((code) => ({
      code,
      name: REGION_NAMES[code] ?? `Región ${code}`,
    }));
  fs.writeFileSync(
    path.join(dataDir, 'communes.json'),
    `${JSON.stringify(communes, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(dataDir, 'regions.json'),
    `${JSON.stringify(regions, null, 2)}\n`,
  );
  console.log(`communes: ${communes.length}, regions: ${regions.length}`);
}

function parseIva(raw) {
  const v = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (v === 'SI' || v === 'SÍ' || v === 'S') return true;
  if (v === 'NO' || v === 'N') return false;
  if (v === 'G') return null;
  return null;
}

function parseCategory(raw) {
  const v = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (v === '1') return 1;
  if (v === '2') return 2;
  if (v === 'G') return null;
  return null;
}

function parseActivitiesFromHtml(html) {
  const activities = [];
  const seen = new Set();
  // Filas de datos: código 6 dígitos + glosa + IVA + categoría (+ disponible)
  const rowRe =
    /<tr[^>]*>\s*<td[^>]*>\s*(\d{6})\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>\s*([^<]+)\s*<\/td>\s*<td[^>]*>\s*([^<]+)\s*<\/td>/gi;
  let m;
  while ((m = rowRe.exec(html))) {
    const code = m[1];
    if (seen.has(code)) continue;
    seen.add(code);
    const name = m[2]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name) continue;
    activities.push({
      code,
      name,
      ivaAffected: parseIva(m[3]),
      category: parseCategory(m[4]),
    });
  }
  return activities;
}

async function buildActivities({ fetchRemote }) {
  const htmlPath = path.join(sourcesDir, 'sii-economic-activities.html');
  let html;
  if (fetchRemote) {
    const url =
      'https://www.sii.cl/ayudas/ayudas_por_servicios/1956-codigos-1959.html';
    console.log(`Fetching ${url} ...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
    fs.writeFileSync(htmlPath, html);
  } else if (fs.existsSync(htmlPath)) {
    html = fs.readFileSync(htmlPath, 'utf8');
  } else {
    console.warn(
      'No sources/sii-economic-activities.html — run with --fetch-activities',
    );
    return;
  }
  const activities = parseActivitiesFromHtml(html);
  if (activities.length < 100) {
    throw new Error(
      `Parsed too few activities (${activities.length}); check HTML structure`,
    );
  }
  fs.writeFileSync(
    path.join(dataDir, 'economic-activities.json'),
    `${JSON.stringify(activities, null, 2)}\n`,
  );
  console.log(`economic-activities: ${activities.length}`);
}

const fetchActivities = process.argv.includes('--fetch-activities');
fs.mkdirSync(dataDir, { recursive: true });
buildCommunesAndRegions();
await buildActivities({ fetchRemote: fetchActivities });
