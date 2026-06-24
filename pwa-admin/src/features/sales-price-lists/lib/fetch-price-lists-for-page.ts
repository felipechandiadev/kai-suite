import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { createDedupedAsyncFetch } from "@/shared/lib/dedupe-async-fetch";

export const fetchPriceListsForPage = createDedupedAsyncFetch(listPriceListsForPage);
