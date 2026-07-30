import { revalidatePath } from "next/cache";
import { VARIANT_REVALIDATE_PATHS, variantDetailPath } from "./variant-routes";

export function revalidateVariantPaths(variantId?: string) {
  for (const path of VARIANT_REVALIDATE_PATHS) {
    revalidatePath(path);
  }
  revalidatePath("/variant", "layout");
  if (variantId?.trim()) {
    revalidatePath(variantDetailPath(variantId.trim()));
  }
}
