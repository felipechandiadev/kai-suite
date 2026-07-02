"use server";

import { FiscalBoletaTestPreviewRequest } from "../infrastructure/fiscal-boleta-test-preview.request";

export async function getFiscalBoletaTestPreviewAction(caso?: string) {
  return FiscalBoletaTestPreviewRequest.getTestPreview(caso);
}
