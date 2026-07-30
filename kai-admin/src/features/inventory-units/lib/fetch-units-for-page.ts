import { listUnitsForPage } from "@/features/inventory-units/actions/unit.action";
import { createDedupedAsyncFetch } from "@/shared/lib/dedupe-async-fetch";

export const fetchUnitsForPage = createDedupedAsyncFetch(listUnitsForPage);
