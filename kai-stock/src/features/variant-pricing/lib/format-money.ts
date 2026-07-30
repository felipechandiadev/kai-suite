export function formatMoney(amount: number, currency = "CLP"): string {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: currency || "CLP",
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  } catch {
    return `$${Math.round(amount).toLocaleString("es-CL")}`;
  }
}
