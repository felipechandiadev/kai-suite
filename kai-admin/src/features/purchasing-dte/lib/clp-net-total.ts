export type ClpNetTotalPack = {
  net: number;
  taxAmount: number;
  total: number;
};

export function amountsWhenNetEdited(net: number, ivaRatePercent: number): ClpNetTotalPack {
  const n = Math.max(0, Math.round(Number(net) || 0));
  const taxAmount = Math.round((n * ivaRatePercent) / 100);
  const total = n + taxAmount;
  return { net: n, taxAmount, total };
}

export function amountsWhenTotalEdited(totalGross: number, ivaRatePercent: number): ClpNetTotalPack {
  const g = Math.max(0, Math.round(Number(totalGross) || 0));
  const net = Math.round(g / (1 + ivaRatePercent / 100));
  const taxAmount = g - net;
  return { net, taxAmount, total: g };
}
