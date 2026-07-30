import { redirect } from "next/navigation";
import {
  SCAN_PATH,
  variantBarcodePath,
} from "@/features/variant/lib/variant-routes";

export const dynamic = "force-dynamic";

type LegacyVariantBarcodePageProps = {
  searchParams: Promise<{ variantId?: string }>;
};

export default async function LegacyVariantBarcodePage({
  searchParams,
}: LegacyVariantBarcodePageProps) {
  const { variantId } = await searchParams;
  const id = variantId?.trim();
  if (id) {
    redirect(variantBarcodePath(id));
  }
  redirect(SCAN_PATH);
}
