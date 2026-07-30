import type { useRouter } from "next/navigation";

type CatalogRouter = ReturnType<typeof useRouter>;

export function patchCatalogSearchParams(
  current: URLSearchParams,
  patch: Record<string, string | null | undefined>,
): URLSearchParams {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  return params;
}

export function replaceCatalogUrl(
  router: CatalogRouter,
  pathname: string,
  params: URLSearchParams,
): void {
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}
