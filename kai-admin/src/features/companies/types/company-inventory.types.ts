export type NegativeStockPolicy = "ALLOW" | "WARN" | "BLOCK";

export type CompanyInventorySettings = {
  negativeStockPolicy: NegativeStockPolicy;
};

export function defaultCompanyInventorySettings(): CompanyInventorySettings {
  return { negativeStockPolicy: "BLOCK" };
}
