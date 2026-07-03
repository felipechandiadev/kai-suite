/** Precios retail San Sebastián — bruto sami6 es canonical; neto solo para contabilidad. */

export const SAN_SEBASTIAN_IVA_RATE = 0.19;

export function toRetailNet(saleGross: number, hasIva: boolean): number {
  if (saleGross <= 0) return 0;
  if (!hasIva) return saleGross;
  return Math.round(saleGross / (1 + SAN_SEBASTIAN_IVA_RATE));
}

/** Precio etiqueta cerrado: múltiplo de 10, o terminación xxx990 (super CL). */
export function isClosedRetailPrice(gross: number): boolean {
  if (gross <= 0) return true;
  if (gross < 100) return gross % 10 === 0;
  return gross % 10 === 0 || gross % 1000 === 990;
}

/** Ajusta outliers del dump sami6 al patrón retail cerrado. */
export function normalizeClosedRetailPrice(gross: number): number {
  if (gross <= 0) return 0;
  if (isClosedRetailPrice(gross)) return gross;

  const floor10 = Math.floor(gross / 10) * 10;
  const ceil10 = Math.ceil(gross / 10) * 10;
  const snapped =
    gross - floor10 <= ceil10 - gross ? floor10 : ceil10;

  const block990 = Math.floor(gross / 1000) * 1000 + 990;
  if (gross >= 990 && Math.abs(gross - block990) <= 5) {
    return block990;
  }

  return snapped;
}

export function computeSeedPrices(saleGross: number, hasIva: boolean): {
  grossPrice: number;
  netPrice: number;
} {
  const grossPrice = normalizeClosedRetailPrice(saleGross);
  return {
    grossPrice,
    netPrice: toRetailNet(grossPrice, hasIva),
  };
}

/** Simula el bug histórico (net→gross) para auditoría. */
export function computeLegacyDriftGross(saleGross: number, hasIva: boolean): number {
  const net = toRetailNet(saleGross, hasIva);
  if (net <= 0) return 0;
  if (!hasIva) return net;
  return Math.round(net * (1 + SAN_SEBASTIAN_IVA_RATE));
}
