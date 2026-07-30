import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Legacy → /production/orders/:id */
export default async function LegacyInventoryProductionOrderDetailPage({
  params,
}: Props) {
  const { id } = await params;
  redirect(`/production/orders/${id}`);
}
