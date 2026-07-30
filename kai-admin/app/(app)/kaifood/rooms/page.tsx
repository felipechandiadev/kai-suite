import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listDiningRoomsForPage } from "@/features/kaifood-dining/dining-room.page-data";
import { DiningRoomsCollection } from "./ui/DiningRoomsCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [rooms, branches] = await Promise.all([
    listDiningRoomsForPage(),
    listBranchesForSettingsPage(),
  ]);

  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <DiningRoomsCollection initialRooms={rooms} branches={branches} />
    </Suspense>
  );
}
