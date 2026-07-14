import { CourierDispatchPanel } from "@/features/courier/ui/CourierDispatchPanel";

export default async function DispatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CourierDispatchPanel dispatchId={id} />;
}
