import Link from "next/link";
import { notFound } from "next/navigation";
import { getDiningRoomForPage } from "@/features/kaifood-dining/dining-room.page-data";
import { DiningRoomFloorPlanEditor } from "./ui/DiningRoomFloorPlanEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const room = await getDiningRoomForPage(id);
  if (!room) notFound();

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/kaifood/rooms" className="text-sm text-muted-foreground hover:underline">
          ← Salones
        </Link>
        <h1 className="text-xl font-semibold">{room.name}</h1>
      </div>
      <DiningRoomFloorPlanEditor room={room} />
    </div>
  );
}
