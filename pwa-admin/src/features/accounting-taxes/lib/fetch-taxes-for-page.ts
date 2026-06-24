import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import { createDedupedAsyncFetch } from "@/shared/lib/dedupe-async-fetch";

export const fetchTaxesForPage = createDedupedAsyncFetch(listTaxesForPage);
