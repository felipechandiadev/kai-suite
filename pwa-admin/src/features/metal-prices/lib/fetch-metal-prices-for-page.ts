import { listMetalPricesForPage } from "@/features/metal-prices/actions/metal-price.action";
import { createDedupedAsyncFetch } from "@/shared/lib/dedupe-async-fetch";

export const fetchMetalPricesForPage = createDedupedAsyncFetch(listMetalPricesForPage);
