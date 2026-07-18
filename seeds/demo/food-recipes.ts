/**
 * Recetas PRODUCTION demo: output SKU → líneas (input SKU + qty por unidad de salida).
 * SKUs de insumos deben existir en `SEED_DEV_PRODUCTS`.
 */
export type SeedRecipeLineDef = {
  inputSku: string;
  qtyPerOutputUnit: number;
  wasteFactor?: number;
};

export type SeedRecipeDef = {
  outputSku: string;
  lines: readonly SeedRecipeLineDef[];
};

/** Insumos compartidos (SKUs INSUMO del seed). */
const HARINA = 'SEEDDEVHAR5';
const ACEITE = 'SEEDDEVACE500';
const AZUCAR = 'SEEDDEVINSAZU';
const MANTEQUILLA = 'SEEDDEVINSMANT';
const HUEVO = 'SEEDDEVINSHUEVO';
const CHOCO = 'SEEDDEVINSCHOCO';
const LIMON = 'SEEDDEVINSLIMON';
const LEVADURA = 'SEEDDEVINSLEV';
const PAN_HAMB = 'SEEDDEVINSPANHAMB';
const CARNE = 'SEEDDEVINSCARNE';
const PAPA = 'SEEDDEVINSPAPA';
const PAN_HOT = 'SEEDDEVINSPANHOT';
const SALCHI = 'SEEDDEVINSSALCHI';
const QUESO = 'SEEDDEVINSQUESO';

function tortaLines(chocolate: boolean, size: 'ind' | 'med' | 'fam'): SeedRecipeLineDef[] {
  const scale = size === 'ind' ? 1 : size === 'med' ? 2.2 : 3.5;
  return [
    { inputSku: HARINA, qtyPerOutputUnit: Number((0.25 * scale).toFixed(4)) },
    { inputSku: AZUCAR, qtyPerOutputUnit: Number((0.15 * scale).toFixed(4)) },
    { inputSku: HUEVO, qtyPerOutputUnit: Math.round(2 * scale) },
    { inputSku: MANTEQUILLA, qtyPerOutputUnit: Number((0.08 * scale).toFixed(4)) },
    ...(chocolate
      ? [{ inputSku: CHOCO, qtyPerOutputUnit: Number((0.1 * scale).toFixed(4)) }]
      : []),
  ];
}

function hambLines(doble: boolean): SeedRecipeLineDef[] {
  return [
    { inputSku: PAN_HAMB, qtyPerOutputUnit: 1 },
    { inputSku: CARNE, qtyPerOutputUnit: doble ? 0.24 : 0.12 },
    { inputSku: QUESO, qtyPerOutputUnit: doble ? 2 : 1 },
  ];
}

function papasLines(size: 'chi' | 'med' | 'gra'): SeedRecipeLineDef[] {
  const kg = size === 'chi' ? 0.15 : size === 'med' ? 0.22 : 0.3;
  return [
    { inputSku: PAPA, qtyPerOutputUnit: kg },
    { inputSku: ACEITE, qtyPerOutputUnit: size === 'chi' ? 30 : size === 'med' ? 45 : 60 },
  ];
}

