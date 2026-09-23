import { useMemo } from "react";
import { useSearchParams } from "@kai/ui";

/** Query de búsqueda sincronizada con CollectionPageLayout (`?search=`). */
export function useCollectionSearchQuery(paramName = "search"): string {
  const searchParams = useSearchParams();
  return useMemo(
    () => (searchParams.get(paramName) ?? "").trim().toLowerCase(),
    [searchParams, paramName],
  );
}
