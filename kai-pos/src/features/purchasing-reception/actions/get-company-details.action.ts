"use server";

import { PurchasingReferencePosRequest } from "../infrastructure/purchasing-reference-pos.request";
import type { CompanyDetails } from "../types/company.types";

export async function getCompanyDetailsPosAction(): Promise<CompanyDetails | null> {
  return PurchasingReferencePosRequest.getCompanyDetails();
}
