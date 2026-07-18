import { notFound } from "next/navigation";
import { getDiningRoomForPage } from "@/features/kaifood-dining/dining-room.page-data";
import { DiningRoomFloorPlanEditor } from "./ui/DiningRoomFloorPlanEditor";

export const dynamic = "force-dynamic";

const ROOM_VIEWPORT_CLASS =
  "h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] max-h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] min-h-0";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const room = await getDiningRoomForPage(id);
  if (!room) notFound();

  return (
    <div
      className={`flex w-full flex-col px-4 md:px-6 ${ROOM_VIEWPORT_CLASS}`}
      data-test-id="kaifood-room-detail-page"
    >
      <DiningRoomFloorPlanEditor room={room} />
    </div>
  );
}
