"use server";

import { CompaniesTipsRequest } from "../infrastructure/companies-tips.request";

export async function getCompanyTipSettingsForPosAction() {
  return CompaniesTipsRequest.getForActiveCompany();
}
