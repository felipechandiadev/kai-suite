"use server";

import { lookupPersonByDocumentRequest } from "../infrastructure/person-document.request";
import type { PersonDocumentLookupResult } from "../types/person-document-lookup.types";

export async function lookupPersonByDocumentAction(params: {
  documentNumber: string;
  documentType?: string;
  excludePersonId?: string;
}): Promise<PersonDocumentLookupResult> {
  return lookupPersonByDocumentRequest(params);
}