export const SEED_DEV_PRODUCTION_RECIPES: readonly SeedRecipeDef[] = [
  // ELABORADO — tortas
  { outputSku: 'SEEDDEVELABTORCHOIND', lines: tortaLines(true, 'ind') },
  { outputSku: 'SEEDDEVELABTORCHOMED', lines: tortaLines(true, 'med') },
  { outputSku: 'SEEDDEVELABTORCHOFAM', lines: tortaLines(true, 'fam') },
  { outputSku: 'SEEDDEVELABTORVAIIND', lines: tortaLines(false, 'ind') },
  { outputSku: 'SEEDDEVELABTORVAIMED', lines: tortaLines(false, 'med') },
  { outputSku: 'SEEDDEVELABTORVAIFAM', lines: tortaLines(false, 'fam') },
  // ELABORADO — medialunas
  {
    outputSku: 'SEEDDEVELABMEDMAN',
    lines: [
      { inputSku: HARINA, qtyPerOutputUnit: 0.08 },
      { inputSku: MANTEQUILLA, qtyPerOutputUnit: 0.04 },
      { inputSku: AZUCAR, qtyPerOutputUnit: 0.01 },
    ],
  },
  {
    outputSku: 'SEEDDEVELABMEDJAM',
    lines: [
      { inputSku: HARINA, qtyPerOutputUnit: 0.08 },
      { inputSku: MANTEQUILLA, qtyPerOutputUnit: 0.03 },
      { inputSku: QUESO, qtyPerOutputUnit: 1 },
    ],
  },
  // ELABORADO — pie
  {
    outputSku: 'SEEDDEVELABPIEIND',
    lines: [
      { inputSku: HARINA, qtyPerOutputUnit: 0.06 },
      { inputSku: AZUCAR, qtyPerOutputUnit: 0.04 },
      { inputSku: HUEVO, qtyPerOutputUnit: 1 },
      { inputSku: LIMON, qtyPerOutputUnit: 1 },
    ],
  },
  {
    outputSku: 'SEEDDEVELABPIEFAM',
    lines: [
      { inputSku: HARINA, qtyPerOutputUnit: 0.28 },
      { inputSku: AZUCAR, qtyPerOutputUnit: 0.18 },
      { inputSku: HUEVO, qtyPerOutputUnit: 4 },
      { inputSku: LIMON, qtyPerOutputUnit: 4 },
    ],
  },
  // ELABORADO — brownie
  {
    outputSku: 'SEEDDEVELABBROCLA',
    lines: [
      { inputSku: HARINA, qtyPerOutputUnit: 0.05 },
      { inputSku: CHOCO, qtyPerOutputUnit: 0.04 },
      { inputSku: HUEVO, qtyPerOutputUnit: 1 },
      { inputSku: MANTEQUILLA, qtyPerOutputUnit: 0.03 },
    ],
  },
  {
    outputSku: 'SEEDDEVELABBRONUE',
    lines: [
      { inputSku: HARINA, qtyPerOutputUnit: 0.05 },
      { inputSku: CHOCO, qtyPerOutputUnit: 0.045 },
      { inputSku: HUEVO, qtyPerOutputUnit: 1 },
      { inputSku: MANTEQUILLA, qtyPerOutputUnit: 0.03 },
    ],
  },
  // ELABORADO — empanadas
  {
    outputSku: 'SEEDDEVELABEMPPIN',
    lines: [
      { inputSku: HARINA, qtyPerOutputUnit: 0.1 },
      { inputSku: ACEITE, qtyPerOutputUnit: 15 },
      { inputSku: CARNE, qtyPerOutputUnit: 0.08 },
    ],
  },
  {
    outputSku: 'SEEDDEVELABEMPQUE',
    lines: [
      { inputSku: HARINA, qtyPerOutputUnit: 0.1 },
      { inputSku: ACEITE, qtyPerOutputUnit: 15 },
      { inputSku: QUESO, qtyPerOutputUnit: 2 },
    ],
  },
  // ELABORADO — pan
  {
    outputSku: 'SEEDDEVELABPANMAD',
    lines: [
      { inputSku: HARINA, qtyPerOutputUnit: 0.5 },
      { inputSku: LEVADURA, qtyPerOutputUnit: 8 },
      { inputSku: ACEITE, qtyPerOutputUnit: 20 },
    ],
  },
  {
    outputSku: 'SEEDDEVELABPANINT',
    lines: [
      { inputSku: HARINA, qtyPerOutputUnit: 0.5 },
      { inputSku: LEVADURA, qtyPerOutputUnit: 8 },
      { inputSku: ACEITE, qtyPerOutputUnit: 15 },
    ],
  },
  // PREPARADO — hamburguesas
  { outputSku: 'SEEDDEVPREPHAMBSI', lines: hambLines(false) },
  { outputSku: 'SEEDDEVPREPHAMBDO', lines: hambLines(true) },
  // PREPARADO — papas
  { outputSku: 'SEEDDEVPREPPAPCHI', lines: papasLines('chi') },
  { outputSku: 'SEEDDEVPREPPAPMED', lines: papasLines('med') },
  { outputSku: 'SEEDDEVPREPPAPGRA', lines: papasLines('gra') },
  // PREPARADO — completo
  {
    outputSku: 'SEEDDEVPREPCOMITA',
    lines: [
      { inputSku: PAN_HOT, qtyPerOutputUnit: 1 },
      { inputSku: SALCHI, qtyPerOutputUnit: 1 },
    ],
  },
  // PREPARADO — combo (insumos; bebida se vende aparte como PHYSICAL)
  {
    outputSku: 'SEEDDEVPREPCOMREG',
    lines: [
      ...hambLines(false),
      ...papasLines('med'),
    ],
  },
  {
    outputSku: 'SEEDDEVPREPCOMXL',
    lines: [
      ...hambLines(true),
      ...papasLines('gra'),
    ],
  },
];

export type SeedProductionUnitDef = {
  code: string;
  name: string;
  scope: 'BRANCH' | 'COMPANY';
  branchKey: 'main' | 'mall' | null;
  inventoryMode: 'AUTONOMOUS' | 'DEPENDENT';
  purpose: 'KITCHEN' | 'BATCH';
};

export const SEED_DEV_PRODUCTION_UNITS: readonly SeedProductionUnitDef[] = [
  {
    code: 'COCINA',
    name: 'Cocina',
    scope: 'BRANCH',
    /** Casa matriz */
    branchKey: 'main',
    inventoryMode: 'DEPENDENT',
    purpose: 'KITCHEN',
  },
  {
    code: 'BARRA',
    name: 'Barra',
    scope: 'BRANCH',
    branchKey: 'main',
    inventoryMode: 'DEPENDENT',
    purpose: 'KITCHEN',
  },
  {
    code: 'COCINA',
    name: 'Cocina',
    scope: 'BRANCH',
    /** Local Mall */
    branchKey: 'mall',
    inventoryMode: 'DEPENDENT',
    purpose: 'KITCHEN',
  },
  {
    code: 'PASTELERIA',
    name: 'Pastelería central',
    scope: 'COMPANY',
    branchKey: null,
    inventoryMode: 'AUTONOMOUS',
    purpose: 'BATCH',
  },
];
