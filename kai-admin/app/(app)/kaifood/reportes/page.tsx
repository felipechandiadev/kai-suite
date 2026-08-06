import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listDiningRoomsForPage } from "@/features/kaifood-dining/dining-room.page-data";
import { KaifoodReportsWorkspace } from "@/features/kaifood-reports/ui/KaifoodReportsWorkspace";

export default async function KaifoodReportsPage() {
  const [branchRows, rooms] = await Promise.all([
    listBranchesForSettingsPage(),
    listDiningRoomsForPage(),
  ]);

  const branches = branchRows.map((b) => ({
    id: b.id,
    label: b.name,
  }));

  const diningRooms = rooms.map((r) => ({
    id: r.id,
    label: r.name,
    branchId: r.branchId,
  }));

  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
      data-test-id="kaifood-reports-page-root"
    >
      <KaifoodReportsWorkspace branches={branches} diningRooms={diningRooms} />
    </div>
  );
}
