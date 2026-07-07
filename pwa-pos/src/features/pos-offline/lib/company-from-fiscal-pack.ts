import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { OfflineFiscalPackEmisor } from "../domain/offline-fiscal-pack.types";

export function companyDetailsFromFiscalPackEmisor(
  emisor: OfflineFiscalPackEmisor,
): CompanyDetails {
  return {
    id: null,
    razonSocial: emisor.legalName?.trim() || "Empresa",
    nombreFantasia: null,
    rut: emisor.rut ?? null,
    businessActivity: emisor.businessActivity ?? null,
    address: emisor.address ?? null,
    bankAccounts: [],
  };
}
