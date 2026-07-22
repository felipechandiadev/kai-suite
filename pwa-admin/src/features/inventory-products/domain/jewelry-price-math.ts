export type JewelryPriceInput = {
  weightGrams: number;
  metalPricePerGram: number;
  mermaPercent: number;
  /** Margen de utilidad esperado sobre el precio neto de venta (0–99.99). */
  utilityPercent: number;
  stonesCost: number;
  laborCost: number;
  otherCosts: number;
};

function parseMoneyInput(raw: string): number {
  const normalized = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function parseJewelryPercent(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(100, Math.max(0, n));
}

/** Margen: máximo 99.99 para evitar división por cero. */
export function parseJewelryMarginPercent(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(99.99, Math.max(0, n));
}

function complementFactor(percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) {
    return 1;
  }
  if (percent >= 100) {
    return 0;
  }
  return 1 - percent / 100;
}

/** Costo total (metal con merma + fijos) antes del margen. */
export function computeJewelryTotalCost(input: JewelryPriceInput): number {
  const w = Math.max(0, input.weightGrams);
  const precioMetal = Math.max(0, input.metalPricePerGram);
  const mermaPct = parseJewelryPercent(String(input.mermaPercent)) / 100;

  const adjustedWeight = w * (1 + mermaPct);
  const baseCost = adjustedWeight * precioMetal;
  return (
    baseCost +
    Math.max(0, input.stonesCost) +
    Math.max(0, input.laborCost) +
    Math.max(0, input.otherCosts)
  );
}

/**
 * Neto con margen real sobre venta: `neto = costo / (1 − margen)`.
 * El máximo descuento autorizado no se aplica aquí.
 */
export function computeJewelryNetPrice(input: JewelryPriceInput): number {
  const totalCost = computeJewelryTotalCost(input);
  const marginPct = parseJewelryMarginPercent(String(input.utilityPercent));
  const denom = complementFactor(marginPct);
  if (denom <= 0) {
    return 0;
  }
  return Math.round(totalCost / denom);
}

export function parseJewelryMoneyField(raw: string): number {
  return Math.max(0, parseMoneyInput(raw));
}
