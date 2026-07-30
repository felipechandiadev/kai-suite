import { getTodayIso, getWeekStart, addDaysIso } from "@kai/ui";
import {
  listDeliveryOccurrencesAction,
  listDeliveryZonesAction,
} from "@/features/e-shop-delivery/actions/delivery.action";
import { DeliveryCalendarPanel } from "../ui/DeliveryCalendarPanel";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ week?: string }>;
};

export default async function EShopFulfillmentCalendarPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const today = getTodayIso();
  const weekStart = getWeekStart(params.week?.trim() || today);
  const weekEnd = addDaysIso(weekStart, 6);

  const [occurrencesRes, zonesRes] = await Promise.all([
    listDeliveryOccurrencesAction(weekStart, weekEnd),
    listDeliveryZonesAction(),
  ]);

  return (
    <DeliveryCalendarPanel
      initialOccurrences={occurrencesRes.success ? occurrencesRes.rows : []}
      zones={zonesRes.success ? zonesRes.rows : []}
      initialWeekStart={weekStart}
    />
  );
}
