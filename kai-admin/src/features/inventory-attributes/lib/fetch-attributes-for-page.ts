import { listAttributesForPage } from "@/features/inventory-attributes/actions/attribute.action";
import { createDedupedAsyncFetch } from "@/shared/lib/dedupe-async-fetch";

export const fetchAttributesForPage = createDedupedAsyncFetch(listAttributesForPage);
