import { redirect } from "next/navigation";
import {
  SCAN_PATH,
  variantDetailPath,
} from "@/features/variant/lib/variant-routes";

export const dynamic = "force-dynamic";

type LegacyVariantPageProps = {
  searchParams: Promise<{ variantId?: string }>;
};

export default async function LegacyVariantPage({ searchParams }: LegacyVariantPageProps) {
  const { variantId } = await searchParams;
  const id = variantId?.trim();
  if (id) {
    redirect(variantDetailPath(id));
  }
  redirect(SCAN_PATH);
}
