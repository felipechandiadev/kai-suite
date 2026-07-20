import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEmployeeDetailAction } from "@/features/hr-employees/actions/employee.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import { LoadingState } from "@kai/ui/components/LoadingState";
import EmployeeDetailPage from "./ui/EmployeeDetailPage";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailRoutePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const id = employeeId?.trim();
  if (!id) notFound();

  const [detailRes, branches, laborUnitsRes] = await Promise.all([
    getEmployeeDetailAction(id),
    listBranchesForSettingsPage(),
    listLaborUnitsAction(),
  ]);

  if (!detailRes.success) {
    notFound();
  }

  const laborUnits = laborUnitsRes.success
    ? laborUnitsRes.data.map((u) => ({
        id: u.id,
        name: u.name,
        code: u.code,
      }))
    : [];

  return (
    <Suspense
      fallback={
        <LoadingState
          className="flex items-center justify-center py-16"
          data-test-id="employee-detail-page-skeleton"
        />
      }
    >
      <EmployeeDetailPage
        employeeId={id}
        initialDetail={detailRes.employee}
        branches={branches}
        laborUnits={laborUnits}
      />
    </Suspense>
  );
}
