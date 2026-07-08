import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";
import {
  DEFAULT_SALE_DTE_KIND,
  type EffectiveDocumentOption,
  type SaleDteKind,
} from "@/features/fiscal/types/sale-dte.types";
import { readCompanyCache } from "../application/company-cache.usecase";
import {
  getStoredFiscalPack,
  isFiscalPackExpired,
} from "../application/download-fiscal-pack.usecase";
import { companyDetailsFromFiscalPackEmisor } from "./company-from-fiscal-pack";

function offlinePaymentMethod(
  method: string,
  label: string,
  preloadOnPaymentScreen: boolean,
  displayOrder: number,
): EffectivePaymentMethod {
  return {
    companyPaymentMethodId: `offline:${method}`,
    method,
    label,
    requireReference: false,
    preloadOnPaymentScreen,
    preloadOrder: preloadOnPaymentScreen ? displayOrder : null,
    isDefaultForChange: method === "CASH",
    displayOrder,
  };
}

/** Medios compatibles con venta offline (sin pasarela ni crédito interno). */
export const OFFLINE_EFFECTIVE_PAYMENT_METHODS: EffectivePaymentMethod[] = [
  offlinePaymentMethod("CASH", "Efectivo", true, 0),
  offlinePaymentMethod("DEBIT_CARD", "Débito", false, 1),
  offlinePaymentMethod("CREDIT_CARD", "Crédito", false, 2),
];

export async function resolveOfflineSaleDteOptions(pointOfSaleId: string): Promise<{
  options: EffectiveDocumentOption[];
  defaultKind: SaleDteKind;
}> {
  const options: EffectiveDocumentOption[] = [{ kind: "TICKET", enabled: true }];
  const pack = await getStoredFiscalPack(pointOfSaleId);
  if (pack && !isFiscalPackExpired(pack)) {
    options.push({ kind: "BOLETA", enabled: true });
  }
  return { options, defaultKind: DEFAULT_SALE_DTE_KIND };
}

export async function resolveOfflineCompanyDetails(
  pointOfSaleId: string,
): Promise<CompanyDetails | null> {
  const pack = await getStoredFiscalPack(pointOfSaleId);
  if (pack?.emisor) {
    return companyDetailsFromFiscalPackEmisor(pack.emisor);
  }
  const cached = await readCompanyCache();
  if (!cached) return null;
  return {
    id: null,
    razonSocial: cached.legalName?.trim() || cached.tradeName?.trim() || "Empresa",
    nombreFantasia: cached.tradeName ?? null,
    rut: null,
    businessActivity: null,
    address: null,
    bankAccounts: [],
  };
}
