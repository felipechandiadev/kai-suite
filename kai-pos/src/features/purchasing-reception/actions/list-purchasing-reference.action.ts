"use server";

import { PurchasingReferencePosRequest } from "../infrastructure/purchasing-reference-pos.request";

export async function listPurchasingReferencePosAction() {
  const [suppliers, storages, taxes, companyBankAccounts] = await Promise.all([
    PurchasingReferencePosRequest.listSuppliers(),
    PurchasingReferencePosRequest.listStorages(),
    PurchasingReferencePosRequest.listTaxes(),
    PurchasingReferencePosRequest.getCompanyBankAccounts(),
  ]);
  return { suppliers, storages, taxes, companyBankAccounts };
}
