"use server";

import { CompanyRequest } from "../infrastructure/company.request";

export async function getCompanyDetailsAction() {
  return CompanyRequest.getDetails();
}

