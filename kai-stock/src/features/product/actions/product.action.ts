"use server";

import { redirect } from "next/navigation";
import { redirectToLoginServer } from "@/lib/auth/redirect-to-login";
import { revalidateVariantPaths } from "@/features/variant/lib/revalidate-variant-paths";
import { variantDetailPath } from "@/features/variant/lib/variant-routes";
import { createQuickProductUseCase } from "../application/create-quick-product.usecase";
import type { QuickCreateProductInput } from "../domain/quick-create-product.entity";

export async function createQuickProductAction(
  input: QuickCreateProductInput,
): Promise<{ success: false; error: string; unauthorized?: boolean }> {
  const r = await createQuickProductUseCase(input);
  if (!r.ok) {
    if (r.unauthorized) {
      redirectToLoginServer();
    }
    return { success: false, error: r.error };
  }
  revalidateVariantPaths(r.variantId);
  redirect(variantDetailPath(r.variantId));
}
