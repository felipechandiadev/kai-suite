#!/usr/bin/env node
/**
 * Placeholders SVG estilizados hasta tener capturas reales.
 * Reemplazar: public/screenshots/{id}.webp o .png
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/store/screenshots');

const APPS = [
  { id: 'admin', label: 'Admin', accent: '#0a7cad', panels: ['Catálogo', 'Compras', 'Tesorería'] },
  { id: 'pos', label: 'POS', accent: '#04c9e6', panels: ['Carrito', 'Cobro', 'Caja'] },
  { id: 'stock', label: 'StockControl', accent: '#65F3FF', panels: ['SKU', 'Conteo', 'Movim.'] },
  { id: 'eshop', label: 'eShop', accent: '#18B3D6', panels: ['Catálogo', 'Carrito', 'Pedido'] },
  { id: 'printers', label: 'Kai Printers', accent: '#04c9e6', panels: ['Cola', 'ESC/POS', 'Local'] },
  { id: 'screen', label: 'Kai Screen', accent: '#0a7cad', panels: ['Total', 'Cliente', 'Brand'] },
];

function stockMobileSvg({ label, accent, panels }) {
  const tabs = panels
    .map((name, i) => {
      const x = 312 + i * 60;
      const active = i === 0;
      const fill = active ? 'rgba(101,243,255,0.18)' : 'rgba(255,255,255,0.04)';
      const stroke = active ? '#65F3FF' : 'rgba(255,255,255,0.1)';
      const textFill = active ? '#e5e7eb' : '#9ca3af';
      const w = name.length > 5 ? 56 : 52;
      return `<rect x="${x}" y="188" width="${w}" height="22" rx="8" fill="${fill}" stroke="${stroke}" stroke-opacity="${active ? 0.5 : 1}"/>
      <text x="${x + w / 2}" y="203" text-anchor="middle" fill="${textFill}" font-size="9" ${active ? 'font-weight="600"' : ''} font-family="Inter, system-ui, sans-serif">${name}</text>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Kai ${label} — inventario móvil">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#030810"/>
      <stop offset="100%" stop-color="#071428"/>
    </linearGradient>
    <linearGradient id="phone-shell" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a2a2e"/>
      <stop offset="45%" stop-color="#111114"/>
      <stop offset="100%" stop-color="#050507"/>
    </linearGradient>
    <linearGradient id="screen-glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d1824"/>
      <stop offset="100%" stop-color="#071018"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.08"/>
    </linearGradient>
    <filter id="phone-shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <ellipse cx="400" cy="252" rx="148" ry="210" fill="${accent}" opacity="0.07"/>
  <g filter="url(#phone-shadow)">
    <rect x="286" y="28" width="228" height="444" rx="38" fill="url(#phone-shell)" stroke="#3f3f46" stroke-width="1.5"/>
    <rect x="278" y="120" width="4" height="44" rx="2" fill="#27272a"/>
    <rect x="278" y="176" width="4" height="64" rx="2" fill="#27272a"/>
    <rect x="518" y="148" width="4" height="72" rx="2" fill="#27272a"/>
    <rect x="298" y="44" width="204" height="412" rx="28" fill="#000"/>
    <rect x="298" y="44" width="204" height="412" rx="28" fill="url(#screen-glow)"/>
    <rect x="362" y="56" width="76" height="18" rx="9" fill="#000"/>
    <text x="316" y="88" fill="#9ca3af" font-size="9" font-family="Inter, system-ui, sans-serif" font-weight="600">9:41</text>
    <text x="486" y="88" text-anchor="end" fill="#9ca3af" font-size="9" font-family="Inter, system-ui, sans-serif">5G</text>
    <text x="400" y="118" text-anchor="middle" fill="#f5f5f7" font-size="15" font-weight="700" font-family="Inter, system-ui, sans-serif">${label}</text>
    <text x="400" y="134" text-anchor="middle" fill="${accent}" font-size="9.5" font-weight="600" font-family="Inter, system-ui, sans-serif" letter-spacing="0.12em">INVENTARIO MÓVIL</text>
    <rect x="312" y="148" width="176" height="30" rx="10" fill="rgba(255,255,255,0.06)" stroke="${accent}" stroke-opacity="0.25"/>
    <circle cx="328" cy="163" r="5" fill="none" stroke="${accent}" stroke-width="1.5"/>
    <line x1="332" y1="167" x2="336" y2="171" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"/>
    <text x="346" y="167" fill="#6b7280" font-size="10" font-family="Inter, system-ui, sans-serif">Buscar SKU…</text>
    ${tabs}
    <rect x="312" y="224" width="176" height="54" rx="12" fill="url(#accent)" stroke="${accent}" stroke-opacity="0.35"/>
    <text x="400" y="478" text-anchor="middle" fill="#6b7280" font-size="12" font-family="Inter, system-ui, sans-serif">Kai ${label} — solo móvil</text>
    <rect x="368" y="438" width="64" height="4" rx="2" fill="rgba(255,255,255,0.35)"/>
  </g>
</svg>`;
}

function svg({ id, label, accent, panels }) {
  const panelMarkup = panels
    .map((name, i) => {
      const x = 24 + i * 118;
      return `<rect x="${x}" y="18" width="104" height="28" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
      <text x="${x + 52}" y="37" text-anchor="middle" fill="#d1d5db" font-size="11" font-family="Inter, sans-serif">${name}</text>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Placeholder ${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#030810"/>
      <stop offset="100%" stop-color="#071428"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <rect x="0" y="0" width="800" height="64" fill="rgba(0,0,0,0.35)"/>
  <circle cx="24" cy="32" r="6" fill="#ff5f57"/>
  <circle cx="44" cy="32" r="6" fill="#febc2e"/>
  <circle cx="64" cy="32" r="6" fill="#28c840"/>
  <text x="400" y="38" text-anchor="middle" fill="#f5f5f7" font-size="14" font-weight="600" font-family="Inter, sans-serif">${label}</text>
  ${panelMarkup}
  <rect x="24" y="64" width="200" height="412" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>
  <rect x="40" y="88" width="120" height="10" rx="5" fill="rgba(255,255,255,0.12)"/>
  <rect x="40" y="110" width="168" height="8" rx="4" fill="rgba(255,255,255,0.06)"/>
  <rect x="240" y="64" width="536" height="412" rx="12" fill="url(#accent)" stroke="${accent}" stroke-opacity="0.35"/>
  <rect x="268" y="96" width="220" height="14" rx="7" fill="rgba(255,255,255,0.14)"/>
  <rect x="268" y="128" width="480" height="120" rx="12" fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.08)"/>
  <text x="400" y="470" text-anchor="middle" fill="#6b7280" font-size="12" font-family="Inter, sans-serif">Placeholder Kai — ${id}</text>
</svg>`;
}

mkdirSync(outDir, { recursive: true });

for (const app of APPS) {
  const file = join(outDir, `${app.id}.svg`);
  writeFileSync(
    file,
    app.id === 'stock' ? stockMobileSvg({ label: app.label, accent: app.accent, panels: app.panels }) : svg({ id: app.id, ...app }),
  );
  console.log(`wrote ${file}`);
}
