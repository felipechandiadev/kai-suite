"use server";

import { PublicCompaniesRequest } from "../infrastructure/public-companies.request";

export async function getPublicCompaniesAction() {
  return PublicCompaniesRequest.list();
}
