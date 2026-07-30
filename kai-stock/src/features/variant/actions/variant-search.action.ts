"use server";

import { VariantSearchRequest } from "../infrastructure/variant-search.request";
import type { VariantSearchResult } from "../types/variant-search.types";

export async function searchVariantsAction(input: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<VariantSearchResult> {
  return VariantSearchRequest.search(input);
}
